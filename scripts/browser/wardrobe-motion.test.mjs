import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, seedProgress, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_CAPTURE_DIR
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

for (const [width, height] of [[320, 568], [390, 664], [844, 390], [1280, 800]]) {
  test(`wardrobe finite previews stay usable and preserve the outfit at ${width}x${height}`, { timeout: 20000 }, async t => {
    const page = await wardrobeApp(t, { viewport: { width, height } })
    const before = (await snapshot(page)).tables.pets
    const preview = page.locator('.wd-preview')
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
        art: box(document.querySelector('.wd-preview')), controls: [...document.querySelectorAll('.wd-motion button, .wd-poses button')].map(box) }
    })
    assert.ok(geometry.scroll <= width, `horizontal overflow: ${JSON.stringify(geometry)}`)
    assert.ok(geometry.art.h >= 80, `preview needs readable height: ${JSON.stringify(geometry)}`)
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
    await page.getByRole('button', { name: 'Hop', exact: true }).click()
    await page.clock.runFor(756)
    assert.match(await preview.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 -/)
    await page.getByRole('button', { name: 'Poorly', exact: true }).click()
    assert.equal(await preview.locator('[data-character-pose="sick"]').count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isEnabled(), true)
    assert.deepEqual((await snapshot(page)).tables.pets, before, 'preview and pose selection must not save pet changes')
  })
}

test('wardrobe live reduced motion settles the preview and does not restart when restored', { timeout: 15000 }, async t => {
  const page = await wardrobeApp(t, { viewport: { width: 320, height: 568 } })
  const preview = page.locator('.wd-preview')
  await page.getByRole('button', { name: 'Hop', exact: true }).click()
  await page.clock.runFor(756)
  await changeReducedMotion(page, 'reduce')
  assert.equal(await page.getByRole('button', { name: 'Hop', exact: true }).isDisabled(), true)
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
