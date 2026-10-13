import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

function visibleFraction(node) {
  const box=node.getBoundingClientRect();let left=0,top=0,right=innerWidth,bottom=innerHeight
  for(let parent=node.parentElement;parent;parent=parent.parentElement){
    const style=getComputedStyle(parent),clip=parent.getBoundingClientRect()
    if(/(auto|scroll|hidden|clip)/.test(style.overflowX)){left=Math.max(left,clip.left+parent.clientLeft);right=Math.min(right,clip.left+parent.clientLeft+parent.clientWidth)}
    if(/(auto|scroll|hidden|clip)/.test(style.overflowY)){top=Math.max(top,clip.top+parent.clientTop);bottom=Math.min(bottom,clip.top+parent.clientTop+parent.clientHeight)}
  }
  return Math.max(0,Math.min(right,box.right)-Math.max(left,box.left))*Math.max(0,Math.min(bottom,box.bottom)-Math.max(top,box.top))/(box.width*box.height)
}

for(const percent of [100,200])test(`portrait room keeps the resident readable and preserves content flow at${percent}%text`,async t=>{
  const page=await browserApp(t,{viewport:{width:320,height:640}})
  const saved=(await snapshot(page)).tables,samples=[]
  await page.evaluate(percent=>{document.documentElement.style.fontSize=`${percent}%`},percent)
  for(const viewport of [{width:320,height:640},{width:375,height:664},{width:390,height:664},{width:600,height:800}]){
    await page.setViewportSize(viewport)
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))))
    const geometry=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}}
      return{stage:rect('.home-stage'),scene:rect('.home-scene'),canvas:rect('.home-scene-viewport'),tools:rect('.home-scene-tools'),status:rect('.home-scene-travel-status'),body:rect('.room-pet [data-character-body]'),chores:rect('.home-chores'),scrollWidth:document.documentElement.scrollWidth}
    })
    if(percent===100){
      assert.ok(Math.abs(geometry.stage.height-420)<.5,'default scene preserves its recorded420px stage')
      assert.ok(Math.abs(geometry.canvas.height-282)<.5,'default canvas preserves its recorded282px height')
      assert.ok(Math.abs(geometry.body.width-32.56494)<.1&&Math.abs(geometry.body.height-28.96980)<.1,'default actual character preserves its recorded size')
    }
    assert.ok(geometry.canvas.height>=250,'portrait scene keeps at least250px of canvas after text and controls grow')
    assert.ok(geometry.body.width>=25&&geometry.body.height>=22,`the actual resting character stays readable:${JSON.stringify(geometry.body)}`)
    for(const name of ['scene','canvas','tools','status'])assert.ok(geometry[name].bottom<=geometry.stage.bottom+.5,`${name} remains inside its stage instead of overflowing following content`)
    assert.ok(geometry.chores.y>=Math.max(geometry.canvas.bottom,geometry.status.bottom,geometry.scene.bottom)+8,'following chores stay below all scene contents')
    assert.ok(geometry.scrollWidth<=viewport.width,'portrait home has no horizontal overflow')
    await page.getByRole('button',{name:'Spend time together',exact:true}).click()
    const show=page.getByRole('button',{name:'Show room with Mochi',exact:true})
    await show.focus();await page.keyboard.press('Enter')
    const resident=page.locator('.room-pet')
    assert.equal(await resident.evaluate(node=>node===document.activeElement),true)
    assert.ok(await resident.locator('[data-character-body]').evaluate(visibleFraction)>=.95,'Show room reveals the readable resident through actual clipping ancestors')
    samples.push({viewport,textPercent:percent,...geometry})
    const out=process.env.CHORE_SCENE_READABILITY_CAPTURE_DIR
    if(out&&viewport.width!==600){await mkdir(out,{recursive:true});await page.screenshot({path:join(out,`scene-${viewport.width}-${percent}.png`)})}
    await page.getByRole('button',{name:'Spend time together',exact:true}).click()
  }
  assert.deepEqual((await snapshot(page)).tables,saved)
  const out=process.env.CHORE_SCENE_READABILITY_CAPTURE_DIR
  if(out)await writeFile(join(out,`scene-${percent}.json`),JSON.stringify({samples,scope:'Native resting-character/body/canvas/parent-flow geometry and Showroom keyboard visibility, default/200%root text; unchanged savedtables. No whole-app enlarged-text acceptance.'},null,2)+'\n')
  t.diagnostic(`Chromium${page.context().browser().version()};4narrowstackedlayouts;actualcharacter/canvas/childflow and Showroomfocus;unchanged savedtables.`)
})

test('enlarged portrait scene retains0offscreen/1finite-visible/0deadline resident frames',{timeout:15000},async t=>{
  const page=await browserApp(t,{viewport:{width:320,height:640}})
  await page.addInitScript(()=>{
    const request=requestAnimationFrame,cancel=cancelAnimationFrame;window.__sceneFrames=new Set()
    window.requestAnimationFrame=callback=>{const id=request(now=>{window.__sceneFrames.delete(id);callback(now)});window.__sceneFrames.add(id);return id}
    window.cancelAnimationFrame=id=>{window.__sceneFrames.delete(id);cancel(id)}
  })
  await page.reload();await page.locator('.room-pet').waitFor()
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
  const saved=(await snapshot(page)).tables
  await page.getByRole('button',{name:'Explore together',exact:true}).click()
  await page.getByRole('button',{name:'Spend time together',exact:true}).click()
  const stretch=page.getByRole('button',{name:'Stretch together',exact:true})
  await stretch.scrollIntoViewIfNeeded()
  await page.waitForFunction(()=>document.querySelector('.room-pet').getBoundingClientRect().bottom<0)
  await page.waitForFunction(()=>window.__sceneFrames.size===0)
  await stretch.click()
  const line=await page.locator('.living-room [aria-live="polite"]').textContent();assert.match(line,/stretch/i)
  assert.equal(await page.evaluate(()=>window.__sceneFrames.size),0)
  // Spend1400ms of the2400ms lifetime offscreen. A restarted response cannot
  // finish within the1600ms return window below. Keep real native timing.
  await page.waitForTimeout(1400)
  const show=page.getByRole('button',{name:'Show room with Mochi',exact:true});await show.focus();await page.keyboard.press('Enter')
  await page.waitForFunction(()=>window.__sceneFrames.size===1)
  assert.equal(await page.locator('.room-pet').evaluate(node=>node===document.activeElement),true)
  assert.ok(await page.locator('.room-pet [data-character-body]').evaluate(visibleFraction)>=.95)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(),line)
  await page.waitForFunction(()=>window.__sceneFrames.size===0,null,{timeout:1600})
  assert.equal(await page.locator('.room-pet [data-expression]').getAttribute('data-expression'),'content')
  assert.deepEqual((await snapshot(page)).tables,saved)
  t.diagnostic('Real native observation/deadline, enlarged-text scene:0offscreen→1visible finite response→0originaldeadline;unchanged savedtables.')
})
