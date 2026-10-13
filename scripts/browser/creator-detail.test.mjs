import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_DETAIL_CAPTURE_DIR
async function creator(t, { species = 'mochi', width = 1280, height = 800, text = 100, reduced = false, device = false } = {}) {
  const page = await browserApp(t, { viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  if (device) await page.evaluate(() => localStorage.setItem('chore-pet-reduce-motion', 'on'))
  await page.evaluate(species => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, pet = Object.values(saved.tables.pets)[0]
        pet.species = species
        pet.bodyColour = { mochi: '#FFCFDA', bun: '#FFFFFF', sprout: '#FFD65C' }[species]
        pet.equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
        saved.outbox = {}; store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), species)
  await page.reload()
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.evaluate(text => { document.documentElement.style.fontSize = `${text}%` }, text)
  await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000)
  await page.evaluate(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__toolsFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(time => { window.__toolsFrames.delete(id); window.__toolsLastFrameTime = time; callback(time) })
      window.__toolsFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__toolsFrames.delete(id); cancel(id) }
  })
  await page.clock.runFor(48)
  const tab = page.getByRole('tab', { name: 'Face', exact: true })
  if (await tab.count()) await tab.click()
  return page
}
const mirror = page => page.getByRole('button', { name: 'Mirror preview', exact: true })
const show = page => page.getByRole('button', { name: 'Show preview', exact: true })
const art = page => page.locator('.cc-preview .ch-animated')
const frames = page => page.evaluate(() => window.__toolsFrames.size)

async function geometry(page) {
  return page.locator('.cc-preview svg').evaluate(svg => {
    const bounds = svg.getBoundingClientRect()
    const body = svg.querySelector('[data-character-body]'), ground = svg.querySelector('[data-character-ground]')
    const points = node => [[63, 91], [137, 91], [63, 181], [137, 181]].map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(node.getScreenCTM()); return { x: p.x, y: p.y }
    })
    return { centerX: bounds.x + bounds.width / 2, body: points(body), ground: points(ground),
      facing: svg.querySelector('[data-preview-facing]')?.getAttribute('data-preview-facing'),
      slots: [...svg.querySelectorAll('[data-slot]')].map(n => n.getAttribute('data-slot')).filter(s => s !== 'body').sort(),
      focused: document.activeElement === svg, focusVisible: svg.matches(':focus-visible'),
      box: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, bottom: bounds.bottom, right: bounds.right } }
  })
}
function expectReflection(before, after) {
  assert.equal(after.facing, 'mirrored')
  assert.equal(after.centerX, before.centerX)
  for (const part of ['body', 'ground']) for (let i = 0; i < 4; i++) {
    assert.ok(Math.abs(after[part][i].x - (2 * before.centerX - before[part][i].x)) < .01, `${part} x reflects once`)
    assert.ok(Math.abs(after[part][i].y - before[part][i].y) < .01, `${part} y stays grounded`)
  }
  assert.deepEqual(after.slots, before.slots)
}
async function capture(page, name, data, clip) {
  if (!out) return
  await mkdir(out, { recursive: true })
  await page.screenshot({ path: join(out, `${name}.png`), animations: 'disabled', ...(clip ? { clip } : {}) })
  await writeFile(join(out, `${name}.json`), JSON.stringify({ ...data, browser: page.context().browser().version(),
    method: 'Actual offline production creator; native keyboard and matrix/focus geometry asserted. Finite CSS transitions settled for screenshot only; not temporal/AT/physical-device certification.' }, null, 2) + '\n')
}

