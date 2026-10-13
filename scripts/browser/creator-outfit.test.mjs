import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_OUTFIT_CAPTURE_DIR
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
        pet.eyes = 'lashes'; pet.cheeks = 'hearts'
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

const outfit = page => page.getByRole('button', { name: 'Show outfit', exact: true })
const clothing = page => art(page).locator('[data-slot="head"], [data-slot="face"], [data-slot="neck"], [data-slot="outfit"], [data-slot="back"]')
async function comparableArt(page) {
  const value = await art(page).evaluate(art => {
    const clone = art.cloneNode(true), clips = [...clone.querySelectorAll('clipPath[id]')]
    const ids = new Map(clips.map((node, i) => [node.id, `clip${i}`])), references = []
    for (const node of clone.querySelectorAll('[clip-path]')) {
      node.setAttribute('clip-path', node.getAttribute('clip-path').replace(/url\(#([^)]+)\)/g, (_, id) => {
        references.push({ id, resolves: ids.has(id) }); return `url(#${ids.get(id)})`
      }))
    }
    const originalIds = [...ids.keys()]
    const globalCounts = new Map()
    for (const node of document.querySelectorAll('clipPath[id]')) globalCounts.set(node.id, (globalCounts.get(node.id) ?? 0) + 1)
    const uniqueGlobally = originalIds.every(id => globalCounts.get(id) === 1)
    clips.forEach(node => node.setAttribute('id', ids.get(node.id)))
    return { markup: clone.innerHTML, clipCount: clips.length, uniqueCount: ids.size, originalIds, references, uniqueGlobally }
  })
  assert.equal(value.clipCount, value.uniqueCount)
  assert.equal(value.uniqueGlobally, true)
  assert.ok(value.references.every(ref => ref.resolves), 'every clip reference resolves inside this art')
  return value
}
const pixelSha = bytes => createHash('sha256').update(bytes).digest('hex')
for (const species of ['mochi', 'bun', 'sprout']) test(`outfit can be hidden and exactly restored on ${species} in every mood`, async t => {
  const page = await creator(t, { species }), before = (await snapshot(page)).tables
  const figure = await art(page).elementHandle(), svg = await page.locator('.cc-preview svg').elementHandle(), samples = []
  await detail(page).click(); await mirror(page).click()
  for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick']) {
    await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption(mood)
    assert.equal(await outfit(page).getAttribute('aria-pressed'), 'true')
    const original = await comparableArt(page), pixels = await page.locator('.cc-preview svg').screenshot({ animations: 'disabled' }), face = await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML))
    const dressed = await geometry(page)
    assert.ok(await clothing(page).count() > 0)
    await outfit(page).focus(); await page.keyboard.press('Space')
    assert.equal(await outfit(page).getAttribute('aria-pressed'), 'false')
    assert.equal(await outfit(page).evaluate(n => n === document.activeElement), true)
    assert.equal(await clothing(page).count(), 0)
    assert.equal(await art(page).evaluate((n, old) => n === old, figure), true)
    assert.equal(await page.locator('.cc-preview svg').evaluate((n, old) => n === old, svg), true)
    assert.deepEqual(await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), face)
    const bare = await geometry(page), facial = await faceGeometry(page)
    assert.deepEqual(bare.body, dressed.body); assert.deepEqual(bare.ground, dressed.ground)
    assert.equal(bare.facing, 'mirrored'); assert.equal(facial.viewBox, '36 75 128 110')
    assert.match(facial.label, /outfit hidden/); expectFaceVisible(facial); assert.equal(await frames(page), 0)
    samples.push({ species, mood, dressed, bare, facial, pendingFrames: await frames(page) })
    if (['happy', 'scruffy', 'sick'].includes(mood)) await capture(page, `outfit-${species}-${mood}-bare`, { species, mood, dressed, bare, facial }, await page.locator('.cc-preview svg').boundingBox())
    await outfit(page).focus(); await page.keyboard.press('Enter')
    const restored = await comparableArt(page), restoredPixels = await page.locator('.cc-preview svg').screenshot({ animations: 'disabled' })
    assert.equal(restored.markup, original.markup)
    assert.deepEqual(restoredPixels, pixels, 'restored SVG screenshot is byte-identical despite fresh scoped clip IDs')
    Object.assign(samples.at(-1), { restoration: { originalClipIds: original.originalIds, restoredClipIds: restored.originalIds, globallyUniqueClipIds: original.uniqueGlobally && restored.uniqueGlobally, locallyValidClipCount: original.clipCount, locallyValidReferenceCount: original.references.length, originalPngSha256: pixelSha(pixels), restoredPngSha256: pixelSha(restoredPixels), exactPng: true, originalPngBytes: pixels.length, restoredPngBytes: restoredPixels.length, canonicalMarkupEqual: true } })
    assert.equal(await outfit(page).getAttribute('aria-pressed'), 'true')
  }
  assert.deepEqual((await snapshot(page)).tables, before)
  if (out) await writeFile(join(out, `outfit-${species}-geometry.json`), JSON.stringify(samples, null, 2) + '\n')
})

