import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, seedProgress, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_CAPTURE_DIR
const stretchOut = process.env.CHORE_WARDROBE_STRETCH_CAPTURE_DIR
async function wardrobeApp(t, options = {}) {
  const page = await browserApp(t, { reducedMotion: 'no-preference', ...options })
  await seedProgress(page, { unlockedItems: ['item:beanie-red', 'item:glasses', 'item:scarf', 'item:backpack'] })
  await page.getByRole('button', { name: 'Wardrobe', exact: true }).click()
  await page.getByRole('heading', { name: 'Dress up Mochi' }).waitFor()
  for (const [slot, name] of [['Head', 'Red beanie'], ['Face', 'Round glasses'], ['Neck', 'Scarf'], ['Outfit', 'Overalls'], ['On back', 'Backpack']]) {
    await page.getByRole('tab', { name: slot, exact: true }).click()
    await page.getByRole('button', { name, exact: true }).click()
  }
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  return page
}

function focusClearance(node) {
  const r = node.getBoundingClientRect(), s = getComputedStyle(node)
  const ring = parseFloat(s.outlineWidth) + Math.max(0, parseFloat(s.outlineOffset))
  let left = 0, top = 0, right = innerWidth, bottom = innerHeight
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent), clip = parent.getBoundingClientRect()
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
      left = Math.max(left, clip.left + parent.clientLeft)
      right = Math.min(right, clip.left + parent.clientLeft + parent.clientWidth)
    }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
      top = Math.max(top, clip.top + parent.clientTop)
      bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight)
    }
  }
  return { clear: r.left - ring >= left && r.right + ring <= right && r.top - ring >= top && r.bottom + ring <= bottom,
    labelsFit: [...node.parentElement.children].every(button => button.scrollWidth <= button.clientWidth), ring }
}

