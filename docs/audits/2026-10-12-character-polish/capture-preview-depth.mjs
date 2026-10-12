import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
const require = createRequire(`${process.cwd()}/package.json`)
const { createServer } = await import(require.resolve('vite'))
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server'), { Resvg } = require('@resvg/resvg-js'), { JSDOM } = require('jsdom')
const [label, out] = process.argv.slice(2)
if (!['before','after'].includes(label) || !out) throw new Error('usage: runner before|after directory')
await mkdir(out,{recursive:true})
const hash = value => createHash('sha256').update(value).digest('hex')
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
 const { Room } = await server.ssrLoadModule('/src/room/Room.tsx')
 const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
 const { sampleMotion } = await server.ssrLoadModule('/src/character/motion.ts')
 const { PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
 const h=React.createElement, object={id:'shelf',roomId:'room',catalogId:'bookshelf',tileX:5,tileY:5,rotation:0}, cases=[], cells=[]
 const withNS=text=>/<svg\b[^>]*xmlns=/.test(text)?text:text.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"')
 let index=0
 for(const tile of [{tx:6,ty:5},{tx:5,ty:6}])for(const facing of [1,-1])for(const species of ['mochi','bun','sprout']){
  const frame=sampleMotion({species,mood:'happy',action:'dust',elapsedMs:650,durationMs:1400,distance:0,reducedMotion:false})
  const art=h('g',{'data-probe-art':''},h(AnimatedCharacterArt,{species,mood:'happy',bodyColour:'#F7A8BA',strokeScale:PET_STROKE_SCALE,frame,equipped:{head:'beanie-red',face:'glasses',neck:'scarf',outfit:'overalls',back:'backpack'}}))
  const props={room:{floorStyle:'wood',wallStyle:'cream'},objects:[object],stages:{shelf:'messy1'},width:780,selectionMode:'preview',pet:{tile,facing,art}}
  const plain=withNS(renderToStaticMarkup(h(Room,props))), selected=withNS(renderToStaticMarkup(h(Room,{...props,selectedId:'shelf'})))
  const document=new JSDOM(plain,{contentType:'image/svg+xml'}).window.document
  const root=document.documentElement, mask=root.cloneNode(false), pet=root.querySelector('[data-probe-art]').parentElement.parentElement.cloneNode(true)
  pet.querySelector('[data-character-ground]')?.remove();pet.querySelector('[data-character-accents]')?.remove();mask.append(pet)
  const a=new Resvg(plain).render(),b=new Resvg(selected).render(),m=new Resvg(mask.outerHTML).render(),ap=a.pixels,bp=b.pixels,mp=m.pixels
  if(a.width!==m.width||a.height!==m.height)throw new Error('mask dimensions differ')
  let opaque=0, changed=0
  for(let y=1;y<a.height-1;y++)for(let x=1;x<a.width-1;x++){
   let inside=true
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(mp[((y+dy)*a.width+x+dx)*4+3]!==255)inside=false
   if(!inside)continue
   opaque++;const i=(y*a.width+x)*4
   if([0,1,2].some(c=>Math.abs(ap[i+c]-bp[i+c])>1))changed++
  }
  cases.push({species,facing,tile,opaquePetInteriorPixels:opaque,overpaintedPetInteriorPixels:changed})
  const crop=new JSDOM(selected,{contentType:'image/svg+xml'}).window.document.documentElement
  crop.setAttribute('viewBox','130 148 130 130');crop.setAttribute('width','260');crop.setAttribute('height','260')
  const png=new Resvg(crop.outerHTML).render().asPng()
  const x=10+(index%3)*280,y=50+Math.floor(index/3)*300
  cells.push(`<g transform="translate(${x} ${y})"><rect width="270" height="290" rx="8" fill="#fff"/><text x="8" y="18" font-size="12" fill="#33263c">${species}, facing ${facing}, tile ${tile.tx},${tile.ty}</text><image x="5" y="26" width="260" height="260" href="data:image/png;base64,${png.toString('base64')}"/></g>`)
  index++
 }
 const png=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1250"><rect width="850" height="1250" fill="#eee6ef"/><text x="18" y="30" font-size="18" fill="#33263c">Preview floor depth: ${label}</text>${cells.join('')}</svg>`).render().asPng()
 const imagePath=join(out,`preview-depth-${label}.png`);await writeFile(imagePath,png)
 // The default builder is compared byte for byte across this preview-only change.
 const builder=renderToStaticMarkup(h(Room,{room:{floorStyle:'wood',wallStyle:'cream'},objects:[object],selectedId:'shelf',width:780}))
 const sources=['src/room/Room.tsx','src/room/shell/RoomShell.tsx','src/room/shell/geometry.ts','src/character/AnimatedCharacter.tsx','src/character/Character.tsx','src/character/motion.ts']
 const sourceSha256=Object.fromEntries(await Promise.all(sources.map(async p=>[p,hash(await readFile(p))])))
 const metadata={method:'12 dressed species/mirror/front-axis production room crops; opaque eroded pet-mask comparison excludes shadow/accents. Static raster evidence only.',cases,builderSha256:hash(builder),sourceSha256,png:{path:imagePath,sha256:hash(png)}}
 await writeFile(join(out,`preview-depth-${label}.json`),JSON.stringify(metadata,null,2)+'\n')
 console.log(JSON.stringify({cases:cases.length,overpaintedPixels:cases.map(c=>c.overpaintedPetInteriorPixels),builderSha256:metadata.builderSha256}))
}finally{await server.close()}
