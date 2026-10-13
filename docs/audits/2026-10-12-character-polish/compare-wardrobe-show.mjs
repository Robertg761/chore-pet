// Retain exact ordinary wardrobe geometry after adding the cramped-layout view control.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out='docs/audits/2026-10-12-character-polish'
const oldPath=`${out}/wardrobe-rest-native/wardrobe-rest-layouts.json`, newPath=`${out}/wardrobe-show-native/wardrobe-show-default-layouts.json`
const before=JSON.parse(await readFile(oldPath)), after=JSON.parse(await readFile(newPath))
assert.equal(after.samples.length,5)
for(const sample of after.samples){
 const baseline=before.samples.find(x=>x.width===sample.width&&x.height===sample.height&&x.text===100)
 assert.ok(baseline)
 const {x,y,w,h}=baseline.geometry.art
 assert.deepEqual(sample.art,{x,y,width:w,height:h},`ordinary SVG geometry at${sample.width}x${sample.height}`)
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const paths=[oldPath,newPath,'src/screens/WardrobePreview.tsx','src/screens/Wardrobe.css','scripts/browser/wardrobe-show.test.mjs',`${out}/compare-wardrobe-show.mjs`]
await writeFile(`${out}/wardrobe-show-comparison.json`,JSON.stringify({method:'Five final ordinary native wardrobe SVG rectangles exactly match the accepted Batch44 geometry. Does not claim whole-screen or pixel equivalence.',samples:after.samples,sourceAndArtifactSha256:Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(p))])))},null,2)+'\n')
console.log('All five ordinary wardrobe SVG rectangles exactly preserved')
