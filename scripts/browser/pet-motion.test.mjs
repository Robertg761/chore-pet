import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

// These are production regressions in disposable contexts, with no gallery or
// user browser session. A paused browser clock controls action deadlines.
// Input performance.now() can still lie between the last rendered rAF timestamps.
async function motionApp(t) {
  const page = await browserApp(t, { reducedMotion: 'no-preference', hasTouch: true })
  const origin = new URL(page.url()).origin
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url())
    return /^https?:$/.test(url.protocol) && url.origin !== origin ? route.abort() : route.continue()
  })
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  // Only the ambient choice is fixed. The saved sample and production router,
  // behavior, sampler, renderer, and input handlers remain real.
  await page.addInitScript(() => { Math.random = () => 0.2 })
  await page.reload()
  await page.locator('.room-pet').waitFor()
  await page.clock.runFor(32)
  assert.equal(await page.locator('.room-pet .ch-animated').count(), 1, 'the resident must use sampled production art')
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false)
  t.diagnostic(`Chromium ${page.context().browser().version()}; isolated offline production preview; motion enabled`)
  return page
}

// Inverse projection of the documented 390px room: origin (195,130), tiles
// 42.5 by 21.25, pet scale .33, feet at (100,182), half-tile standing offset.
// Hand-derived fixture geometry, independent of production pathfinding.
function readMotion(pet) {
  const matrix = pet.transform.baseVal.consolidate().matrix
  const x = matrix.e + 100 * matrix.a
  const y = matrix.f + 182 * matrix.d
  const difference = (x - 195) / 21.25
  const sum = (y - 130) / 10.625
  const body = pet.querySelector('[data-character-body]')
  const ground = pet.querySelector('[data-character-ground]')
  const accents = pet.querySelector('[data-character-accents]')
  // Cover the torso's full SVG envelope, then compare actual CSS-pixel movement.
  // Checking corners catches a reset in translation, lean, or squash/stretch.
  const corners = [[45, 40], [155, 40], [45, 182], [155, 182]]
  const project = (matrix) => corners.map(([x, y]) => {
    const point = new DOMPoint(x, y).matrixTransform(matrix)
    return { x: point.x, y: point.y }
  })
  return {
    at: performance.now(),
    x, y, tx: (sum + difference) / 2 - 0.5, ty: (sum - difference) / 2 - 0.5,
    body: body?.getAttribute('transform'), ground: ground?.getAttribute('transform'),
    bodyPoints: project(body.getScreenCTM()), neutralBodyPoints: project(body.parentElement.getScreenCTM()),
    groundOpacity: Number(ground?.getAttribute('opacity')),
    accent: Number(accents?.getAttribute('opacity')),
    accentGroups: pet.querySelectorAll('[data-character-accents]').length,
    accentPaths: accents?.querySelectorAll('path').length,
    animations: [...pet.querySelectorAll('.ch-breathe, .ch-eye')].map((node) => getComputedStyle(node).animationName),
  }
}

const current = (page) => page.locator('.room-pet').evaluate(readMotion)

function torsoDisplacement(from, to) {
  return Math.max(...from.map((point, i) => Math.hypot(point.x - to[i].x, point.y - to[i].y)))
}

function assertBodyContinuous(before, after, message) {
  const pixels = torsoDisplacement(before.bodyPoints, after.bodyPoints)
  assert.ok(pixels < 0.5, `${message}: ${pixels.toFixed(4)} CSS px, limit 0.5`)
  return pixels
}

async function movingFraction(page) {
  const initial = await current(page)
  for (let i = 0; i < 160; i++) {
    await page.clock.runFor(32)
    const state = await current(page)
    const fraction = Math.abs(state.tx - Math.round(state.tx)) + Math.abs(state.ty - Math.round(state.ty))
    if (Math.hypot(state.x - initial.x, state.y - initial.y) > 2 && fraction > 0.2 && fraction < 0.8) return state
  }
  assert.fail('the motion-enabled resident never reached a fractional walking position')
}

