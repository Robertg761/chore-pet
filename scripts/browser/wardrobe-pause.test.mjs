import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, seedProgress, snapshot } from './helpers.mjs'

const out = process.env.CHORE_WARDROBE_PAUSE_CAPTURE_DIR
async function wardrobe(t, { species = 'mochi', width = 1280, height = 800, text = 100 } = {}) {
  const page = await browserApp(t, { viewport: { width, height }, reducedMotion: 'no-preference' })
  await page.evaluate(species => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, pet = Object.values(saved.tables.pets)[0]
        pet.species = species
        pet.equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
        saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), species)
  await page.reload()
  await seedProgress(page, { unlockedItems: ['item:beanie-red', 'item:glasses', 'item:scarf', 'item:backpack'] })
  await page.getByRole('button', { name: 'Wardrobe', exact: true }).click()
  await page.getByRole('heading', { name: 'Dress up Mochi' }).waitFor()
  // Finish the actual screen transition before freezing the animation clock.
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.evaluate(text => { document.documentElement.style.fontSize = `${text}%` }, text)
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.evaluate(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__pauseFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(time => { window.__pauseFrames.delete(id); window.__pauseLastFrame = time; callback(time) })
      window.__pauseFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__pauseFrames.delete(id); cancel(id) }
  })
  return page
}
async function capture(page, name, data) {
  if (!out) return
  await mkdir(out, { recursive: true })
  await page.screenshot({ path: join(out, `${name}.png`) })
  await writeFile(join(out, `${name}.json`), JSON.stringify(data, null, 2) + '\n')
}
async function coordinates(preview) {
  return preview.evaluate(svg => {
    const group = svg.querySelector('[data-preview-facing]'), m = group.transform.baseVal.consolidate()?.matrix
    return { determinant: m ? m.a * m.d - m.b * m.c : 1,
      feet: [...svg.querySelectorAll('[data-foot] ellipse')].map(foot => {
        const p = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
          .matrixTransform(foot.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse())
        return { x: p.x, y: p.y }
      }) }
  })
}
async function geometry(control) {
  return control.evaluate(button => {
    const stage = button.closest('.wd-stage'), preview = stage.querySelector('.wd-preview')
    const ink = preview.querySelector('[data-character-body]') ?? preview.querySelector('.ch-animated')
    const box = node => {
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const b = box(button), a = box(ink), art = box(preview), s = box(stage)
    const side = document.querySelector('.wd-side'), sideBox = box(side), sideClips = /(auto|scroll|hidden|clip)/.test(getComputedStyle(side).overflowY)
    const tabsVisible = [...side.querySelectorAll('[role="tab"]')].every(tab => !sideClips || (box(tab).y >= sideBox.y && box(tab).bottom <= sideBox.bottom))
    const accents = preview.querySelector('[data-character-accents]')
    const accentBoxes = Number(accents?.getAttribute('opacity')) > 0 ? [...accents.children].map(box) : []
    const overlap = Math.max(0, Math.min(b.right, a.right) - Math.max(b.x, a.x)) * Math.max(0, Math.min(b.bottom, a.bottom) - Math.max(b.y, a.y))
    const style = getComputedStyle(button), ring = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)
    const accentOverlap = accentBoxes.reduce((total, r) => total + Math.max(0, Math.min(b.right, r.right) - Math.max(b.x, r.x)) * Math.max(0, Math.min(b.bottom, r.bottom) - Math.max(b.y, r.y)), 0)
    // A rotated SVG group's rectangle includes empty corners. Inspect painted
    // geometry only inside intersecting rectangles; restore exact button styles and SVG event attributes.
    let paintedInkSamples = 0
    if (overlap || accentOverlap) {
      const oldButtonStyle = button.getAttribute('style'), oldAccentEvents = accents?.getAttribute('pointer-events')
      button.style.pointerEvents = 'none'
      if (accentBoxes.length) accents.setAttribute('pointer-events', 'visiblePainted')
      try {
        for (const r of [a, ...accentBoxes]) {
          for (let y = Math.max(b.y, r.y) + .5; y < Math.min(b.bottom, r.bottom); y += 1) {
            for (let x = Math.max(b.x, r.x) + .5; x < Math.min(b.right, r.right); x += 1) {
              const painted = document.elementsFromPoint(x, y).some(hit => {
                const part = hit.closest('[data-character-body], [data-character-accents]')
                if (!part || part.closest('.wd-preview') !== preview) return false
                for (let node = hit; node && node !== preview; node = node.parentElement) {
                  if (Number(getComputedStyle(node).opacity) === 0) return false
                }
                return true
              })
              if (painted) paintedInkSamples++
            }
          }
        }
      } finally {
        button.style.cssText = oldButtonStyle ?? ''
        if (oldButtonStyle === null) button.removeAttribute('style'); else button.setAttribute('style', oldButtonStyle)
        if (accents) {
          if (oldAccentEvents === null) accents.removeAttribute('pointer-events'); else accents.setAttribute('pointer-events', oldAccentEvents)
        }
      }
    }
    return { button: b, ink: a, art, stage: s, overlap, accentOverlap, paintedInkSamples, hitTestGridPx: 1, tabsVisible, sideScrollTop: side.scrollTop, focusVisible: button.matches(':focus-visible'),
      ringClear: b.x - ring >= s.x + 3 && b.right + ring <= s.right - 3 && b.y - ring >= s.y + 3 && b.bottom + ring <= s.bottom - 3,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth, frames: window.__pauseFrames.size }
  })
}

