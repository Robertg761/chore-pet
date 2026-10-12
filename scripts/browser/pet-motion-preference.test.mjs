import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

const key = 'chore-pet-reduce-motion'
function recordFrames() {
  const request = requestAnimationFrame, cancel = cancelAnimationFrame
  window.__deviceMotion = { pending: new Set(), delivered: 0 }
  window.requestAnimationFrame = callback => {
    const id = request(now => { window.__deviceMotion.pending.delete(id); window.__deviceMotion.delivered++; callback(now) })
    window.__deviceMotion.pending.add(id); return id
  }
  window.cancelAnimationFrame = id => { window.__deviceMotion.pending.delete(id); cancel(id) }
}
async function instrument(page) {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => { Math.random = () => .99 })
  await page.addInitScript(recordFrames)
  await page.reload()
  await page.locator('.room-pet').waitFor()
}
const read = page => page.evaluate(() => ({ pending: window.__deviceMotion.pending.size, delivered: window.__deviceMotion.delivered }))
async function settleView(page) {
  // Page transitions use the browser's own animation clock. Keep them enabled,
  // waiting for their existing marker rather than counting them as pet frames.
  for (let i = 0; i < 30; i++) {
    if (await page.evaluate(() => !document.documentElement.dataset.vt)) return
    await page.waitForTimeout(20)
  }
  assert.fail('the existing view transition must finish before sampling pet policy')
}
async function settings(page) {
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
  await settleView(page)
  return page.getByRole('checkbox', { name: 'Reduce pet motion', exact: true })
}
async function home(page) {
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.locator('.room-pet').waitFor()
  await settleView(page)
  await page.clock.runFor(64)
  assert.equal(await page.evaluate(() => document.hidden), false)
  const visible = await page.locator('.room-pet [data-character-body]').evaluate(node => {
    const box = node.getBoundingClientRect()
    let left = 0, top = 0, right = innerWidth, bottom = innerHeight
    for (let p = node.parentElement; p; p = p.parentElement) {
      const style = getComputedStyle(p), clip = p.getBoundingClientRect()
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, clip.left + p.clientLeft); right = Math.min(right, clip.left + p.clientLeft + p.clientWidth) }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, clip.top + p.clientTop); bottom = Math.min(bottom, clip.top + p.clientTop + p.clientHeight) }
    }
    return Math.max(0, Math.min(right, box.right) - Math.max(left, box.left)) * Math.max(0, Math.min(bottom, box.bottom) - Math.max(top, box.top)) / (box.width * box.height)
  })
  assert.ok(visible >= .95, 'a visible resident must prove the policy, rather than an offscreen pause')
}
async function capture(page, name) {
  if (!process.env.CHORE_MOTION_PREFERENCE_CAPTURE_DIR) return
  await mkdir(process.env.CHORE_MOTION_PREFERENCE_CAPTURE_DIR, { recursive: true })
  await page.screenshot({ path: join(process.env.CHORE_MOTION_PREFERENCE_CAPTURE_DIR, name), fullPage: false })
}
async function pending(page, expected) {
  for (let i = 0; i < 20; i++) {
    if ((await read(page)).pending === expected) return
    await page.waitForTimeout(20)
  }
  assert.equal((await read(page)).pending, expected)
}

for (const width of [320, 1280]) test(`device motion choice persists and keeps finite reactions still at${width}px`, async t => {
  const page = await browserApp(t, { viewport: { width, height: width === 320 ? 640 : 800 }, reducedMotion: 'no-preference' })
  await instrument(page)
  assert.equal((await read(page)).pending, 1)
  const saved = (await snapshot(page)).tables
  const choice = await settings(page)
  assert.equal(await choice.count(), 1)
  assert.equal(await choice.isChecked(), false)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null)
  await choice.focus(); await page.keyboard.press('Space')
  assert.equal(await choice.isChecked(), true)
  assert.equal(await choice.evaluate(node => node === document.activeElement && node.matches(':focus-visible')), true)
  const label = await choice.locator('..').boundingBox()
  assert.ok(label.width >= 44 && label.height >= 44)
  assert.match(await choice.evaluate(node => document.getElementById(node.getAttribute('aria-describedby')).textContent), /on this device.*system's reduced-motion setting is always respected/)
  await capture(page, `motion-preference-settings-${width}.png`)
  await home(page)
  assert.equal((await read(page)).pending, 0)
  const stopped = await read(page)
  await page.clock.runFor(2000)
  assert.deepEqual(await read(page), stopped, 'settled device-reduced art requests and delivers no idle frames')
  const resident = page.locator('.room-pet')
  await resident.focus(); await page.keyboard.press('Enter')
  assert.equal((await read(page)).pending, 1)
  await page.clock.runFor(128)
  const still = await resident.locator('[data-character-body]').innerHTML()
  await page.clock.runFor(672)
  assert.equal(await resident.locator('[data-character-body]').innerHTML(), still)
  await page.clock.runFor(1000)
  assert.equal((await read(page)).pending, 0)
  assert.ok((await page.locator('.living-room [aria-live="polite"]').textContent()).trim())
  await capture(page, `motion-preference-home-${width}.png`)
  await page.reload(); await page.locator('.room-pet').waitFor(); await page.clock.runFor(64)
  assert.equal((await read(page)).pending, 0)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), 'on')
  const restored = await settings(page)
  assert.equal(await restored.isChecked(), true)
  await restored.focus(); await page.keyboard.press('Space')
  assert.equal(await restored.isChecked(), false)
  await home(page)
  assert.equal((await read(page)).pending, 1)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic(`Chromium ${page.context().browser().version()}; native keyboard44px choice; reload; visible resident0idle/1finite/0deadline; still markup; restored normal1; unchanged saved tables.`)
})

