import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, seedProgress, snapshot } from './helpers.mjs'

const out = process.env.CHORE_WARDROBE_REST_CAPTURE_DIR
async function wardrobe(t, species = 'mochi', viewport = { width: 1280, height: 800 }) {
  const page = await browserApp(t, { reducedMotion: 'no-preference', viewport })
  await seedProgress(page, { unlockedItems: ['item:beanie-red', 'item:glasses', 'item:scarf', 'item:backpack'] })
  if (species !== 'mochi') {
    await page.evaluate(species => new Promise((resolve, reject) => {
      const request = indexedDB.open('chore-pet', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), read = store.get('snapshot')
        read.onsuccess = () => { const saved = read.result; Object.values(saved.tables.pets)[0].species = species; store.put(saved, 'snapshot') }
        tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) }
      }
    }), species)
    await page.reload()
  }
  await page.getByRole('button', { name: 'Wardrobe', exact: true }).click()
  await page.getByRole('heading', { name: 'Dress up Mochi' }).waitFor()
  for (const [slot, name] of [['Head', 'Red beanie'], ['Face', 'Round glasses'], ['Neck', 'Scarf'], ['Outfit', 'Overalls'], ['On back', 'Backpack']]) {
    await page.getByRole('tab', { name: slot, exact: true }).click(); await page.getByRole('button', { name, exact: true }).click()
  }
  if (process.env.CHORE_WARDROBE_REST_PROTOTYPE_CSS) await page.addStyleTag({ content: await readFile(process.env.CHORE_WARDROBE_REST_PROTOTYPE_CSS, 'utf8') })
  await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000)
  return page
}
async function feet(preview) {
  return preview.evaluate(node => [...node.querySelectorAll('[data-foot] ellipse')].map(foot => {
    const p = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy')).matrixTransform(foot.getScreenCTM())
    return { x: p.x, y: p.y }
  }))
}
function focusGeometry(node) {
  const r = node.getBoundingClientRect(), style = getComputedStyle(node)
  const ring = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset))
  let left = 0, top = 0, right = innerWidth, bottom = innerHeight
  for (let p = node.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p), b = p.getBoundingClientRect()
    if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { left = Math.max(left, b.left + p.clientLeft); right = Math.min(right, b.left + p.clientLeft + p.clientWidth) }
    if (/(auto|scroll|hidden|clip)/.test(s.overflowY)) { top = Math.max(top, b.top + p.clientTop); bottom = Math.min(bottom, b.top + p.clientTop + p.clientHeight) }
  }
  return { focusVisible: node.matches(':focus-visible'), ring, clear: r.left-ring>=left && r.right+ring<=right && r.top-ring>=top && r.bottom+ring<=bottom }
}
async function capture(page, name, value) {
  if (!out) return
  await mkdir(out, { recursive: true }); await page.screenshot({ path: join(out, `${name}.png`) })
  await writeFile(join(out, `${name}.json`), JSON.stringify(value, null, 2)+'\n')
}
for (const species of ['mochi','bun','sprout']) test(`wardrobe ${species} rests with planted feet, one finite preview and unchanged outfit`, { timeout: 20000 }, async t => {
  const page = await wardrobe(t, species), before = (await snapshot(page)).tables, preview = page.locator('.wd-preview')
  const art = await preview.locator('.ch-animated').elementHandle(), grid = await page.locator('.wd-grid').elementHandle()
  const original = await feet(preview), neutral = await preview.innerHTML()
  await page.evaluate(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__restFrames = new Set()
    window.requestAnimationFrame = fn => { let id; id=request(time=>{ window.__restFrames.delete(id); fn(time) }); window.__restFrames.add(id); return id }
    window.cancelAnimationFrame = id => { window.__restFrames.delete(id); cancel(id) }
  })
  const rest = page.getByRole('button', { name: 'Rest', exact: true })
  assert.equal(await rest.count(), 1, 'wardrobe offers the quiet Rest preview')
  await rest.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(1200)
  const control = page.getByRole('button', { name: 'Stop rest', exact: true }), held = await feet(preview)
  held.forEach((p,i)=>assert.ok(Math.hypot(p.x-original[i].x,p.y-original[i].y)<.05,'rest keeps both actual screen-space foot contacts fixed'))
  assert.equal(await page.evaluate(()=>window.__restFrames.size),1)
  assert.equal(await control.evaluate(n=>n===document.activeElement),true)
  assert.equal(await page.getByRole('button', {name:'Happy',exact:true}).getAttribute('aria-pressed'),'true')
  for (const name of ['Wave','Gentle pats','Hop','Stretch']) assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true)
  assert.match(await preview.locator('[data-character-body]').getAttribute('transform'),/^translate\(0 0\)/)
  assert.equal(await preview.locator('[data-character-accents]').getAttribute('opacity'),'0')
  const arms=await preview.locator('[data-arm]').evaluateAll(nodes=>nodes.map(n=>+n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]))
  assert.ok(arms[0]<-7 && arms[1]>7, 'both arms relax to the quiet stance')
  for (const slot of ['head','face','neck','outfit','back']) assert.equal(await preview.locator(`[data-slot="${slot}"]`).count(),1)
  assert.equal(await preview.locator('.ch-animated').evaluate((n,old)=>n===old,art),true)
  assert.equal(await page.locator('.wd-grid').evaluate((n,old)=>n===old,grid),true)
  const focus=await control.evaluate(focusGeometry); assert.ok(focus.focusVisible&&focus.ring>0&&focus.clear,JSON.stringify(focus))
  await capture(page,`wardrobe-rest-${species}`,{species,original,held,arms,focus,browser:page.context().browser().version(),method:'Offline production wardrobe Rest at1200ms; actual screen foot contacts, keyboard focus, stable SVG/grid and one pending animation frame.'})
  await page.clock.runFor(1184); assert.equal(await control.count(),1,'retains its original2400ms deadline')
  await page.clock.runFor(32); assert.equal(await rest.isEnabled(),true); assert.equal(await page.evaluate(()=>window.__restFrames.size),0)
  assert.equal(await preview.innerHTML(),neutral); assert.deepEqual((await snapshot(page)).tables,before)
})

