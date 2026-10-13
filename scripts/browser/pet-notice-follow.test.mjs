import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

const out = process.env.CHORE_NOTICE_FOLLOW_CAPTURE_DIR
for (const { species, selector, limit, speed, visible } of [
  { species: 'mochi', selector: '[data-appendage="knot"] > g', limit: .76, speed: 7, visible: .6 },
  { species: 'bun', selector: '[data-appendage="left-ear"]', limit: 2.41, speed: 21, visible: 2 },
  { species: 'sprout', selector: '[data-appendage="stem"]', limit: .545, speed: 5, visible: .4 },
]) test(`${species} notice review retains one small deflection across both mirrors without a playback clock`, async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } })
  const saved = (await snapshot(page)).tables
  await page.addInitScript(() => {
    window.__noticeFrames = 0
    const request = requestAnimationFrame
    window.requestAnimationFrame = callback => { window.__noticeFrames++; return request(callback) }
  })
  const url = new URL(page.url()); url.search = '?art'
  await page.goto(url.href)
  const review = page.locator('.motion-review')
  await review.getByRole('heading', { name: 'Deterministic motion review' }).waitFor()
  await review.getByRole('combobox', { name: /^Species/ }).selectOption(species)
  await review.getByRole('combobox', { name: /^Action/ }).selectOption('notice')
  for (const [slot, item] of Object.entries({ head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' })) {
    await review.getByRole('combobox', { name: new RegExp(`^${slot} slot`) }).selectOption(item)
  }
  const art = review.locator('.motion-review-previews svg').first(), samples = []
  for (const facing of ['right', 'left']) {
    await review.getByRole('combobox', { name: /^Facing/ }).selectOption(facing)
    for (let elapsed = 0; elapsed <= 600; elapsed += 30) {
      await review.getByLabel('Elapsed milliseconds', { exact: true }).fill(String(elapsed))
      const sample = await art.evaluate((node, selector) => {
        const matrix = node.querySelector(selector).transform.baseVal.consolidate().matrix
        const feet = ['left', 'right'].map(side => {
          const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
          const p = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
            .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
          return { x: p.x, y: p.y }
        })
        return { angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, feet,
          pose: node.querySelector('[data-character-pose]').getAttribute('data-character-pose'),
          mirror: +node.querySelector('[data-review-facing]').getAttribute('data-review-facing') }
      }, selector)
      samples.push({ facing, elapsed, ...sample })
      assert.equal(sample.pose, 'idle')
      assert.equal(sample.mirror, facing === 'left' ? -1 : 1)
      assert.equal(await page.evaluate(() => window.__noticeFrames), 0)
    }
  }
  let maxFootDrift = 0, peak = 0, observedSpeed = 0
  for (const facing of ['right', 'left']) {
    const trace = samples.filter(x => x.facing === facing)
    peak = Math.max(peak, ...trace.map(x => Math.abs(x.angle)))
    observedSpeed = Math.max(observedSpeed, ...trace.slice(1).map((x,i) => Math.abs(x.angle-trace[i].angle) / 30 * 1000))
    trace.forEach(x => x.feet.forEach((p,i) => { maxFootDrift = Math.max(maxFootDrift, Math.hypot(p.x-trace[0].feet[i].x, p.y-trace[0].feet[i].y)) }))
    assert.equal(trace[0].angle, 0); assert.equal(trace.at(-1).angle, 0)
    assert.ok(maxFootDrift < .0001, 'actual SVG contacts remain fixed through the entire upright acknowledgment')
    const signs = trace.filter(x => Math.abs(x.angle) > 1e-6).map(x => Math.sign(x.angle))
    assert.equal(signs.filter((sign,i) => i > 0 && sign !== signs[i-1]).length, 0)
  }
  t.diagnostic(`${species}: actual SVG peak${peak.toFixed(4)}deg/speed${observedSpeed.toFixed(4)}deg/s, foot drift${maxFootDrift};42paused scrub samples,0RAF requests`)
  assert.ok(peak <= limit && peak > visible)
  assert.ok(observedSpeed < speed)
  await review.getByLabel('Elapsed milliseconds', { exact: true }).fill('300')
  if (out) {
    await mkdir(out, { recursive: true })
    await review.screenshot({ path: join(out, `notice-follow-${species}.png`) })
    await writeFile(join(out, `notice-follow-${species}.json`), JSON.stringify({ species, samples, peak, observedSpeed, maxFootDrift,
      method: 'Actual production MotionReview SVG scrubbing,21times at30ms intervals across full600ms for each facing;42paused samples. Sprout measures stem,0.4*leftAppendage. No temporal playback or resident notice path claim.' }, null, 2)+'\n')
  }
  await changeReducedMotion(page, 'reduce')
  assert.equal(await art.locator(selector).evaluate(node => { const m = node.transform.baseVal.consolidate().matrix; return Math.atan2(m.b,m.a) }), 0)
  await changeReducedMotion(page, 'no-preference')
  assert.equal(await review.getByLabel('Elapsed milliseconds', { exact: true }).inputValue(), '300')
  assert.equal(await page.evaluate(() => window.__noticeFrames), 0)
  assert.deepEqual((await snapshot(page)).tables, saved)
})
