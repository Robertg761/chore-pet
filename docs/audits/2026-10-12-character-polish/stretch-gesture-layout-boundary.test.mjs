import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { browserApp } from '../../../scripts/browser/helpers.mjs'
test('measure the narrow player-control wrapping boundary', async t => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  // Explicit prior candidate makes the diagnostic replayable after the final CSS.
  const prior = await page.addStyleTag({ content: '.pet-play-actions{display:flex}@media(max-width:360px){.pet-play-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}' })
  const samples = []
  async function measure(label) {
    for (const width of [360, 361, 366, 370, 372, 374, 375, 380, 390]) {
      await page.setViewportSize({ width, height: 664 })
      const boxes = await page.locator('.pet-play-actions button').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      }))
      const rows = []
      for (const box of boxes) {
        const index = rows.findIndex(row => Math.abs(row.y - box.y) < .5)
        if (index === -1) rows.push({ y: box.y, count: 1 }); else rows[index].count++
        assert.ok(box.width >= 44 && box.height >= 44)
      }
      samples.push({ label, width, rows: rows.map(row => row.count), boxes })
    }
  }
  await measure('prior360')
  await prior.evaluate(node => node.remove())
  const candidate = await page.addStyleTag({ content: '@media(max-width:374px){.pet-play-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}' })
  await measure('candidate374')
  assert.ok(samples.some(sample => sample.label === 'prior360' && sample.rows.join(',') === '3,1'))
  assert.ok(samples.filter(sample => sample.label === 'candidate374').every(sample => ['2,2', '4'].includes(sample.rows.join(','))))
  await candidate.evaluate(node => node.remove())
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  await writeFile('docs/audits/2026-10-12-character-polish/stretch-gesture-layout-boundary.json', JSON.stringify({
    method: 'Read-only native CSS probe at9phone widths; explicit prior360 breakpoint and candidate374 injection. No app data changes. Measurements only,not final keyboard/focus certification.', samples,
    sourceSha256: { 'src/pet/PetPlay.css': hash(await readFile('src/pet/PetPlay.css')), runner: hash(await readFile(new URL(import.meta.url))) },
  }, null, 2) + '\n')
  t.diagnostic(JSON.stringify(samples.map(({ label, width, rows }) => ({ label, width, rows }))))
})