test('outfit hiding preserves the same cheer frame, detail, mirror and original deadline', async t => {
  const page = await creator(t, { width: 390 }), before = (await snapshot(page)).tables
  await page.getByRole('tab', { name: 'Who', exact: true }).click()
  await page.getByRole('radio', { name: 'Bun', exact: true }).evaluate(n => n.addEventListener('click', () => { window.__outfitActionStart = performance.now() }, { capture: true, once: true }))
  await page.getByRole('radio', { name: 'Bun', exact: true }).click(); await page.clock.runFor(756)
  await page.getByRole('tab', { name: 'Face', exact: true }).click(); await detail(page).click(); await mirror(page).click()
  const dressed = await geometry(page), face = await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML))
  await outfit(page).focus(); await page.keyboard.press('Enter')
  const bare = await geometry(page)
  assert.deepEqual(bare.body, dressed.body); assert.deepEqual(bare.ground, dressed.ground)
  assert.deepEqual(await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), face)
  assert.equal(await frames(page), 1); assert.equal(await clothing(page).count(), 0)
  await show(page).focus(); await page.keyboard.press('Space')
  assert.equal((await geometry(page)).focused, true)
  await capture(page, 'outfit-active-cheer', { dressed, bare, facial: await faceGeometry(page), pendingFrames: await frames(page) }, await page.locator('.cc-preview svg').boundingBox())
  const start = await page.evaluate(() => window.__outfitActionStart), elapsed = await page.evaluate(start => performance.now() - start, start)
  await page.clock.runFor(1799 - elapsed); assert.equal(await frames(page), 1)
  const beforeDeadline = await page.evaluate(() => window.__toolsLastFrameTime)
  assert.ok(beforeDeadline < start + 1800)
  let advancedMs = 0
  while (await page.evaluate(start => window.__toolsLastFrameTime < start + 1800, start)) {
    assert.ok(advancedMs < 32); await page.clock.runFor(1); advancedMs++
  }
  assert.equal(await frames(page), 0); assert.equal(await outfit(page).getAttribute('aria-pressed'), 'false')
  assert.equal(await clothing(page).count(), 0); assert.deepEqual((await snapshot(page)).tables, before)
  if (out) await writeFile(join(out, 'outfit-cheer-deadline.json'), JSON.stringify({ start, beforeDeadline, advancedMs, ...(await page.evaluate(() => ({ deliveredTime: window.__toolsLastFrameTime, now: performance.now(), pendingFrames: window.__toolsFrames.size }))) }, null, 2) + '\n')
})

for (const [width, height] of [[320, 568], [390, 664], [640, 360], [844, 390], [1280, 800]]) test(`four preview controls fit enlarged text and reveal bare face at ${width}x${height}`, async t => {
  const page = await creator(t, { width, height, text: 200 }), before = (await snapshot(page)).tables
  await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('sick')
  await page.keyboard.press('Tab'); const controls = []
  for (const control of [mirror(page), detail(page), outfit(page), show(page)]) {
    await control.focus()
    const r = await control.evaluate(n => { const r = n.getBoundingClientRect(); return { label: n.textContent, x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
      focused: n === document.activeElement, focusVisible: n.matches(':focus-visible'), textFits: n.scrollWidth <= n.clientWidth && n.scrollHeight <= n.clientHeight } })
    assert.ok(r.width >= 44 && r.height >= 44 && r.focused && r.focusVisible && r.textFits)
    assert.ok(r.x >= 0 && r.y >= 0 && r.right <= width + .01 && r.bottom <= height + .01)
    controls.push(r)
  }
  await outfit(page).focus(); await page.keyboard.press('Space'); await detail(page).click()
  await capture(page, `outfit-layout-${width}-controls`, { width, height, text: 200, controls })
  await show(page).focus(); await page.keyboard.press('Enter')
  const revealed = await geometry(page), facial = await faceGeometry(page)
  assert.equal(revealed.focused, true); assert.equal(revealed.focusVisible, true)
  assert.ok(revealed.box.height >= 120 && revealed.box.y >= 0 && revealed.box.bottom <= height + .01)
  expectFaceVisible(facial); assert.equal(await clothing(page).count(), 0); assert.equal(await frames(page), 0)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await capture(page, `outfit-layout-${width}-preview`, { width, height, text: 200, revealed, facial })
  assert.deepEqual((await snapshot(page)).tables, before)
})

