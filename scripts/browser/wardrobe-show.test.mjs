import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, seedProgress, snapshot } from './helpers.mjs'
const out=process.env.CHORE_WARDROBE_SHOW_CAPTURE_DIR
async function wardrobe(t,viewport,text=200){
 const page=await browserApp(t,{viewport,reducedMotion:'no-preference'})
 await seedProgress(page,{unlockedItems:['item:beanie-red','item:glasses','item:scarf','item:backpack']})
 await page.getByRole('button',{name:'Wardrobe',exact:true}).click();await page.getByRole('heading',{name:'Dress up Mochi'}).waitFor()
 for(const[slot,name]of[['Head','Red beanie'],['Face','Round glasses'],['Neck','Scarf'],['Outfit','Overalls'],['On back','Backpack']]){
  await page.getByRole('tab',{name:slot,exact:true}).click();await page.getByRole('button',{name,exact:true}).click()
 }
 await page.evaluate(text=>document.documentElement.style.fontSize=`${text}%`,text)
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000)
 await page.evaluate(()=>{
  const request=requestAnimationFrame,cancel=cancelAnimationFrame;window.__showFrames=new Set()
  window.requestAnimationFrame=fn=>{let id;id=request(time=>{window.__showFrames.delete(id);fn(time)});window.__showFrames.add(id);return id}
  window.cancelAnimationFrame=id=>{window.__showFrames.delete(id);cancel(id)}
 })
 return page
}
async function geometry(preview){return preview.evaluate(node=>{
 const body=node.querySelector('[data-character-body]'),b=body.getBoundingClientRect(),r=node.getBoundingClientRect(),s=getComputedStyle(node)
 let left=0,right=innerWidth,top=0,bottom=innerHeight
 for(let p=node.parentElement;p;p=p.parentElement){const c=p.getBoundingClientRect(),style=getComputedStyle(p)
  if(/(auto|scroll|hidden|clip)/.test(style.overflowX)){left=Math.max(left,c.left+p.clientLeft);right=Math.min(right,c.left+p.clientLeft+p.clientWidth)}
  if(/(auto|scroll|hidden|clip)/.test(style.overflowY)){top=Math.max(top,c.top+p.clientTop);bottom=Math.min(bottom,c.top+p.clientTop+p.clientHeight)}
 }
 const visible=Math.max(0,Math.min(b.right,right)-Math.max(b.left,left))*Math.max(0,Math.min(b.bottom,bottom)-Math.max(b.top,top))
 const ring=parseFloat(s.outlineWidth),offset=parseFloat(s.outlineOffset)
 return {body:{x:b.x,y:b.y,w:b.width,h:b.height},art:{x:r.x,y:r.y,w:r.width,h:r.height},fraction:b.width*b.height?visible/(b.width*b.height):0,focused:node===document.activeElement,focusVisible:node.matches(':focus-visible'),ring,offset,outlineClear:r.left-ring-offset>=left&&r.right+ring+offset<=right&&r.top-ring-offset>=top&&r.bottom+ring+offset<=bottom,frames:window.__showFrames.size}
})}
async function capture(page,name,value){if(!out)return;await mkdir(out,{recursive:true});await page.screenshot({path:join(out,`${name}.png`)});await writeFile(join(out,`${name}.json`),JSON.stringify(value,null,2)+'\n')}
for(const[width,height]of[[320,568],[390,664],[640,360],[844,390]])test(`Show wardrobe preview preserves the offscreen Rest deadline at${width}x${height}/200%`,{timeout:20000},async t=>{
 const page=await wardrobe(t,{width,height}),preview=page.locator('.wd-preview'),before=(await snapshot(page)).tables
 const art=await preview.locator('.ch-animated').elementHandle(),grid=await page.locator('.wd-grid').elementHandle()
 const rest=page.getByRole('button',{name:'Rest',exact:true});await rest.focus();await page.keyboard.press('Enter');await page.clock.runFor(1400)
 const offscreen=await geometry(preview);assert.ok(offscreen.fraction<.01,`fixture must establish actually offscreen art:${JSON.stringify(offscreen)}`)
 const show=page.getByRole('button',{name:'Show preview of Mochi',exact:true});assert.equal(await show.count(),1,'enlarged wardrobe offers explicit Show preview')
 const frame=await preview.innerHTML();await page.keyboard.press('Tab');assert.equal(await show.evaluate(n=>n===document.activeElement),true)
 await page.keyboard.press('Enter');const visible=await geometry(preview)
 assert.ok(visible.fraction>=.95,JSON.stringify(visible));assert.ok(visible.focused&&visible.focusVisible&&visible.ring>0&&visible.outlineClear,JSON.stringify(visible))
 assert.equal(visible.frames,1);assert.equal(await preview.innerHTML(),frame,'viewing preserves the exact sampled frame')
 assert.equal(await preview.locator('.ch-animated').evaluate((n,old)=>n===old,art),true);assert.equal(await page.locator('.wd-grid').evaluate((n,old)=>n===old,grid),true)
 assert.equal(await page.getByRole('button',{name:'Stop rest',exact:true}).count(),1)
 await capture(page,`wardrobe-show-${width}`,{width,height,text:200,offscreen,visible,browser:page.context().browser().version(),method:'Production native keyboard Show preview during offscreen Rest at1400ms; actual character ink/clipping geometry, SVG focus, stable frame/nodes/tables and original2400ms expiry.'})
 await page.clock.runFor(984);assert.equal(await page.getByRole('button',{name:'Stop rest',exact:true}).count(),1)
 await page.clock.runFor(32);assert.equal(await rest.isEnabled(),true);assert.equal(await page.evaluate(()=>window.__showFrames.size),0,'original deadline expires without replay')
 assert.deepEqual((await snapshot(page)).tables,before)
})
for(const policy of['system','device'])test(`Show wardrobe preview works during ${policy} reduction without starting a clock`,{timeout:20000},async t=>{
 const page=await wardrobe(t,{width:320,height:568}),preview=page.locator('.wd-preview'),before=(await snapshot(page)).tables
 if(policy==='system')await changeReducedMotion(page,'reduce')
 else await page.evaluate(()=>{localStorage.setItem('chore-pet-reduce-motion','on');window.dispatchEvent(new StorageEvent('storage',{key:'chore-pet-reduce-motion',newValue:'on',storageArea:localStorage}))})
 const show=page.getByRole('button',{name:'Show preview of Mochi',exact:true});assert.equal(await show.isEnabled(),true)
 await show.focus();await page.keyboard.press('Space');const visible=await geometry(preview)
 assert.ok(visible.fraction>=.95&&visible.focused&&visible.focusVisible&&visible.ring>0&&visible.outlineClear,JSON.stringify(visible));assert.equal(visible.frames,0)
 const still=await preview.innerHTML();await page.clock.runFor(3000);assert.equal(await preview.innerHTML(),still);assert.deepEqual((await snapshot(page)).tables,before)
 await capture(page,`wardrobe-show-reduced-${policy}`,{policy,visible,browser:page.context().browser().version(),method:'Production native Show preview with settled reduced motion; actual art visibility/focus, zero pending preview frames, unchanged saved tables.'})
})
test('ordinary wardrobe layouts retain their six controls without an extra visible view button',{timeout:20000},async t=>{
 const page=await wardrobe(t,{width:320,height:568},100),samples=[]
 for(const[width,height]of[[320,568],[390,664],[640,360],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});assert.equal(await page.getByRole('button',{name:'Show preview of Mochi',exact:true}).count(),0)
  assert.equal(await page.locator('.wd-motion button:visible').count(),6)
  const art=await page.locator('.wd-preview').boundingBox();assert.ok(art.height>=80)
  samples.push({width,height,art})
 }
 if(out){await mkdir(out,{recursive:true});await writeFile(join(out,'wardrobe-show-default-layouts.json'),JSON.stringify({samples,browser:page.context().browser().version(),method:'Five ordinary layouts; no extra visible Show preview control and readable art.'},null,2)+'\n')}
})