test('wardrobe Rest rows, text and keyboard outlines fit ordinary and enlarged layouts', { timeout: 30000 }, async t => {
  const page = await wardrobe(t), before=(await snapshot(page)).tables, samples=[]
  for (const [width,height,text] of [[320,568,100],[390,664,100],[640,360,100],[844,390,100],[1280,800,100],[320,568,200],[390,664,200],[640,360,200],[844,390,200],[1280,800,200]]) {
    await page.setViewportSize({width,height}); await page.evaluate(percent=>document.documentElement.style.fontSize=`${percent}%`,text)
    const rest=page.getByRole('button',{name:'Rest',exact:true}); assert.equal(await rest.count(),1)
    // Enter from an actually keyboard-focused sibling; focus() alone doesn't establish modality.
    const stretch=page.getByRole('button',{name:'Stretch',exact:true}); await stretch.focus(); await page.keyboard.press('Tab')
    assert.equal(await rest.evaluate(n=>n===document.activeElement),true)
    await page.keyboard.press('Enter'); await page.clock.runFor(1200)
    const geometry=await page.evaluate(()=>{
      const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
      return {scroll:document.documentElement.scrollWidth,view:innerWidth,art:box(document.querySelector('.wd-preview')),stage:box(document.querySelector('.wd-stage')),controls:[...document.querySelectorAll('.wd-motion button')].map(n=>({...box(n),label:n.textContent,fits:n.scrollWidth<=n.clientWidth}))}
    })
    assert.ok(geometry.scroll<=width,`no horizontal overflow:${JSON.stringify({width,height,text,geometry})}`)
    assert.ok(geometry.art.h>=80,`readable preview:${JSON.stringify({width,height,text,geometry})}`)
    for(const c of geometry.controls){assert.ok(c.w>=44&&c.h>=44,JSON.stringify(c));assert.ok(c.fits,JSON.stringify(c));assert.ok(c.x>=0&&c.right<=width,JSON.stringify(c));assert.ok(c.y>=geometry.stage.y&&c.bottom<=geometry.stage.bottom,JSON.stringify(c))}
    const rows=Object.values(geometry.controls.reduce((a,c)=>{const y=Math.round(c.y);a[y]=(a[y]??0)+1;return a},{}))
    assert.ok(JSON.stringify(rows)==='[3,3]' || text===200 && JSON.stringify(rows)==='[1,1,1,1,1,1]',`balanced rows or a single column for enlarged text:${JSON.stringify({width,height,text,rows})}`)
    const focus=await page.getByRole('button',{name:'Stop rest',exact:true}).evaluate(focusGeometry)
    assert.ok(focus.focusVisible&&focus.ring>0&&focus.clear,JSON.stringify({width,height,text,focus}))
    const sample={width,height,text,geometry,rows,focus};samples.push(sample)
    if(text===100||[320,844].includes(width)) await capture(page,`wardrobe-rest-layout-${width}-${text}`,sample)
    await page.keyboard.press('Enter'); assert.equal(await rest.isEnabled(),true)
  }
  assert.deepEqual((await snapshot(page)).tables,before)
  if(out)await writeFile(join(out,'wardrobe-rest-layouts.json'),JSON.stringify({samples,browser:page.context().browser().version(),method:'Actual native production layout and keyboard focus at100/200%root text. Enlarged controls may use ordinary vertical page scroll.'},null,2)+'\n')
})

for(const policy of ['system','device'])test(`wardrobe Rest live ${policy} reduction settles without replay`, {timeout:20000},async t=>{
  const page=await wardrobe(t,'mochi',{width:320,height:568}),before=(await snapshot(page)).tables,preview=page.locator('.wd-preview')
  await page.getByRole('button',{name:'Rest',exact:true}).click();await page.clock.runFor(1200)
  async function reduce(value){if(policy==='system')await changeReducedMotion(page,value?'reduce':'no-preference');else await page.evaluate(value=>{localStorage.setItem('chore-pet-reduce-motion',value?'on':'off');window.dispatchEvent(new StorageEvent('storage',{key:'chore-pet-reduce-motion',newValue:value?'on':'off',storageArea:localStorage}))},value)}
  await reduce(true);assert.equal(await page.getByRole('button',{name:'Rest',exact:true}).isDisabled(),true)
  const still=await preview.innerHTML();await page.clock.runFor(5000);assert.equal(await preview.innerHTML(),still)
  await reduce(false);assert.equal(await page.getByRole('button',{name:'Rest',exact:true}).isEnabled(),true)
  await page.clock.runFor(1000);assert.equal(await preview.innerHTML(),still);assert.deepEqual((await snapshot(page)).tables,before)
})