test('hidden outfit survives draft edits and Save keeps equipment, then reopening restores preview', async t => {
  const page = await creator(t, { width: 390 }), before = (await snapshot(page)).tables
  await outfit(page).click(); await detail(page).click(); await mirror(page).click()
  await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('meh')
  await page.getByRole('tab', { name: 'Who', exact: true }).click(); await page.getByRole('radio', { name: 'Bun', exact: true }).click()
  await page.getByRole('tab', { name: 'Colour', exact: true }).click(); await page.getByRole('radio', { name: 'Sky', exact: true }).click()
  await page.getByRole('tab', { name: 'Face', exact: true }).click(); await page.getByRole('radio', { name: 'Sparkly', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForFunction(() => !document.querySelector('.cc [role="tablist"]'))
  assert.equal(await outfit(page).getAttribute('aria-pressed'), 'false'); assert.equal(await clothing(page).count(), 0)
  assert.equal((await faceGeometry(page)).viewBox, '36 75 128 110'); assert.equal(await mirror(page).getAttribute('aria-pressed'), 'true')
  assert.equal(await frames(page), 0)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const after = (await snapshot(page)).tables, saved = Object.values(after.pets)[0], original = Object.values(before.pets)[0]
  assert.deepEqual(saved.equipped, original.equipped); assert.equal(saved.name, original.name)
  assert.equal(saved.species, 'bun'); assert.equal(saved.bodyColour, '#9ED8F5'); assert.equal(saved.eyes, 'sparkly'); assert.equal(saved.cheeks, 'hearts')
  for (const table of ['chores', 'completions', 'progress']) assert.deepEqual(after[table], before[table])
  for (const field of ['showOutfit', 'previewShowOutfit', 'faceDetail', 'previewFaceDetail', 'mirrored', 'previewMood', 'mood']) assert.equal(Object.hasOwn(saved, field), false)
  await page.clock.resume(); await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  assert.equal(await outfit(page).getAttribute('aria-pressed'), 'true'); assert.ok(await clothing(page).count() > 0)
})

test('an unequipped pet omits the outfit control and keeps detail and mirror usable', async t => {
  const page = await creator(t, { width: 1280 })
  await page.clock.resume(); await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1); request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), read = store.get('snapshot')
      read.onsuccess = () => { const s = read.result; Object.values(s.tables.pets)[0].equipped = {}; s.outbox = {}; store.put(s, 'snapshot') }
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) } }
  }))
  await page.reload(); await page.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  assert.equal(await outfit(page).count(), 0); await detail(page).click(); await mirror(page).click()
  assert.equal(await clothing(page).count(), 0); assert.doesNotMatch((await faceGeometry(page)).label, /outfit hidden/)
})

test('live system reduction keeps outfit hiding usable and restores no cheer', async t => {
  const page = await creator(t, { width: 390 }), before = (await snapshot(page)).tables
  await page.getByRole('tab', { name: 'Who', exact: true }).click(); await page.getByRole('radio', { name: 'Bun', exact: true }).click(); await page.clock.runFor(756)
  await page.getByRole('tab', { name: 'Face', exact: true }).click(); await outfit(page).click()
  await changeReducedMotion(page, 'reduce'); await page.clock.runFor(16)
  const face = await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML))
  assert.equal(await frames(page), 0); await outfit(page).click(); await outfit(page).click()
  assert.deepEqual(await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), face)
  await changeReducedMotion(page, 'no-preference'); await page.clock.runFor(2200)
  assert.equal(await frames(page), 0); assert.equal(await clothing(page).count(), 0)
  assert.deepEqual(await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), face)
  assert.deepEqual((await snapshot(page)).tables, before)
})

for (const policy of ['system', 'device']) test(`initial ${policy} reduction keeps outfit inspection static and available`, async t => {
  const page = await creator(t, { reduced: policy === 'system', device: policy === 'device' }), before = (await snapshot(page)).tables
  await page.getByRole('combobox', { name: 'Preview mood', exact: true }).selectOption('sick')
  const face = await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML))
  await outfit(page).click(); await detail(page).click(); await mirror(page).click(); await page.clock.runFor(2200)
  assert.equal(await clothing(page).count(), 0); assert.equal(await frames(page), 0)
  assert.deepEqual(await art(page).locator('[data-expression]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), face)
  assert.match((await faceGeometry(page)).label, /outfit hidden/)
  assert.deepEqual((await snapshot(page)).tables, before)
})