const detail = page => page.getByRole('button', { name: 'Face detail', exact: true })
async function faceGeometry(page) {
  return page.locator('.cc-preview svg').evaluate(svg => {
    const parts = [...svg.querySelectorAll('[data-expression], [data-slot="face"]')]
    const bounds = svg.getBoundingClientRect()
    const points = parts.flatMap(part => {
      const local = part.getBBox(), matrix = part.getScreenCTM()
      const stroke = Math.max(0, ...[...part.querySelectorAll('*')].map(node => {
        const style = getComputedStyle(node), m = node.getScreenCTM()
        return style.stroke === 'none' || !m ? 0 : parseFloat(style.strokeWidth) / 2 * Math.hypot(m.a, m.b, m.c, m.d)
      }))
      return [[local.x, local.y], [local.x + local.width, local.y], [local.x, local.y + local.height], [local.x + local.width, local.y + local.height]]
        .map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y, stroke, part: part.getAttribute('data-slot') ?? 'expression' } })
    })
    return { viewBox: svg.getAttribute('viewBox'), label: svg.getAttribute('aria-label'), scale: Math.hypot(svg.getScreenCTM().a, svg.getScreenCTM().b),
      box: { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height }, points }
  })
}
function expectFaceVisible(value) {
  for (const p of value.points) {
    assert.ok(p.x - p.stroke >= value.box.x + 1 && p.x + p.stroke <= value.box.right - 1, `face x inside preview: ${JSON.stringify(value)}`)
    assert.ok(p.y - p.stroke >= value.box.y + 1 && p.y + p.stroke <= value.box.bottom - 1, `face y inside preview: ${JSON.stringify(value)}`)
  }
}

for (const species of ['mochi', 'bun', 'sprout']) {
  test(`face detail enlarges dressed ${species} in every mood and mirrors once without saving`, async t => {
    const page = await creator(t, { species }), saved = (await snapshot(page)).tables
    const node = await art(page).elementHandle(), svg = await page.locator('.cc-preview svg').elementHandle(), samples = []
    for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick']) {
      await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption(mood)
      assert.equal(await detail(page).getAttribute('aria-pressed'), 'false')
      const markup = await art(page).innerHTML(), full = await faceGeometry(page)
      assert.equal(full.viewBox, '0 0 200 200')
      if (['happy', 'scruffy', 'sick'].includes(mood)) await capture(page, `detail-${species}-${mood}-full`, { species, mood, full }, await page.locator('.cc-preview svg').boundingBox())
      await detail(page).focus(); await page.keyboard.press('Space')
      assert.equal(await detail(page).getAttribute('aria-pressed'), 'true')
      assert.equal(await detail(page).evaluate(n => n === document.activeElement), true)
      const close = await faceGeometry(page), normal = await geometry(page)
      assert.equal(close.viewBox, '36 75 128 110'); assert.match(close.label, /face detail/)
      assert.deepEqual(close.box, full.box)
      assert.ok(close.scale / full.scale >= 25 / 16 - .00001 && close.scale / full.scale <= 20 / 11 + .00001)
      expectFaceVisible(close)
      await mirror(page).focus(); await page.keyboard.press('Enter')
      const reflected = await geometry(page), reflectedFace = await faceGeometry(page)
      expectReflection(normal, reflected); expectFaceVisible(reflectedFace)
      assert.equal(await art(page).innerHTML(), markup)
      assert.equal(await art(page).evaluate((current, original) => current === original, node), true)
      assert.equal(await page.locator('.cc-preview svg').evaluate((current, original) => current === original, svg), true)
      assert.equal(await frames(page), 0)
      const data = { species, mood, full, close, normal, reflected, reflectedFace, pendingFrames: await frames(page) }
      samples.push(data)
      if (['happy', 'scruffy', 'sick'].includes(mood)) await capture(page, `detail-${species}-${mood}-close`, data, await page.locator('.cc-preview svg').boundingBox())
      await detail(page).focus(); await page.keyboard.press('Enter')
      assert.equal((await faceGeometry(page)).viewBox, '0 0 200 200')
      await mirror(page).click()
      assert.equal(await art(page).innerHTML(), markup)
    }
    assert.deepEqual((await snapshot(page)).tables, saved)
    if (out) await writeFile(join(out, `detail-${species}-geometry.json`), JSON.stringify(samples, null, 2) + '\n')
  })
}

