import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

for (const large of [false, true]) test(`player rows stay balanced and readable with ${large ? '200%' : 'default'} text in narrow panels`, async t => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 } })
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  await page.keyboard.press('Tab')
  if (large) await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  const saved = (await snapshot(page)).tables, samples = []
  const viewports = large ? [{ width: 320, height: 640 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]
    : [{ width: 320, height: 640 }, { width: 375, height: 664 }, { width: 640, height: 360 }, { width: 844, height: 390 }, { width: 900, height: 800 }, { width: 1024, height: 800 }, { width: 1280, height: 800 }]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
    await show.focus()
    const layout = await page.locator('.pet-play').evaluate(node => {
      const boxes = [...node.querySelectorAll('button')].map(button => {
        const box = button.getBoundingClientRect(), range = document.createRange()
        range.selectNodeContents(button)
        const text = range.getBoundingClientRect()
        return { label: button.textContent, x: box.x, y: box.y, width: box.width, height: box.height,
          textFits: text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom }
      })
      const panel = node.getBoundingClientRect(), heading = node.querySelector('.pet-play-heading').getBoundingClientRect()
      return { boxes, width: panel.width, actionsWidth: node.querySelector('.pet-play-actions').getBoundingClientRect().width, heading: { x: heading.x, right: heading.right }, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }
    })
    const actions = layout.boxes.slice(2), rows = []
    for (const box of actions) {
      const row = rows.find(row => Math.abs(row.y - box.y) < .5)
      if (row) row.count++; else rows.push({ y: box.y, count: 1 })
    }
    assert.ok(['1,1,1,1,1', '3,2', '4,1'].includes(rows.map(row => row.count).join(',')), `balanced rows at${viewport.width}px/${large ? 200 : 100}%: ${rows.map(row => row.count)}`)
    if(rows.length===2&&rows[0].count===4)assert.ok(Math.abs(actions.at(-1).width-layout.actionsWidth)<1,'wide Rest together spans the complete action row')
    if(rows.length===2&&rows[0].count===3){
      assert.ok(Math.abs(actions[3].width-actions[4].width)<.5,'the two quiet choices share the second row evenly')
      assert.ok(Math.abs(actions[3].width+actions[4].width+10-layout.actionsWidth)<1,'the quiet row fills the panel')
    }
    for (const box of layout.boxes) {
      assert.ok(box.width >= 44 && box.height >= 44, `${box.label} retains a44px target`)
      assert.ok(box.textFits, `${box.label} text fits at${viewport.width}px/${large ? 200 : 100}%`)
      assert.ok(box.x >= layout.heading.x - .5 && box.x + box.width <= layout.heading.right + .5, `${box.label} stays in its own panel`)
    }
    assert.ok(layout.scrollWidth <= layout.clientWidth + 1, 'the player panel has no horizontal overflow')
    if (!large) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    for (const label of ['Wave', 'Gentle pats', 'Happy hop', 'Stretch together', 'Rest together']) {
      const control = page.getByRole('button', { name: label, exact: true })
      await page.keyboard.press('Tab')
      assert.equal(await control.evaluate(node => node === document.activeElement && node.matches(':focus-visible')), true, 'native tab order retains a visible focus ring')
      const visibleFocus = await control.evaluate(node => {
        const box = node.getBoundingClientRect(), style = getComputedStyle(node), ring = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset))
        let top = 0, bottom = innerHeight
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) {
            const clip = parent.getBoundingClientRect(); top = Math.max(top, clip.top + parent.clientTop); bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight)
          }
        }
        return box.top - ring >= top - .5 && box.bottom + ring <= bottom + .5
      })
      assert.equal(visibleFocus, true, `${label} focus is visible at${viewport.width}px/${large ? 200 : 100}%`)
    }
    samples.push({ viewport, textPercent: large ? 200 : 100, rows: rows.map(row => row.count), ...layout })
    if (process.env.CHORE_PANEL_LAYOUT_CAPTURE_DIR && [320, 375, 844, 1280].includes(viewport.width)) {
      await mkdir(process.env.CHORE_PANEL_LAYOUT_CAPTURE_DIR, { recursive: true })
      await page.screenshot({ path: join(process.env.CHORE_PANEL_LAYOUT_CAPTURE_DIR, `panel-${viewport.width}-${large ? 200 : 100}.png`), fullPage: false })
    }
  }
  assert.deepEqual((await snapshot(page)).tables, saved)
  if (process.env.CHORE_PANEL_LAYOUT_CAPTURE_DIR) await writeFile(join(process.env.CHORE_PANEL_LAYOUT_CAPTURE_DIR, `panel-${large ? 200 : 100}.json`), JSON.stringify({ samples, scope: 'Native player panel rows, actual label rectangles, target and focus bounds; large text changes root font size, not browser zoom or whole-app accessibility certification.' }, null, 2) + '\n')
  t.diagnostic(`Chromium ${page.context().browser().version()}; ${samples.length}layouts; compact3+2/wide4+1/large-text1column, readable targets and focus, unchanged saved tables.`)
})
