import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion } from './helpers.mjs'

for (const viewport of [{ width: 390, height: 664 }, { width: 1280, height: 800 }]) {
  test(`idle study exposes exact paired blinks with no automatic clock at ${viewport.width}px`, async (t) => {
    const page = await browserApp(t, { reducedMotion: 'no-preference', viewport })
    await page.addInitScript(() => {
      window.__reviewFrames = 0
      const request = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (...args) => { window.__reviewFrames++; return request(...args) }
    })
    const url = new URL(page.url())
    url.search = '?art'
    await page.goto(url.href)
    const review = page.locator('.motion-review')
    await review.getByRole('heading', { name: 'Deterministic motion review' }).waitFor()
    await review.getByRole('combobox', { name: /^Action/ }).selectOption('idle')
    assert.equal(await review.getByLabel('Time scrubber', { exact: true }).getAttribute('max'), '12000')
    assert.match(await review.textContent(), /Action duration: 4000 ms/)
    const times = [
      { species: 'bun', start: 9000 }, { species: 'mochi', start: 7300 }, { species: 'sprout', start: 5700 },
    ]
    for (const { species, start } of times) {
      await review.getByRole('combobox', { name: /^Species/ }).selectOption(species)
      for (const [label, offset, expected] of [['Primary blink', 70, 0.1], ['Between blinks', 170, 1], ['Second blink', 270, 0.1]]) {
        const time = start + offset
        const key = review.getByRole('button', { name: `${label}, ${time} milliseconds`, exact: true })
        await key.focus()
        await page.keyboard.press('Enter')
        assert.equal(await review.getByLabel('Elapsed milliseconds', { exact: true }).inputValue(), String(time))
        assert.equal(await key.evaluate((node) => node === document.activeElement), true)
        const eyes = await review.locator('.motion-review-previews [data-eye-open]').evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-eye-open'))))
        assert.equal(eyes.length, 6)
        eyes.forEach((value) => assert.ok(Math.abs(value - expected) < 1e-9, `${species} ${label}: ${value}`))
      }
    }
    assert.equal(await page.evaluate(() => window.__reviewFrames), 0, 'scrubbing and keyboard comparisons must not schedule playback')
    await review.getByRole('combobox', { name: /^Body color/ }).selectOption('dark')
    await review.getByRole('combobox', { name: /^face slot/ }).selectOption('glasses')
    const bounds = await review.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, 'review must fit the viewport')
    const controls = await review.locator('button, select, input[type="number"], input[type="range"]').evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return { x: rect.x, right: rect.right, height: rect.height }
    }))
    assert.ok(controls.length > 15)
    controls.forEach((rect) => assert.ok(rect.x >= 0 && rect.right <= viewport.width && rect.height >= 44, JSON.stringify(rect)))
    if (process.env.CHORE_PET_CAPTURE_DIR) {
      await mkdir(process.env.CHORE_PET_CAPTURE_DIR, { recursive: true })
      await review.screenshot({ path: join(process.env.CHORE_PET_CAPTURE_DIR, `idle-study-${viewport.width}.png`) })
      await writeFile(join(process.env.CHORE_PET_CAPTURE_DIR, `idle-study-${viewport.width}.json`), JSON.stringify({ viewport, species: 'sprout', elapsedMs: 5970, body: 'dark', face: 'glasses', controls, applicationFrames: await page.evaluate(() => window.__reviewFrames) }, null, 2) + '\n')
    }
    await changeReducedMotion(page, 'reduce')
    const still = await review.locator('.motion-review-previews [data-eye-open]').evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-eye-open'))))
    assert.deepEqual(still, [1, 1, 1, 1, 1, 1])
    await changeReducedMotion(page, 'no-preference')
    assert.equal(await review.getByLabel('Elapsed milliseconds', { exact: true }).inputValue(), '5970')
    assert.equal(await page.evaluate(() => window.__reviewFrames), 0)
    t.diagnostic(`Chromium ${page.context().browser().version()}; isolated offline production preview; no automatic frame requests`)
  })
}