test('detail preserves the delivered cheer frame, Show preview focus and original deadline', async t => {
  const page = await creator(t, { width: 390, height: 664 }), before = (await snapshot(page)).tables
  await page.getByRole('tab', { name: 'Who', exact: true }).click()
  await page.getByRole('radio', { name: 'Bun', exact: true }).evaluate(node => node.addEventListener('click', () => { window.__detailActionStart = performance.now() }, { capture: true, once: true }))
  await page.getByRole('radio', { name: 'Bun', exact: true }).click(); await page.clock.runFor(756)
  await page.getByRole('tab', { name: 'Face', exact: true }).click()
  const markup = await art(page).innerHTML()
  assert.equal(await frames(page), 1)
  await detail(page).focus(); await page.keyboard.press('Space'); await mirror(page).click()
  await show(page).focus(); await page.keyboard.press('Enter')
  assert.equal(await art(page).innerHTML(), markup); assert.equal(await frames(page), 1)
  assert.equal((await geometry(page)).focused, true); expectFaceVisible(await faceGeometry(page))
  await capture(page, 'detail-active-cheer', { geometry: await faceGeometry(page), pendingFrames: await frames(page) }, await page.locator('.cc-preview svg').boundingBox())
  const start = await page.evaluate(() => window.__detailActionStart)
  const elapsed = await page.evaluate(start => performance.now() - start, start)
  await page.clock.runFor(1799 - elapsed)
  assert.equal(await frames(page), 1)
  const beforeDeadline = await page.evaluate(() => window.__toolsLastFrameTime)
  assert.ok(beforeDeadline < start + 1800)
  let advancedMs = 0
  while (await page.evaluate(start => window.__toolsLastFrameTime < start + 1800, start)) {
    assert.ok(advancedMs < 32, 'first delivered RAF must cross the deadline within two16msframes')
    await page.clock.runFor(1); advancedMs++
  }
  const deadline = await page.evaluate(() => ({ eventStart: window.__detailActionStart, deliveredTime: window.__toolsLastFrameTime, now: performance.now(), pendingFrames: window.__toolsFrames.size }))
  assert.ok(deadline.deliveredTime >= start + 1800 && deadline.deliveredTime < start + 1832)
  if (out) await writeFile(join(out, 'detail-cheer-deadline.json'), JSON.stringify({ beforeDeadline, advancedMs, ...deadline }, null, 2) + '\n')
  assert.equal(await frames(page), 0); assert.equal(await detail(page).getAttribute('aria-pressed'), 'true')
  assert.equal(await art(page).locator('[data-expression="happy"]').count(), 1)
  assert.deepEqual((await snapshot(page)).tables, before)
})

