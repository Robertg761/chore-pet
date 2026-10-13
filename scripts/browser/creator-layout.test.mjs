import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_CAPTURE_DIR
const layouts = [[320, 568], [390, 664], [640, 360], [844, 390], [1280, 800]]
async function creatorApp(t, viewport, textPercent = 100) {
  const page = await browserApp(t, { viewport })
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.getByRole('heading', { name: 'Change look', exact: true }).waitFor()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  if (textPercent !== 100) await page.addStyleTag({ content: `html { font-size: ${textPercent}% !important; }` })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  return page
}
async function geometry(page) {
  return page.evaluate(() => {
    const box = node => {
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }
    }
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      preview: box(document.querySelector('.cc-preview svg')),
      controls: [...document.querySelectorAll('.cc button, .cc input')].filter(node => node.getClientRects().length).map(node => ({
        label: node.getAttribute('aria-label') || node.textContent.trim() || node.id, ...box(node),
        textFits: node.scrollWidth <= node.clientWidth + 1,
      })) }
  })
}
for (const [width, height] of layouts) for (const textPercent of [100, 200]) {
  test(`look editor keeps its character and controls readable at ${width}x${height} text${textPercent}`, { timeout: 25000 }, async t => {
    const page = await creatorApp(t, { width, height }, textPercent)
    const before = (await snapshot(page)).tables
    const data = await geometry(page)
    assert.ok(data.preview.h >= 120, `Preview height: ${JSON.stringify(data.preview)}`)
    assert.ok(data.scrollWidth <= width, 'No horizontal document overflow')
    for (const control of data.controls) {
      assert.ok(control.w >= 44 && control.h >= 44, `44px target: ${JSON.stringify(control)}`)
      assert.ok(control.x >= 0 && control.right <= width, `Horizontal bounds: ${JSON.stringify(control)}`)
      assert.ok(control.textFits, `Text clipping: ${JSON.stringify(control)}`)
    }
    if (out) {
      await page.screenshot({ path: join(out, `creator-${width}x${height}-${textPercent}.png`) })
    }
    const panels = page.locator('.cc-panel')
    assert.equal(await panels.count(), 1)
    const focusedControls = []
    for (const [name, groups] of [['Who', ['Species']], ['Colour', ['Body colour']], ['Face', ['Eyes', 'Cheeks']]]) {
      const tab = page.getByRole('tab', { name, exact: true })
      if (await tab.count()) await tab.click()
      const choices = page.locator(groups.map(group => `.cc-panel [role="radiogroup"][aria-label="${group}"] button`).join(', '))
      for (let i = 0; i < await choices.count(); i++) {
        const control = choices.nth(i)
        if (!await control.isVisible()) continue
        await control.focus()
        const box = await control.boundingBox()
        assert.ok(box.x >= 0 && box.x + box.width <= width + 0.01, `Focused horizontal bounds: ${await control.getAttribute('aria-label')}`)
        assert.ok(box.y >= 0 && box.y + box.height <= height + 0.01, `Focused vertical reachability: ${await control.getAttribute('aria-label')} ${JSON.stringify(box)}`)
        assert.equal(await control.evaluate(node => node === document.activeElement), true)
        assert.ok(box.width >= 44 && box.height >= 44, '44px focused target')
        const textFits = await control.evaluate(node => node.scrollWidth <= node.clientWidth + 1)
        assert.ok(textFits, `Focused text clipping: ${await control.getAttribute('aria-label')}`)
        focusedControls.push({ part: name, label: await control.getAttribute('aria-label'), ...box, textFits })
      }
      if (out && name !== 'Who' && ((textPercent === 200 && [320, 640, 1280].includes(width)) || (textPercent === 100 && width === 640))) {
        await page.screenshot({ path: join(out, `creator-${width}x${height}-${textPercent}-${name.toLowerCase()}.png`) })
      }
    }
    if (out) await writeFile(join(out, `creator-${width}x${height}-${textPercent}.json`), JSON.stringify({ width, height, textPercent, geometry: data, focusedControls,
      browser: page.context().browser().version(), method: 'Offline production editor, 100%/200% root text; initial Who geometry plus each currently visible choice target measured immediately after native focus. Preview height, 44px targets, horizontal bounds, text clipping and viewport reachability asserted; saved tables unchanged. Focus capture stills are sampled controls, not whole-app zoom/AT certification.' }, null, 2) + '\n')
    assert.deepEqual((await snapshot(page)).tables, before, 'Viewing and focusing keeps saved data intact')
  })
}

test('look draft name and caret survive resizing and stay reachable at enlarged text', { timeout: 25000 }, async t => {
  const page = await creatorApp(t, { width: 1280, height: 800 }, 200)
  const before = (await snapshot(page)).tables
  const name = page.getByRole('textbox', { name: 'Name', exact: true })
  await name.fill('Little Sprout')
  await name.evaluate(node => { node.focus(); node.setSelectionRange(2, 7); window.__creatorNameInput = node })
  for (const [width, height] of [[320, 568], [844, 390], [390, 664], [1280, 800]]) {
    await page.setViewportSize({ width, height })
    assert.deepEqual(await name.evaluate(node => ({ same: node === window.__creatorNameInput, focused: node === document.activeElement,
      value: node.value, selection: [node.selectionStart, node.selectionEnd] })), { same: true, focused: true, value: 'Little Sprout', selection: [2, 7] })
    // Native focus can be reapplied without changing the draft or caret to reveal a control after reflow.
    await name.focus()
    const box = await name.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= width + 0.01)
    assert.ok(box.y >= 0 && box.y + box.height <= height + 0.01)
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.deepEqual((await snapshot(page)).tables, before, 'Cancel discards the draft')
})