test('device off cannot override system reduction, and live system changes retain the existing clock', async t => {
  const page = await browserApp(t, { reducedMotion: 'reduce' })
  await instrument(page)
  const saved = (await snapshot(page)).tables, choice = await settings(page)
  assert.equal(await choice.isChecked(), false)
  await choice.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Space')
  assert.equal(await choice.isChecked(), false)
  await home(page)
  assert.equal((await read(page)).pending, 0)
  await changeReducedMotion(page, 'no-preference'); await page.clock.runFor(64)
  assert.equal((await read(page)).pending, 1)
  await changeReducedMotion(page, 'reduce'); await page.clock.runFor(160)
  assert.equal((await read(page)).pending, 0)
  assert.deepEqual((await snapshot(page)).tables, saved)
})

test('native cross-tab storage pauses a visible pet and cancels a preview without replaying it', async t => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' })
  await instrument(page)
  const saved = (await snapshot(page)).tables
  const peer = await page.context().newPage(), url = new URL('motion-preference-probe', page.url()).href
  await peer.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Storage event probe</title>' }))
  await peer.goto(url); await page.bringToFront()
  const choose = value => peer.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value })
  await choose('on'); await pending(page, 0)
  await home(page)
  assert.equal((await read(page)).pending, 0)
  await choose('off'); await pending(page, 1)
  await page.getByRole('button', { name: 'Wardrobe', exact: true }).click()
  await page.getByRole('button', { name: 'Hop', exact: true }).waitFor(); await settleView(page)
  await page.getByRole('button', { name: 'Hop', exact: true }).click(); await page.clock.runFor(400)
  assert.equal((await read(page)).pending, 1)
  await choose('on'); await pending(page, 0)
  assert.equal(await page.getByRole('button', { name: 'Stop hop', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isDisabled(), true)
  assert.match(await page.locator('.wd-motion-note').textContent(), /reduced motion/)
  await choose('off'); await page.waitForTimeout(50)
  assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isEnabled(), true)
  await page.clock.runFor(2000)
  assert.equal((await read(page)).pending, 0, 'restoring motion must not replay the cancelled preview')
  const choice = await settings(page)
  assert.equal(await choice.isChecked(), false)
  await choose('on'); await page.waitForTimeout(50)
  assert.equal(await choice.isChecked(), true)
  assert.deepEqual((await snapshot(page)).tables, saved)
  await peer.close()
  t.diagnostic('One Chromium/app page plus a minimal same-origin storage-only peer; real StorageEvent, cancellation/no replay and live Settings checked state; unchanged saved tables.')
})

test('a device-reduced gallery cheer keeps its pet still and fades before its existing deadline', async t => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' })
  await page.evaluate(key => localStorage.setItem(key, 'on'), key)
  await page.addInitScript(recordFrames)
  const url = new URL(page.url()); url.search = '?art'
  await page.goto(url.href)
  await page.getByRole('heading', { name: 'Art gallery', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Replay cheers', exact: true }).click()
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop').count(), 3)
  const policy = await page.locator('.gallery-effects').evaluate(node => ({
    system: matchMedia('(prefers-reduced-motion: reduce)').matches,
    names: [...node.querySelectorAll('.fx-cheer-hop,.ch-breathe,.ch-eye')].map(el => getComputedStyle(el).animationName),
    accents: [...node.querySelectorAll('.fx-cheer-pop')].map(el => {
      const style = getComputedStyle(el)
      return { name: style.animationName, end: (parseFloat(style.animationDelay) + parseFloat(style.animationDuration)) * 1000 }
    }),
  }))
  assert.equal(policy.system, false)
  assert.ok(policy.names.length >= 6 && policy.names.every(name => name === 'none'), 'device reduction must suppress the CSS hop, body breathing and blinks')
  assert.equal(policy.accents.length, 36)
  assert.ok(policy.accents.every(accent => accent.name === 'fx-static-fade' && accent.end <= 1200.1))
  assert.equal((await read(page)).pending, 0)
  if (process.env.CHORE_MOTION_PREFERENCE_CAPTURE_DIR) {
    await mkdir(process.env.CHORE_MOTION_PREFERENCE_CAPTURE_DIR, { recursive: true })
    await page.locator('.gallery-effects').screenshot({ path: join(process.env.CHORE_MOTION_PREFERENCE_CAPTURE_DIR, 'motion-preference-cheer-1280.png') })
  }
  await page.waitForFunction(() => !document.querySelector('.gallery-effects .fx-cheer-hop'), undefined, { polling: 50, timeout: 1600 })
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop').count(), 0)
  assert.equal((await read(page)).pending, 0)
  t.diagnostic('Device on/system off: three CSS cheering pets still;36 static-fade accents end by1200ms;original finite cleanup;0RAF.')
})