for (const [width, height] of [[320, 568], [390, 664], [640, 360], [844, 390], [1280, 800]]) {
  test(`all three preview tools fit and reveal face detail at ${width}x${height} enlarged text`, async t => {
    const page = await creator(t, { width, height, text: 200 }), before = (await snapshot(page)).tables
    await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('sick')
    await page.keyboard.press('Tab')
    const controls = []
    for (const button of [mirror(page), detail(page), show(page)]) {
      await button.focus()
      const r = await button.evaluate(node => { const r = node.getBoundingClientRect(); return { label: node.textContent, x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
        focused: node === document.activeElement, focusVisible: node.matches(':focus-visible'), textFits: node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight } })
      assert.ok(r.width >= 44 && r.height >= 44 && r.focused && r.focusVisible && r.textFits)
      assert.ok(r.x >= 0 && r.y >= 0 && r.right <= width + .01 && r.bottom <= height + .01)
      controls.push(r)
    }
    await detail(page).focus(); await page.keyboard.press('Enter')
    await capture(page, `detail-layout-${width}-controls`, { width, height, text: 200, controls })
    await show(page).focus(); await page.keyboard.press('Space')
    const revealed = await geometry(page), face = await faceGeometry(page)
    assert.equal(revealed.focused, true); assert.equal(revealed.focusVisible, true)
    assert.ok(revealed.box.height >= 120 && revealed.box.y >= 0 && revealed.box.bottom <= height + .01)
    expectFaceVisible(face); assert.equal(await frames(page), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await capture(page, `detail-layout-${width}-preview`, { width, height, text: 200, revealed, face, pendingFrames: await frames(page) })
    assert.deepEqual((await snapshot(page)).tables, before)
  })
}

for (const policy of ['system', 'device']) test(`detail stays usable through live ${policy} reduction without replay or save`, async t => {
  const page = await creator(t, { width: 390 }), before = (await snapshot(page)).tables
  let choose = value => changeReducedMotion(page, value ? 'reduce' : 'no-preference')
  if (policy === 'device') {
    const peer = await page.context().newPage(), url = new URL('detail-motion-preference-probe', page.url()).href
    await peer.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Detail motion preference probe</title>' }))
    await peer.goto(url); await page.bringToFront(); t.after(() => peer.close())
    choose = async value => {
      await page.evaluate(() => { window.__detailPreference = new Promise(resolve => window.addEventListener('storage', event => {
        if (event.key === 'chore-pet-reduce-motion') resolve(event.newValue)
      }, { once: true })) })
      await peer.evaluate(value => localStorage.setItem('chore-pet-reduce-motion', value ? 'on' : 'off'), value)
      let timeout
      const delivered = await Promise.race([page.evaluate(() => window.__detailPreference),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Native storage event not delivered within4s')), 4000) })]).finally(() => clearTimeout(timeout))
      assert.equal(delivered, value ? 'on' : 'off')
    }
  }
  await page.getByRole('tab', { name: 'Who', exact: true }).click()
  await page.getByRole('radio', { name: 'Bun', exact: true }).click(); await page.clock.runFor(756)
  await page.getByRole('tab', { name: 'Face', exact: true }).click(); await detail(page).click()
  await choose(true); await page.clock.runFor(16)
  const still = await art(page).innerHTML(); assert.equal(await frames(page), 0)
  await detail(page).click(); await detail(page).click(); assert.equal(await art(page).innerHTML(), still)
  await choose(false); await page.clock.runFor(2200)
  assert.equal(await art(page).innerHTML(), still); assert.equal(await frames(page), 0)
  assert.equal(await detail(page).getAttribute('aria-pressed'), 'true')
  assert.deepEqual((await snapshot(page)).tables, before)
})

test('detail survives mood, draft, tabs and resize while Save stores only the look and remount resets', async t => {
  const page = await creator(t, { width: 390 }), before = (await snapshot(page)).tables
  await detail(page).click(); await mirror(page).click()
  await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('meh')
  await page.getByRole('tab', { name: 'Who', exact: true }).click(); await page.getByRole('radio', { name: 'Bun', exact: true }).click()
  await page.getByRole('tab', { name: 'Colour', exact: true }).click(); await page.getByRole('radio', { name: 'Sky', exact: true }).click()
  await page.getByRole('tab', { name: 'Face', exact: true }).click(); await page.getByRole('radio', { name: 'Sparkly', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForFunction(() => !document.querySelector('.cc [role="tablist"]'))
  assert.equal(await detail(page).getAttribute('aria-pressed'), 'true'); assert.equal((await faceGeometry(page)).viewBox, '36 75 128 110')
  assert.equal(await mirror(page).getAttribute('aria-pressed'), 'true'); assert.equal(await frames(page), 0)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const after = (await snapshot(page)).tables, saved = Object.values(after.pets)[0]
  for (const table of ['chores', 'completions', 'progress']) assert.deepEqual(after[table], before[table])
  assert.equal(saved.species, 'bun'); assert.equal(saved.bodyColour, '#9ED8F5'); assert.equal(saved.eyes, 'sparkly')
  for (const field of ['faceDetail', 'previewFaceDetail', 'mirrored', 'previewMood', 'mood']) assert.equal(Object.hasOwn(saved, field), false)
  await page.clock.resume(); await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  assert.equal(await detail(page).getAttribute('aria-pressed'), 'false'); assert.equal((await faceGeometry(page)).viewBox, '0 0 200 200')
})

for (const policy of ['system', 'device']) test(`initial ${policy} reduction leaves detail available and creates no preview clock`, async t => {
  const page = await creator(t, { reduced: policy === 'system', device: policy === 'device' }), before = (await snapshot(page)).tables
  await detail(page).click(); await mirror(page).click()
  await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('sick')
  await show(page).focus(); await page.keyboard.press('Enter')
  expectFaceVisible(await faceGeometry(page)); assert.equal(await frames(page), 0)
  assert.equal((await faceGeometry(page)).viewBox, '36 75 128 110')
  assert.deepEqual((await snapshot(page)).tables, before)
})