for (const key of ['Enter', 'Space']) {
  test(`keyboard ${key} reaches and activates the resident without moving its world position`, async (t) => {
    const page = await motionApp(t)
    const pet = page.getByRole('button', { name: /feeling .+\. Tap to say hi\./ })
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      if (await pet.evaluate((node) => node === document.activeElement)) break
    }
    assert.equal(await pet.evaluate((node) => node === document.activeElement), true, 'pet must be reachable in the tab order')
    assert.equal(await pet.locator('.room-pet-ring').evaluate((node) => getComputedStyle(node).opacity), '1')
    const before = await current(page)
    await page.keyboard.press(key)
    await page.clock.runFor(480)
    const after = await current(page)
    assert.equal(after.x, before.x)
    assert.equal(after.y, before.y)
    assert.notEqual(after.body, before.body, 'activation must produce a sampled reaction')
    assert.ok((await page.locator('.living-room [aria-live="polite"]').textContent()).trim(), 'player response must be announced')
    assert.equal(await pet.evaluate((node) => node === document.activeElement), true)
  })
}

test('twenty rapid taps preserve the character node, bound effects, and allow only one pending reaction', async (t) => {
  const page = await motionApp(t)
  const pet = page.locator('.room-pet')
  const art = await pet.locator('.ch-animated').elementHandle()
  await pet.tap()
  await page.clock.runFor(240)
  const before = await current(page)
  assert.ok(torsoDisplacement(before.bodyPoints, before.neutralBodyPoints) > 1, 'the repeated-tap fixture must start with a visibly articulated torso')
  let maximumJoin = 0
  for (let i = 0; i < 20; i++) {
    const beforeTap = await current(page)
    await pet.tap()
    const state = await current(page)
    assert.equal(await pet.locator('.ch-animated').evaluate((node, original) => node === original, art), true)
    maximumJoin = Math.max(maximumJoin, assertBodyContinuous(beforeTap, state, 'coalesced taps must not restart the sampled action'))
    assert.equal(state.x, before.x)
    assert.equal(state.y, before.y)
    assert.equal(state.accentGroups, 1)
    assert.equal(state.accentPaths, 2)
    await page.clock.runFor(16)
  }
  await page.clock.runFor(1280)
  assert.ok((await current(page)).accent > 0, 'one pending affection response must play')
  await page.clock.runFor(1250)
  const settled = await current(page)
  assert.equal(settled.accent, 0, 'greeting and one affection response must finish within 3.1s')
  assert.match(settled.body, /^translate\(0 0\)/, 'completed reactions must be grounded')
  assert.equal(settled.accentGroups, 1)
  assert.equal(settled.accentPaths, 2)
  t.diagnostic(`maximum coalesced torso join ${maximumJoin.toFixed(4)} CSS px`)
})

test('tap mid-step retains fractional world position and the outgoing body pose', async (t) => {
  const page = await motionApp(t)
  const before = await movingFraction(page)
  await page.locator('.room-pet').focus()
  await page.keyboard.press('Enter')
  const after = await current(page)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 0.8, 'activation must not round the resident back to a grid tile')
  assert.ok(torsoDisplacement(before.bodyPoints, before.neutralBodyPoints) > 1, 'the mid-step fixture must have a visibly articulated outgoing torso')
  const pixels = assertBodyContinuous(before, after, 'the interruption join must retain the sampled outgoing torso')
  t.diagnostic(`mid-step torso join ${pixels.toFixed(4)} CSS px`)
  await page.clock.runFor(160)
  const reaction = await current(page)
  assert.ok(Math.hypot(reaction.x - after.x, reaction.y - after.y) < 0.01, 'reaction must hold the captured fractional origin')
  assert.notEqual(reaction.body, before.body, 'the retained pose must blend into the reaction')
})

