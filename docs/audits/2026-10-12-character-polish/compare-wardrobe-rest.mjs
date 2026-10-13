// Compare the accepted injected layout with final production geometry and stills.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out = 'docs/audits/2026-10-12-character-polish'
const prototype = `${out}/wardrobe-rest-flow-revised-prototype`, final = `${out}/wardrobe-rest-native`
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const a = JSON.parse(await readFile(`${prototype}/wardrobe-rest-layouts.json`)), b = JSON.parse(await readFile(`${final}/wardrobe-rest-layouts.json`))
assert.equal(a.samples.length, 10); assert.equal(b.samples.length, 10)
const files = {}, stills = []
for (const path of [`${prototype}/wardrobe-rest-layouts.json`, `${final}/wardrobe-rest-layouts.json`]) files[path] = sha(await readFile(path))
for (let i = 0; i < a.samples.length; i++) {
  assert.deepEqual(b.samples[i], a.samples[i], `exact prototype/final geometry: sample ${i}`)
  const { width, text } = b.samples[i]
  if (text === 100 || [320, 844].includes(width)) {
    const name = `wardrobe-rest-layout-${width}-${text}.png`, paths = [`${prototype}/${name}`, `${final}/${name}`]
    const hashes = await Promise.all(paths.map(async path => sha(await readFile(path))))
    paths.forEach((path, n) => { files[path] = hashes[n] })
    stills.push({ width, text, byteExact: hashes[0] === hashes[1] })
  }
}
files['src/screens/Wardrobe.css'] = sha(await readFile('src/screens/Wardrobe.css'))
files['scripts/browser/wardrobe-rest.test.mjs'] = sha(await readFile('scripts/browser/wardrobe-rest.test.mjs'))
files[`${out}/compare-wardrobe-rest.mjs`] = sha(await readFile(new URL(import.meta.url)))
await writeFile(`${out}/wardrobe-rest-comparison.json`, JSON.stringify({ method: 'Ten accepted injected-prototype and final native-production layout/target/label/focus samples compared exactly, plus seven still byte comparisons. Static evidence only; no independent live motion playback.', exactGeometrySamples: b.samples.length, stills, sourceAndArtifactSha256: files }, null, 2)+'\n')
console.log(`${b.samples.length} exact geometry samples; ${stills.filter(x=>x.byteExact).length}/${stills.length} byte-exact stills`)
