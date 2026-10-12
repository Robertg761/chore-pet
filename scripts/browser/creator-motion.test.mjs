import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, seedProgress, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_CAPTURE_DIR
async function creatorApp(t, options = {}) {
  const page = await browserApp(t, { reducedMotion: 'no-preference', ...options })
  await seedProgress(page, { unlockedItems: ['item:beanie-red', 'item:glasses', 'item:scarf', 'item:backpack'] })
  await page.getByRole('button', { name: 'Wardrobe', exact: true }).click()
  for (const [slot, name] of [['Head', 'Red beanie'], ['Face', 'Round glasses'], ['Neck', 'Scarf'], ['Outfit', 'Overalls'], ['On back', 'Backpack']]) {
    await page.getByRole('tab', { name: slot, exact: true }).click()
    await page.getByRole('button', { name, exact: true }).click()
  }
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.getByRole('heading', { name: 'Change look', exact: true }).waitFor()
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  return page
}

for (const [width, height] of [[320, 568], [844, 390], [1280, 800]]) {
  test(`creator previews the actual character while keeping face choices visible at ${width}x${height}`, { timeout: 20000 }, async t => {
    const page = await creatorApp(t, { viewport: { width, height } })
    const before = (await snapshot(page)).tables.pets
    const preview = page.locator('.cc-preview'), art = preview.locator('.ch-animated')
    assert.equal(await art.count(), 1)
    const card = await preview.boundingBox()
    await page.getByRole('radio', { name: 'Bun', exact: true }).click()
    await page.clock.runFor(756)
    assert.match(await art.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 -/)
    assert.deepEqual(await preview.boundingBox(), card, 'only the character should hop; its card stays still')
    assert.equal(await preview.evaluate(node => getComputedStyle(node).animationName), 'none')
    for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) assert.equal(await art.locator(`[data-slot="${slot}"]`).count(), 1)
    const geometry = await page.evaluate(() => {
      const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } }
      return { scroll: document.documentElement.scrollWidth, svg: box(document.querySelector('.cc-preview svg')),
        controls: [...document.querySelectorAll('.cc button, .cc input')].filter(node => node.getClientRects().length).map(box) }
    })
    assert.ok(geometry.scroll <= width, 'creator must not overflow horizontally')
    assert.ok(geometry.svg.h >= 60, `character must remain readable: ${JSON.stringify(geometry)}`)
    for (const control of geometry.controls) {
      assert.ok(control.w >= 44 && control.h >= 44, `44px target: ${JSON.stringify(control)}`)
      assert.ok(control.x >= 0 && control.right <= width, `horizontal target bounds: ${JSON.stringify(control)}`)
    }
    if (out) {
      await page.screenshot({ path: join(out, `creator-${width}x${height}.png`) })
      await writeFile(join(out, `creator-${width}x${height}.json`), JSON.stringify({ width, height, geometry, browser: page.context().browser().version(), method: 'Isolated offline production creator, Bun celebration at756ms, all wardrobe slots equipped through real controls.' }, null, 2) + '\n')
    }
    const faceTab = page.getByRole('tab', { name: 'Face', exact: true })
    if (await faceTab.count()) await faceTab.click()
    const eyes = page.getByRole('radio', { name: 'Sparkly', exact: true })
    await eyes.focus(); await page.keyboard.press('Enter')
    const faceBox = await eyes.boundingBox()
    assert.ok(faceBox.y >= 0 && faceBox.y + faceBox.height <= height, 'face options remain reachable through the scrolling panel')
    assert.equal(await eyes.evaluate(node => node === document.activeElement), true)
    assert.equal(await art.locator('[data-expression="happy"]').count(), 1, 'new face choice is visible immediately')
    assert.match(await art.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 0\)/)
    await page.clock.runFor(2200)
    assert.equal(await art.locator('[data-expression="happy"]').count(), 1)
    assert.deepEqual((await snapshot(page)).tables.pets, before, 'look preview remains a draft until Save')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
    const after = Object.values((await snapshot(page)).tables.pets)[0]
    assert.equal(after.species, 'bun')
    assert.equal(after.bodyColour, '#FFFFFF')
    assert.equal(after.eyes, 'sparkly')
    assert.deepEqual(after.equipped, Object.values(before)[0].equipped)
  })
}

test('creator settles live reduction and initial reduction keeps look choices available', { timeout: 20000 }, async t => {
  const page = await creatorApp(t)
  const art = page.locator('.cc-preview .ch-animated')
  await page.getByRole('radio', { name: 'Bun', exact: true }).click()
  await page.clock.runFor(756)
  await changeReducedMotion(page, 'reduce')
  assert.match(await art.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 0\)/)
  const still = await art.innerHTML()
  await changeReducedMotion(page, 'no-preference')
  await page.clock.runFor(2000)
  assert.equal(await art.innerHTML(), still, 'clearing reduced motion must not replay a cancelled preview')
  await changeReducedMotion(page, 'reduce')
  await page.reload()
  await page.getByRole('heading', { name: 'Change look', exact: true }).waitFor()
  await page.getByRole('radio', { name: 'Sprout', exact: true }).click()
  await page.clock.runFor(756)
  assert.match(await art.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 0\)/)
  assert.equal(await page.getByRole('radio', { name: 'Sprout', exact: true }).getAttribute('aria-checked'), 'true')
})
