import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_TOOLS_CAPTURE_DIR
async function creator(t, { species = 'mochi', width = 1280, height = 800, text = 100, reduced = false } = {}) {
  const page = await browserApp(t, { viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
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
      const id = request(time => { window.__toolsFrames.delete(id); callback(time) })
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

for (const species of ['mochi', 'bun', 'sprout']) {
  test(`preview tools reflect layered ${species} in every mood without saving`, async t => {
    const page = await creator(t, { species })
    const before = (await snapshot(page)).tables
    const node = await art(page).elementHandle()
    const samples = []
    for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick']) {
      await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption(mood)
      assert.equal(await mirror(page).getAttribute('aria-pressed'), 'false')
      const normal = await geometry(page), markup = await art(page).innerHTML()
      await mirror(page).focus(); await page.keyboard.press('Space')
      const reflected = await geometry(page)
      expectReflection(normal, reflected)
      assert.equal(await art(page).evaluate((current, original) => current === original, node), true)
      assert.equal(await art(page).innerHTML(), markup)
      assert.match(await page.locator('.cc-preview svg').getAttribute('aria-label'), /mirrored/)
      assert.equal(await frames(page), 0)
      const data = { species, mood, normal, reflected, pendingFrames: await frames(page) }
      samples.push(data)
      if (mood === 'happy' || mood === 'sick') {
        await show(page).focus(); await page.keyboard.press('Enter')
        const box = await page.locator('.cc-preview svg').boundingBox()
        await capture(page, `tools-${species}-${mood}`, data, box)
      }
      await mirror(page).focus(); await page.keyboard.press('Space')
      assert.equal(await mirror(page).getAttribute('aria-pressed'), 'false')
    }
    assert.deepEqual((await snapshot(page)).tables, before)
    if (out) await writeFile(join(out, `tools-${species}-geometry.json`), JSON.stringify(samples, null, 2) + '\n')
  })
}

test('keyboard preview tools preserve the running cheer, draft and original deadline', async t => {
  const page = await creator(t, { width: 390, height: 664 })
  const before = (await snapshot(page)).tables
  await page.getByRole('tab', { name: 'Who', exact: true }).click()
  await page.getByRole('radio', { name: 'Bun', exact: true }).click()
  await page.clock.runFor(756)
  await page.getByRole('tab', { name: 'Face', exact: true }).click()
  const markup = await art(page).innerHTML()
  assert.equal(await frames(page), 1)
  await mirror(page).focus(); await page.keyboard.press('Space')
  await show(page).focus(); await page.keyboard.press('Enter')
  assert.equal(await art(page).innerHTML(), markup)
  assert.equal(await frames(page), 1)
  assert.equal((await geometry(page)).focused, true)
  await page.clock.runFor(1200)
  assert.equal(await frames(page), 0)
  assert.equal(await art(page).locator('[data-expression="happy"]').count(), 1)
  assert.equal(await mirror(page).getAttribute('aria-pressed'), 'true')
  assert.deepEqual((await snapshot(page)).tables, before)
  await page.clock.resume()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.deepEqual((await snapshot(page)).tables, before)
})

for (const [width, height] of [[320, 568], [390, 664], [640, 360], [844, 390], [1280, 800]]) {
  test(`preview tools are reachable and reveal focused art at ${width}x${height} enlarged text`, async t => {
    const page = await creator(t, { width, height, text: 200 })
    const before = (await snapshot(page)).tables
    await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('sick')
    await page.keyboard.press('Tab')
    const controls = []
    for (const button of [mirror(page), show(page)]) {
      await button.focus()
      const rect = await button.evaluate(node => {
        const r = node.getBoundingClientRect()
        return { label: node.textContent, x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
          focusVisible: node.matches(':focus-visible'), textFits: node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight }
      })
      assert.ok(rect.width >= 44 && rect.height >= 44)
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.right <= width + .01 && rect.bottom <= height + .01)
      assert.ok(rect.focusVisible && rect.textFits)
      controls.push(rect)
    }
    await mirror(page).focus(); await page.keyboard.press('Space')
    await capture(page, `tools-layout-${width}-controls`, { width, height, text: 200, controls })
    await show(page).focus(); await page.keyboard.press('Enter')
    const revealed = await geometry(page)
    assert.equal(revealed.focused, true); assert.equal(revealed.focusVisible, true)
    assert.equal(await page.locator('.cc-preview svg').evaluate(node => getComputedStyle(node).outlineStyle), 'solid')
    assert.equal(await page.locator('.cc-preview svg').getAttribute('tabindex'), '-1')
    assert.ok(revealed.box.height >= 120 && revealed.box.y >= 0 && revealed.box.bottom <= height + .01)
    assert.ok(revealed.box.x >= 0 && revealed.box.right <= width + .01)
    assert.equal(await frames(page), 0)
    await capture(page, `tools-layout-${width}-preview`, { width, height, text: 200, revealed, pendingFrames: await frames(page) })
    assert.deepEqual((await snapshot(page)).tables, before)
  })
}

test('reduced preview tools never start motion or save a facing preference', async t => {
  const page = await creator(t, { width: 390, reduced: true })
  const before = (await snapshot(page)).tables
  await mirror(page).click()
  await show(page).click()
  await page.clock.runFor(2200)
  assert.equal(await frames(page), 0)
  assert.equal(await mirror(page).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  assert.deepEqual((await snapshot(page)).tables, before)
  await page.clock.resume()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.getByRole('tab', { name: 'Face', exact: true }).click()
  assert.equal(await mirror(page).getAttribute('aria-pressed'), 'false')
  assert.equal(await page.locator('[data-preview-facing]').getAttribute('data-preview-facing'), 'normal')
})

test('mirrored mood survives edits and resizing while Save keeps only the look', async t => {
  const page = await creator(t, { width: 390, height: 664 })
  const before = (await snapshot(page)).tables
  const node = await art(page).elementHandle()
  await mirror(page).click()
  await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('meh')
  await page.getByRole('tab', { name: 'Who', exact: true }).click()
  await page.getByRole('radio', { name: 'Bun', exact: true }).click()
  await page.getByRole('tab', { name: 'Colour', exact: true }).click()
  await page.getByRole('radio', { name: 'Sky', exact: true }).click()
  await page.getByRole('tab', { name: 'Face', exact: true }).click()
  await page.getByRole('radio', { name: 'Sparkly', exact: true }).click()
  await page.getByRole('radio', { name: 'Hearts', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForFunction(() => !document.querySelector('.cc [role="tablist"]'))
  assert.equal(await mirror(page).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.getByRole('combobox', { name: 'Preview mood', exact: true }).inputValue(), 'meh')
  assert.equal(await art(page).evaluate((current, original) => current === original, node), true)
  assert.equal(await frames(page), 0)
  await page.setViewportSize({ width: 390, height: 664 })
  await page.getByRole('tab', { name: 'Face', exact: true }).waitFor()
  assert.equal(await mirror(page).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const after = (await snapshot(page)).tables
  for (const table of ['chores', 'completions', 'progress']) assert.deepEqual(after[table], before[table])
  const saved = Object.values(after.pets)[0], original = Object.values(before.pets)[0]
  assert.equal(saved.species, 'bun'); assert.equal(saved.bodyColour, '#9ED8F5')
  assert.equal(saved.eyes, 'sparkly'); assert.equal(saved.cheeks, 'hearts')
  assert.equal(saved.name, original.name); assert.deepEqual(saved.equipped, original.equipped)
  for (const field of ['mirrored', 'previewMood', 'mood']) assert.equal(Object.hasOwn(saved, field), false)
})