const pauseName = 'Pause movement preview of Mochi', resumeName = 'Resume movement preview of Mochi'
const actions = [
  ['Wave', 'Stop wave', 1200], ['Gentle pats', 'Stop pats', 1600], ['Hop', 'Stop hop', 1800],
  ['Stretch', 'Stop stretch', 2400], ['Rest', 'Stop rest', 2400],
]

test('initial pause control is disabled without starting a clock or shrinking short-phone art', async t => {
  const page = await wardrobe(t, { width: 320, height: 568 })
  const control = page.getByRole('button', { name: pauseName, exact: true })
  await control.waitFor()
  assert.equal(await control.isDisabled(), true)
  const view = await geometry(control)
  await capture(page, 'wardrobe-pause-initial-head', { view, browser: page.context().browser().version() })
  assert.equal(view.frames, 0); assert.equal(view.overlap, 0); assert.equal(view.accentOverlap, 0)
  assert.ok(view.art.height >= 90); assert.ok(view.button.width >= 48 && view.button.height >= 48)
  assert.equal(view.horizontalOverflow, 0)
})

for (const species of ['mochi', 'bun', 'sprout']) test(`dressed ${species} pauses all five previews in both facings and resumes the remaining duration`, async t => {
  const page = await wardrobe(t, { species }), preview = page.locator('.wd-preview')
  await page.getByRole('button', { name: pauseName, exact: true }).waitFor()
  const saved = (await snapshot(page)).tables
  const art = await preview.locator('.ch-animated').elementHandle(), grid = await page.locator('.wd-grid').elementHandle()
  const mirror = page.getByRole('button', { name: 'Mirror preview of Mochi', exact: true }), clearance = []
  for (const [action, stop, duration] of actions) for (const phase of [.25, .5, .75]) {
    const started = await page.evaluate(() => performance.now())
    await page.getByRole('button', { name: action, exact: true }).click()
    await page.clock.runFor(duration * phase)
    const activeElapsed = await page.evaluate(start => window.__pauseLastFrame - start, started)
    const held = await preview.locator('.ch-animated').evaluate(n => n.outerHTML), before = await coordinates(preview)
    const control = page.getByRole('button', { name: pauseName, exact: true })
    await control.focus(); await page.keyboard.press('Enter')
    const resume = page.getByRole('button', { name: resumeName, exact: true })
    assert.equal(await resume.evaluate(n => n.matches(':focus-visible')), true)
    assert.equal(await preview.locator('.ch-animated').evaluate(n => n.outerHTML), held)
    assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
    const normal = { pause: await geometry(resume), mirror: await geometry(mirror) }
    assert.equal(await preview.locator('.ch-animated').evaluate(n => n.outerHTML), held, 'geometry checks restore exact character markup')
    await mirror.focus(); await page.keyboard.press('Space')
    const actual = await preview.locator('.ch-animated').evaluate(n => n.outerHTML)
    if (actual !== held) {
      const first = [...actual].findIndex((char, i) => char !== held[i])
      await capture(page, `wardrobe-pause-diagnostic-${species}-${action.replaceAll(' ', '-')}-${phase}`, {
        species, action, phase, activeElapsed, firstDifference: first, actualSlice: actual.slice(Math.max(0, first-100), first+200), heldSlice: held.slice(Math.max(0, first-100), first+200), actual, held,
        frames: await page.evaluate(() => window.__pauseFrames.size), normal,
      })
    }
    assert.equal(actual, held)
    const flipped = { pause: await geometry(resume), mirror: await geometry(mirror) }, reflected = await coordinates(preview)
    assert.equal(await preview.locator('.ch-animated').evaluate(n => n.outerHTML), held, 'both corners restore exact character markup after mirroring')
    before.feet.forEach((point, i) => {
      assert.ok(Math.abs(reflected.feet[i].x - (200 - point.x)) < .00001)
      assert.ok(Math.abs(reflected.feet[i].y - point.y) < .00001)
    })
    for (const view of [normal.pause, normal.mirror, flipped.pause, flipped.mirror]) {
      assert.equal(view.paintedInkSamples, 0, JSON.stringify({ species, action, phase, view }))
      assert.equal(view.frames, 0)
      assert.ok(view.button.width >= 48 && view.button.height >= 48)
    }
    if (action === 'Rest' && phase === .5) {
      await resume.focus()
      await capture(page, `wardrobe-pause-${species}`, { species, phase, activeElapsed, before, reflected, normal, flipped, browser: page.context().browser().version(), method: 'Native Enter pauses the delivered Rest frame; actual local SVG contacts reflect through Mirror while both corners stay clear. Manual pause owns zero RAF.' })
    }
    await page.clock.runFor(60000)
    assert.equal(await preview.locator('.ch-animated').evaluate(n => n.outerHTML), held)
    assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
    assert.equal(await preview.locator('.ch-animated').evaluate((n, old) => n === old, art), true)
    assert.equal(await page.locator('.wd-grid').evaluate((n, old) => n === old, grid), true)
    await mirror.focus(); await page.keyboard.press('Space')
    await resume.focus(); await page.keyboard.press('Space')
    assert.equal(await preview.locator('.ch-animated').evaluate(n => n.outerHTML), held)
    assert.equal(await page.evaluate(() => window.__pauseFrames.size), 1)
    const remaining = duration - activeElapsed
    await page.clock.runFor(remaining - 24)
    assert.equal(await page.getByRole('button', { name: stop, exact: true }).count(), 1)
    await page.clock.runFor(48)
    assert.equal(await page.getByRole('button', { name: action, exact: true }).isEnabled(), true)
    assert.equal(await page.getByRole('button', { name: pauseName, exact: true }).isDisabled(), true)
    assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
    clearance.push({ action, duration, phase, activeElapsed, remaining, before, reflected, normal, flipped, heldClockAdvanceMs: 60000 })
  }
  assert.deepEqual((await snapshot(page)).tables, saved)
  if (out) await writeFile(join(out, `wardrobe-pause-clearance-${species}.json`), JSON.stringify({ species, samples: clearance, method: '15 separate movement runs per species near .25/.5/.75 delivered phases. Each held60s, exact art/nodes, zero paused RAF, reflected contacts, two corners x two facings =60 geometry views per species; 1px painted hit sampling inside bounds only; SVG pointer-events presentation attributes and exact button inline styles restored. Resume verified at remaining minus24ms and plus24ms, not exact native millisecond delivery. Exact millisecond deadline covered separately by unit tests.' }, null, 2)+'\n')
})