test('ambient routes and adjacent gestures stay outside sample furniture in both orientations', async (t) => {
  const page = await motionApp(t)
  const saved = await snapshot(page)
  const dimensions = { counter: [1, 2], sink: [1, 1], dishwasher: [1, 1], fridge: [1, 1],
    stove: [1, 1], trash: [1, 1], recycling: [1, 1], plant: [1, 1], 'dining-table': [2, 2] }
  const solids = Object.values(saved.tables.placed_objects).filter((object) => object.catalogId !== 'rug').map((object) => {
    assert.ok(dimensions[object.catalogId], `unexpected sample solid ${object.catalogId}`)
    const [w, d] = dimensions[object.catalogId]
    return { x: object.tileX, y: object.tileY, w: object.rotation % 2 ? d : w, d: object.rotation % 2 ? w : d, rotation: object.rotation }
  })
  assert.deepEqual([...new Set(solids.map((solid) => solid.rotation))].sort(), [0, 1])
  const positions = new Set()
  const adjacentFrames = []
  for (let i = 0; i < 120; i++) {
    await page.clock.runFor(100)
    const state = await current(page)
    assert.ok(Number.isFinite(state.tx) && Number.isFinite(state.ty))
    assert.ok(state.tx >= -0.002 && state.tx <= 7.002 && state.ty >= -0.002 && state.ty <= 7.002)
    const tx = Math.round(state.tx), ty = Math.round(state.ty)
    assert.ok(!solids.some((solid) => tx >= solid.x && tx < solid.x + solid.w && ty >= solid.y && ty < solid.y + solid.d), `blocked standing tile ${tx},${ty}`)
    positions.add(`${state.tx.toFixed(2)},${state.ty.toFixed(2)}`)
    if (Math.abs(state.tx - tx) + Math.abs(state.ty - ty) < 0.002 && solids.some((solid) =>
      tx >= solid.x - 1 && tx <= solid.x + solid.w && ty >= solid.y - 1 && ty <= solid.y + solid.d)) adjacentFrames.push(state)
  }
  assert.ok(positions.size > 10, 'must actually exercise an ambient route')
  assert.ok(adjacentFrames.length > 8 && new Set(adjacentFrames.map((state) => state.body)).size > 3, 'must exercise articulated gestures beside furniture')
})

async function changeReducedMotion(page, value) {
  await page.evaluate(() => {
    window.__preferenceDelivered = new Promise((resolve) => {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => resolve(event.matches), { once: true })
    })
  })
  await page.emulateMedia({ reducedMotion: value })
  // CDP updates matchMedia.matches before dispatching the native change event.
  // Fake rAF must run after that event, which is the hook's actual input.
  let timeout
  const delivered = await Promise.race([
    page.evaluate(() => window.__preferenceDelivered),
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('native motion preference event was not delivered within 4s')), 4000) }),
  ]).finally(() => clearTimeout(timeout))
  assert.equal(delivered, value === 'reduce')
}

async function assertReducedStill(page) {
  await changeReducedMotion(page, 'reduce')
  await page.clock.runFor(32)
  const reduced = await current(page)
  assert.match(reduced.body, /^translate\(0 0\)/)
  assert.equal(reduced.groundOpacity, 1)
  assert.equal(await page.locator('.room-pet [data-character-ground]').evaluate((node) => node.transform.baseVal.consolidate().matrix.a), 1)
  assert.equal(reduced.accent, 0)
  assert.ok(reduced.animations.every((name) => name === 'none'), 'CSS must not compete with reduced sampled art')
  await page.clock.runFor(240)
  const later = await current(page)
  assert.equal(later.body, reduced.body, 'body must remain still after a live preference change')
  assert.equal(later.ground, reduced.ground, 'shadow must settle without residual displacement')
  assert.equal(later.accent, 0)
  return reduced
}