async function footContacts(preview) {
  return preview.evaluate(node => [...node.querySelectorAll('[data-foot] ellipse')].map(foot => {
    const point = new DOMPoint(Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy'))).matrixTransform(foot.getScreenCTM())
    return { x: point.x, y: point.y }
  }))
}

for (const [width, height] of [[320, 568], [390, 664], [640, 360], [844, 390], [1280, 800]]) {
  test(`wardrobe finite previews stay usable and preserve the outfit at ${width}x${height}`, { timeout: 20000 }, async t => {
    const page = await wardrobeApp(t, { viewport: { width, height } })
    const before = (await snapshot(page)).tables.pets
    const preview = page.locator('.wd-preview')
    const pats = page.getByRole('button', { name: 'Gentle pats', exact: true })
    assert.equal(await pats.count(), 1, 'wardrobe must preview the gentle player response')
    assert.equal(await page.getByRole('button', { name: 'Stretch', exact: true }).count(), 1, 'wardrobe offers the grounded stretch preview')
    for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) assert.equal(await preview.locator(`[data-slot="${slot}"]`).count(), 1)
    const art = await preview.locator('.ch-animated').elementHandle()
    const grid = await page.locator('.wd-grid').elementHandle()
    const wave = page.getByRole('button', { name: 'Wave', exact: true })
    await wave.focus()
    await page.keyboard.press('Enter')
    await page.clock.runFor(420)
    assert.equal(await page.getByRole('button', { name: 'Stop wave', exact: true }).evaluate(node => node === document.activeElement), true)
    assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isDisabled(), true)
    assert.notEqual(await preview.locator('[data-character-body]').getAttribute('transform'), 'translate(0 0) rotate(0 100 181) translate(100 181) scale(1 1) translate(-100 -181)')
    assert.equal(await page.locator('.wd-grid').evaluate((node, original) => node === original, grid), true)
    assert.equal(await preview.locator('.ch-animated').evaluate((node, original) => node === original, art), true)
    const geometry = await page.evaluate(() => {
      const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } }
      return { width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth,
        art: box(document.querySelector('.wd-preview')), body: box(document.querySelector('.wd-body')),
        stage: box(document.querySelector('.wd-stage')), side: box(document.querySelector('.wd-side')),
        tabs: box(document.querySelector('.wd-tabs')),
        tabButtons: [...document.querySelectorAll('.wd-tabs [role="tab"]')].filter(node => node.offsetWidth && node.offsetHeight).map(box),
        tabLabelsFit: [...document.querySelectorAll('.wd-tabs [role="tab"]')].filter(node => node.offsetWidth && node.offsetHeight)
          .every(node => node.scrollWidth <= node.clientWidth),
        movement: [...document.querySelectorAll('.wd-motion button')].map(box),
        controls: [...document.querySelectorAll('.wd-motion button, .wd-poses button')].map(box) }
    })
    const rowCounts = Object.values(geometry.movement.reduce((rows, control) => {
      const y = Math.round(control.y); rows[y] = (rows[y] ?? 0) + 1; return rows
    }, {}))
    assert.deepEqual(rowCounts, [3, 3], 'six movement controls form two balanced rows for the actual stage width')
    assert.ok(geometry.scroll <= width, `horizontal overflow: ${JSON.stringify(geometry)}`)
    assert.ok(geometry.art.h >= 80, `preview needs readable height: ${JSON.stringify(geometry)}`)
    assert.ok(geometry.tabButtons.length >= 5)
    assert.ok(geometry.tabLabelsFit, 'every wardrobe category label fits inside its button')
    for (const tab of geometry.tabButtons) {
      assert.ok(tab.x >= geometry.tabs.x && tab.right <= geometry.tabs.right,
        `every wardrobe tab must fit its row:${JSON.stringify(geometry)}`)
      assert.ok(tab.w >= 44 && tab.h >= 44, 'wardrobe tabs retain 44px input targets')
    }
    for (const panel of [geometry.stage, geometry.side]) {
      assert.ok(panel.x >= geometry.body.x - 5.5 && panel.right <= geometry.body.right + 5.5,
        `wardrobe panels must fit their layout with the existing 5px scroll padding:${JSON.stringify(geometry)}`)
    }
    assert.ok((await page.getByText('Backpack', { exact: true }).boundingBox()).height <= 18, 'item names must fit without breaking a short word across lines')
    for (const control of geometry.controls) {
      assert.ok(control.w >= 44 && control.h >= 44, `minimum input target: ${JSON.stringify(control)}`)
      assert.ok(control.x >= 0 && control.right <= width && control.y >= 0 && control.bottom <= height, `visible input target: ${JSON.stringify(control)}`)
    }
    assert.ok((await preview.locator('.ch-eye').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationName))).every(name => name === 'none'), 'sampled preview owns its eye motion')
    if (out) {
      await page.screenshot({ path: join(out, `wardrobe-${width}x${height}.png`) })
      await writeFile(join(out, `wardrobe-${width}x${height}.json`), JSON.stringify({ width, height, geometry, browser: page.context().browser().version(), method: 'Isolated offline production wardrobe at wave 420ms; actual CSS layout.' }, null, 2) + '\n')
    }
    await page.clock.runFor(800)
    await page.getByRole('button', { name: 'Wave', exact: true }).waitFor()
    await pats.focus()
    await page.keyboard.press('Enter')
    await page.clock.runFor(800)
    const stopPats = page.getByRole('button', { name: 'Stop pats', exact: true })
    assert.equal(await stopPats.evaluate(node => node === document.activeElement), true)
    assert.equal(await page.getByRole('button', { name: 'Wave', exact: true }).isDisabled(), true)
    assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isDisabled(), true)
    assert.equal(await preview.locator('[data-character-accents]').getAttribute('opacity'), '1')
    for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) assert.equal(await preview.locator(`[data-slot="${slot}"]`).count(), 1)
    assert.equal(await page.locator('.wd-grid').evaluate((node, original) => node === original, grid), true)
    assert.equal(await preview.locator('.ch-animated').evaluate((node, original) => node === original, art), true)
    const focus = await stopPats.evaluate(focusClearance)
    assert.ok(focus.ring > 0 && focus.clear, `pats focus outline must fit clipping ancestors:${JSON.stringify(focus)}`)
    assert.ok(focus.labelsFit, 'all movement labels must fit without horizontal text overflow')
    if (out) await page.screenshot({ path: join(out, `wardrobe-pats-${width}x${height}.png`) })
    await page.clock.runFor(784)
    assert.equal(await page.getByRole('button', { name: 'Stop pats', exact: true }).count(), 1)
    // Deliver the first frame after 1600ms even when reload offsets the rAF grid.
    await page.clock.runFor(32)
    await page.getByRole('button', { name: 'Gentle pats', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Hop', exact: true }).click()
    await page.clock.runFor(756)
    assert.match(await preview.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 -/)
    await page.getByRole('button', { name: 'Poorly', exact: true }).click()
    assert.equal(await preview.locator('[data-character-pose="sick"]').count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isEnabled(), true)
    const stretch = page.getByRole('button', { name: 'Stretch', exact: true })
    await stretch.focus(); await page.keyboard.press('Enter')
    const planted = await footContacts(preview)
    assert.equal(planted.length, 2)
    await page.clock.runFor(1200)
    assert.equal(await page.getByRole('button', { name: 'Happy', exact: true }).getAttribute('aria-pressed'), 'true')
    const stopStretch = page.getByRole('button', { name: 'Stop stretch', exact: true })
    assert.equal(await stopStretch.evaluate(node => node === document.activeElement), true)
    for (const name of ['Wave', 'Gentle pats', 'Hop', 'Rest']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true)
    const stretchedFeet = await footContacts(preview)
    stretchedFeet.forEach((foot, index) => assert.ok(Math.hypot(foot.x - planted[index].x, foot.y - planted[index].y) < .05, 'both stretch feet stay planted in actual screen geometry'))
    assert.match(await preview.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 0\)/)
    const armAngles = await preview.locator('[data-arm]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])))
    assert.equal(armAngles.length, 2)
    assert.ok(armAngles[0] > 20 && armAngles[1] < -20, 'both arms visibly reach the grounded stretch')
    for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) assert.equal(await preview.locator(`[data-slot="${slot}"]`).count(), 1)
    assert.equal(await page.locator('.wd-grid').evaluate((node, original) => node === original, grid), true)
    assert.equal(await preview.locator('.ch-animated').evaluate((node, original) => node === original, art), true)
    const stretchFocus = await stopStretch.evaluate(focusClearance)
    assert.ok(stretchFocus.ring > 0 && stretchFocus.clear && stretchFocus.labelsFit, `stretch control focus/labels fit:${JSON.stringify(stretchFocus)}`)
    if (stretchOut) {
      await mkdir(stretchOut, { recursive: true })
      await page.screenshot({ path: join(stretchOut, `wardrobe-stretch-${width}x${height}.png`) })
      await writeFile(join(stretchOut, `wardrobe-stretch-${width}x${height}.json`), JSON.stringify({ width, height, geometry, rowCounts, planted, stretchedFeet, armAngles, stretchFocus, browser: page.context().browser().version(), method: 'Offline native production wardrobe; sampled stretch at1200ms, actual screen-foot contacts, keyboard focus and stage layout.' }, null, 2) + '\n')
    }
    await page.clock.runFor(1184)
    assert.equal(await stopStretch.count(), 1, 'stretch retains its2400ms deadline')
    await page.clock.runFor(32)
    assert.equal(await page.getByRole('button', { name: 'Stretch', exact: true }).isEnabled(), true)
    assert.deepEqual((await snapshot(page)).tables.pets, before, 'preview and pose selection must not save pet changes')
  })
}

for (const action of ['Hop', 'Gentle pats', 'Stretch', 'Rest', 'Dance']) test(`wardrobe ${action} live reduced motion settles the preview and does not restart when restored`, { timeout: 15000 }, async t => {
  const page = await wardrobeApp(t, { viewport: { width: 320, height: 568 } })
  const preview = page.locator('.wd-preview')
  await page.getByRole('button', { name: action, exact: true }).click()
  await page.clock.runFor(756)
  await changeReducedMotion(page, 'reduce')
  assert.equal(await page.getByRole('button', { name: action, exact: true }).isDisabled(), true)
  assert.ok((await preview.boundingBox()).height >= 60, 'short-phone reduced-motion preview retains the character art\'s 60px reading size')
  assert.match(await preview.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 0\)/)
  const still = await preview.innerHTML()
  await page.clock.runFor(2000)
  assert.equal(await preview.innerHTML(), still)
  await changeReducedMotion(page, 'no-preference')
  await page.getByRole('button', { name: 'Wave', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Wave', exact: true }).isEnabled(), true)
  await page.clock.runFor(500)
  assert.equal(await preview.innerHTML(), still)
})