for (const [width, height] of [[320, 568], [390, 664], [640, 360], [844, 390], [1280, 800]]) for (const text of [100, 200]) {
  test(`pause control stays clear and keyboard visible at ${width}x${height}/${text}%`, async t => {
    const page = await wardrobe(t, { width, height, text })
    const control = page.getByRole('button', { name: pauseName, exact: true })
    await control.waitFor()
    await page.getByRole('button', { name: 'Rest', exact: true }).click(); await page.clock.runFor(1200)
    await control.focus(); await page.keyboard.press('Space')
    const resume = page.getByRole('button', { name: resumeName, exact: true }), normal = await geometry(resume)
    const mirror = page.getByRole('button', { name: 'Mirror preview of Mochi', exact: true })
    await mirror.focus(); await page.keyboard.press('Space'); await resume.focus()
    const view = await geometry(resume), mirrorView = await geometry(mirror)
    await capture(page, `wardrobe-pause-layout-${width}-${text}`, { width, height, text, normal, view, mirrorView, browser: page.context().browser().version(), method: 'Native Space pauses Rest at1200ms; text enlargement is root font size rather than browser zoom. Overlay adds no row; paused Rest bounds may include empty tilted corners, so native painted-geometry sampling checks visible ink at both controls.' })
    for (const sample of [normal, view, mirrorView]) {
      assert.equal(sample.paintedInkSamples, 0)
      assert.ok(sample.button.width >= 48 && sample.button.height >= 48)
      assert.equal(sample.ringClear, true); assert.equal(sample.frames, 0); assert.equal(sample.horizontalOverflow, 0)
    }
    assert.equal(view.focusVisible, true); assert.equal(view.tabsVisible, true)
    assert.ok(view.art.height >= 90); assert.equal(await page.locator('.wd-motion button:visible').count(), 5)
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => window.__pauseFrames.size), 1)
    await page.clock.runFor(1248); assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
  })
}

