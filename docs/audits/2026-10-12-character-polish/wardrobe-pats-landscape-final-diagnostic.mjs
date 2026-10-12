import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, seedProgress } from '../../../scripts/browser/helpers.mjs'
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


test('inspect640 landscape item labels with current and prior movement arrangement', async t => {
 const page = await wardrobeApp(t, { viewport: {width:640,height:360} })
 // Reproduce the four-column candidate even after the final layout is built.
 await page.addStyleTag({content:'.wd-grid{grid-template-columns:repeat(4,minmax(0,1fr))}'})
 async function measure(label) {
  const data = await page.evaluate(() => {
   const rect = node => {const r=node.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}
   const text=[...document.querySelectorAll('.wd-tile-name')].find(node=>node.textContent==='Backpack')
   return {side:rect(document.querySelector('.wd-side')),grid:rect(document.querySelector('.wd-grid')),tile:rect(text.parentElement),text:rect(text),naturalText:(()=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=getComputedStyle(text).font;return ctx.measureText(text.textContent).width})(),columns:getComputedStyle(document.querySelector('.wd-grid')).gridTemplateColumns,art:rect(document.querySelector('.wd-preview'))}
  })
  t.diagnostic(JSON.stringify({label,...data}))
  return data
 }
 const current=await measure('current-three-buttons')
 await page.addStyleTag({content:'.wd-motion{display:flex;justify-content:center;width:auto;min-width:auto}.wd-motion .btn{min-width:96px;padding:0 12px;line-height:normal}.wd-motion button:nth-child(2){display:none}'})
 const prior=await measure('prior-two-button-layout')
 assert.ok(current.text.h>18 && prior.text.h>18,'short-word wrap must reproduce with both movement arrangements')
 assert.equal(current.side.w,prior.side.w)
 await page.addStyleTag({content:'.wd-grid{grid-template-columns:repeat(3,minmax(0,1fr))}'})
 const candidate=await measure('three-column-landscape-candidate')
 assert.ok(candidate.text.w>=candidate.naturalText && candidate.text.h<=18)
 assert.ok(candidate.art.h>=80)
})
