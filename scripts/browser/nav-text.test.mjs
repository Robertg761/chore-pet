import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

for (const large of [false, true]) test(`navigation keeps visible labels and reward progress inside its rail at${large ? 200 : 100}%text`, async t => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 } })
  const saved = (await snapshot(page)).tables, samples = []
  if (large) await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  for (const viewport of [{width:320,height:640},{width:390,height:664},{width:640,height:360},{width:844,height:390},{width:900,height:800},{width:1280,height:800}]) {
    await page.setViewportSize(viewport)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const geometry = await page.getByRole('navigation', { name: 'Main', exact: true }).evaluate(nav => {
      const rect = node => { const r = node.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height } }
      const track = nav.querySelector('.app-nav-track'), active = nav.querySelector('[aria-current="page"]')
      const visibleText = [...nav.querySelectorAll('.app-nav-label, .app-nav-note')].filter(node => node.getBoundingClientRect().width > 1).map(node => {
        const range = document.createRange(); range.selectNodeContents(node)
        return { label:node.textContent, badge:node.classList.contains('app-nav-note'), box:rect(node),control:rect(node.closest('button')),
          text:[...range.getClientRects()].map(r => ({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),
          fontSize:parseFloat(getComputedStyle(node).fontSize) }
      })
      return { nav:rect(nav), track:rect(track), pill:rect(nav.querySelector('.app-nav-pill')), icon:rect(active.querySelector('svg')),
        buttons:[...nav.querySelectorAll('.app-nav-tab')].map(node => ({label:node.textContent,box:rect(node)})), visibleText }
    })
    assert.equal(geometry.buttons.length, 5)
    for (const item of geometry.visibleText) {
      assert.equal(item.text.length, 1, `${item.label} remains on one readable line at${viewport.width}px/${large ? 200 : 100}%`)
      for (const text of item.text) {
        assert.ok(text.left >= geometry.nav.left - .5 && text.right <= geometry.nav.right + .5, `${item.label} text stays inside the navigation`)
        const container = item.badge ? item.box : item.control
        assert.ok(text.left >= container.left - .5 && text.right <= container.right + .5 && text.top >= container.top - .5 && text.bottom <= container.bottom + .5,
          `${item.label} text fits its ${item.badge ? 'badge background' : 'control'}:${JSON.stringify(item)}`)
      }
    }
    for (const {label,box} of geometry.buttons) {
      assert.ok(box.width >= 44 && box.height >= 44, `${label} retains44px target`)
      assert.ok(box.left >= geometry.nav.left - .5 && box.right <= geometry.nav.right + .5, `${label} fits rail`)
    }
    for (const side of ['left','right','top','bottom']) assert.ok(Math.abs(geometry.pill[side] - geometry.icon[side]) < .5, 'existing active icon pill follows font/viewport changes')
    const main = page.getByRole('navigation', { name: 'Main', exact: true })
    const tabs = main.locator('.app-nav-tab')
    await tabs.first().focus()
    for (let index=1;index<5;index++) {
      await page.keyboard.press('Tab')
      assert.equal(await tabs.nth(index).evaluate(node => node===document.activeElement && node.matches(':focus-visible')), true)
      const focused = await tabs.nth(index).boundingBox()
      assert.ok(focused.x >= 0 && focused.x + focused.width <= viewport.width && focused.y >= 0 && focused.y + focused.height <= viewport.height, 'keyboard focus scrolls every navigation control into view')
    }
    await page.keyboard.press('Enter')
    await page.getByRole('dialog', {name:'More',exact:true}).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('dialog', {name:'More',exact:true}).waitFor({state:'hidden'})
    samples.push({ viewport, textPercent:large?200:100, ...geometry })
    const out = process.env.CHORE_NAV_TEXT_CAPTURE_DIR
    if (out && [320,844,1280].includes(viewport.width)) {
      await mkdir(out,{recursive:true})
      await page.screenshot({path:join(out,`nav-${viewport.width}-${large?200:100}.png`)})
    }
  }
  assert.deepEqual((await snapshot(page)).tables,saved)
  const out = process.env.CHORE_NAV_TEXT_CAPTURE_DIR
  if (out) await writeFile(join(out,`nav-${large?200:100}.json`),JSON.stringify({samples,scope:'Actual native navigation label/badge/target/pill/focus geometry, keyboard More/Escape and saved tables. Root text enlargement, not browser zoom or whole-app acceptance.'},null,2)+'\n')
  t.diagnostic(`Chromium${page.context().browser().version()};6layouts;visible navigation typography and keyboard controls;unchanged savedtables.`)
})