for (const policy of ['system', 'device']) test(`live ${policy} reduction cancels a paused preview without replay`, async t => {
  const page = await wardrobe(t), preview = page.locator('.wd-preview')
  const saved = (await snapshot(page)).tables
  const control = page.getByRole('button', { name: pauseName, exact: true })
  await control.waitFor()
  await page.getByRole('button', { name: 'Rest', exact: true }).click(); await page.clock.runFor(1200)
  await control.click(); assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
  if (policy === 'system') await changeReducedMotion(page, 'reduce')
  else await page.evaluate(() => { localStorage.setItem('chore-pet-reduce-motion', 'on'); window.dispatchEvent(new StorageEvent('storage', { key: 'chore-pet-reduce-motion', newValue: 'on', storageArea: localStorage })) })
  assert.equal(await page.getByRole('button', { name: 'Rest', exact: true }).isDisabled(), true)
  assert.equal(await page.getByRole('button', { name: pauseName, exact: true }).isDisabled(), true)
  assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
  const still = await preview.locator('.ch-animated').evaluate(n => n.outerHTML), view = await geometry(control)
  await capture(page, `wardrobe-pause-reduced-${policy}`, { policy, view, browser: page.context().browser().version(), method: 'Live reduction clears paused run and clock, leaving the static preview. Mirror remains available; restoring preference never resumes.' })
  if (policy === 'system') await changeReducedMotion(page, 'no-preference')
  else await page.evaluate(() => { localStorage.removeItem('chore-pet-reduce-motion'); window.dispatchEvent(new StorageEvent('storage', { key: 'chore-pet-reduce-motion', newValue: null, storageArea: localStorage })) })
  await page.clock.runFor(3000)
  assert.equal(await preview.locator('.ch-animated').evaluate(n => n.outerHTML), still)
  assert.equal(await page.getByRole('button', { name: pauseName, exact: true }).isDisabled(), true)
  assert.equal(await page.evaluate(() => window.__pauseFrames.size), 0)
  assert.deepEqual((await snapshot(page)).tables, saved)
})