test('idle resident follows screen-space attention on its existing clock and respects keyboard and reduced motion', async (t) => {
  const page = await motionApp(t)
  const pet = page.locator('.room-pet')
  const eyes = pet.locator('[data-eye-gaze]').first()
  const point = await pet.evaluate((node) => {
    const screen = new DOMPoint(140, 100).matrixTransform(node.getScreenCTM())
    return { x: screen.x, y: screen.y }
  })
  await page.mouse.move(point.x, point.y)
  await page.clock.runFor(160)
  const screenShift = await eyes.evaluate((node) => {
    const before = new DOMPoint(0, 0).matrixTransform(node.parentElement.getScreenCTM())
    const after = new DOMPoint(0, 0).matrixTransform(node.getScreenCTM())
    return { x: after.x - before.x, y: after.y - before.y }
  })
  assert.ok(screenShift.x > 0.1, 'pupils should move toward the pointer in actual screen coordinates')
  assert.ok(screenShift.y < -0.02, 'the elevated pointer should lift the gaze')
  const before = await current(page)
  await page.mouse.move(2, 2)
  await page.clock.runFor(160)
  assert.equal(await eyes.getAttribute('transform'), 'translate(0 0)')
  await pet.focus()
  await page.clock.runFor(160)
  assert.equal(await eyes.getAttribute('transform'), 'translate(0 -1.5)')
  const focused = await current(page)
  assert.equal(focused.x, before.x, 'attention must not move the pet through the room')
  assert.equal(focused.y, before.y)
  await changeReducedMotion(page, 'reduce')
  await page.clock.runFor(32)
  assert.equal(await eyes.getAttribute('transform'), 'translate(0 0)')
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), '')
})

test('changing reduced motion during a walk settles articulation and can restore motion live', async (t) => {
  const page = await motionApp(t)
  await movingFraction(page)
  const reduced = await assertReducedStill(page)
  await changeReducedMotion(page, 'no-preference')
  await page.locator('.room-pet').focus()
  await page.keyboard.press('Enter')
  await page.clock.runFor(480)
  assert.notEqual((await current(page)).body, reduced.body, 'restored preference must enable the next reaction without reload')
})

test('changing reduced motion during chore-celebration landing leaves a grounded still pet', async (t) => {
  const page = await motionApp(t)
  await page.evaluate(() => {
    const live = document.querySelector('.living-room [aria-live="polite"]')
    const observer = new MutationObserver(() => {
      if (!live.textContent.trim()) return
      window.__completionAnnouncedAt = performance.now()
      observer.disconnect()
    })
    observer.observe(live, { subtree: true, childList: true, characterData: true })
  })
  await page.getByRole('button', { name: 'Done: Wash the dishes', exact: true }).click()
  // ChoreList first gives 450ms feedback, then View Transitions commits the
  // completion asynchronously. Start the action phase from its real announcement.
  for (let i = 0; i < 100 && !(await page.evaluate(() => window.__completionAnnouncedAt)); i++) await page.clock.runFor(16)
  const announcedAt = await page.evaluate(() => window.__completionAnnouncedAt)
  assert.ok(Number.isFinite(announcedAt), 'chore completion must reach its polite player announcement within 1.6s')
  const wait = await page.evaluate((at) => at + 756 - performance.now(), announcedAt)
  await page.clock.runFor(Math.max(0, wait))
  const lifted = await current(page)
  assert.ok(lifted.accent > 0, 'chore completion must produce a celebration')
  assert.doesNotMatch(lifted.body, /^translate\(0 0\)/, 'must exercise a visible lift before landing')
  await page.clock.runFor(420)
  const landing = await current(page)
  assert.ok(landing.accent > 0, 'the live preference change must interrupt the active celebration')
  assert.doesNotMatch(landing.body, /^translate\(0 0\)/, 'the preference must change during the descending lift')
  t.diagnostic(`completion announced at ${announcedAt}ms; lift sampled at ${lifted.at}ms; landing at ${landing.at}ms`)
  await assertReducedStill(page)
})
