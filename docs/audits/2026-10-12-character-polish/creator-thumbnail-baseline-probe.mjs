import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeFile } from 'node:fs/promises'
import { browserApp, snapshot } from '../../../scripts/browser/helpers.mjs'

for (const width of [390, 1280]) for (const preference of ['normal', 'device', 'system']) {
  test(`thumbnail baseline ${width} ${preference}`, async t => {
    const page = await browserApp(t, { viewport: { width, height: 800 }, reducedMotion: preference === 'system' ? 'reduce' : 'no-preference' })
    if (preference === 'device') {
      await page.evaluate(() => localStorage.setItem('chore-pet-reduce-motion', 'on'))
      await page.reload()
    }
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('button', { name: 'Change look', exact: true }).click()
    await page.waitForFunction(() => !document.documentElement.dataset.vt)
    const before = (await snapshot(page)).tables
    const samples = []
    for (const part of ['Who', 'Face']) {
      const tab = page.getByRole('tab', { name: part, exact: true })
      if (await tab.count()) await tab.click()
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      samples.push(await page.evaluate(part => ({ part,
        images: document.querySelectorAll('.cc-choice svg').length,
        animations: document.getAnimations().filter(a => a.effect?.target?.closest('.cc-choice')).map(a => ({ name: a.animationName, state: a.playState, iterations: a.effect.getTiming().iterations === Infinity ? 'Infinity' : a.effect.getTiming().iterations, group: a.effect.target.closest('[role="radiogroup"]')?.getAttribute('aria-label'), classes: a.effect.target.getAttribute('class') })),
        mainAnimations: document.getAnimations().filter(a => a.effect?.target?.closest('.cc-preview')).length,
      }), part))
    }
    assert.deepEqual((await snapshot(page)).tables, before)
    await writeFile(new URL(`./creator-thumbnail-baseline-${width}-${preference}.json`, import.meta.url), JSON.stringify({ width, preference, browser: page.context().browser().version(), samples, method: 'Read-only native animation inventory, not acceptance test. Real browser clock; finite tab transitions excluded by choice-target filter.' }, null, 2) + '\n')
  })
}
