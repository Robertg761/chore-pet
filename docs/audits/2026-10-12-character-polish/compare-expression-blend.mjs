// Exact baseline comparisons, one SSR server at a time; no browser or live clocks.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const out = 'docs/audits/2026-10-12-character-polish'
const paths = ['src/character/motion.ts', 'src/character/parts.tsx', 'src/character/species/animatedBody.tsx', 'src/pet/activityMotion.ts']
const baseline = Object.fromEntries(await Promise.all(paths.map(async path => [path,
  await readFile(`${out}/expression-blend-baseline-${path.split('/').at(-1)}.txt`, 'utf8')])))
const current = Object.fromEntries(await Promise.all(paths.map(async path => [path, await readFile(path, 'utf8')])))
const hash = value => createHash('sha256').update(value).digest('hex')
async function sampler(source) {
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const before = await sampler(baseline[paths[0]]), after = await sampler(current[paths[0]])
assert.deepEqual(after.ACTION_MS, before.ACTION_MS)
const speciesList = ['mochi', 'bun', 'sprout'], moods = ['happy', 'content', 'meh', 'scruffy', 'sick']
const phases = [0, .05, .1, .18, .3, .4, .48, .5, .56, .64, .75, .82, .95, 1, 2]
let frames = 0, intermediateSmiles = 0
for (const species of speciesList) for (const mood of moods) for (const action of Object.keys(before.ACTION_MS)) {
  for (const factor of [.5, 1, 2]) for (const reducedMotion of [false, true]) for (const facing of [1, -1]) for (const phase of phases) {
    const durationMs = before.ACTION_MS[action] * factor
    const input = { species, mood, action, durationMs, elapsedMs: phase * durationMs, blinkMs: 9250 + phase * durationMs, distance: phase * 3, facing, reducedMotion }
    const a = before.sampleMotion(input), { pleasedWeight, ...b } = after.sampleMotion(input)
    assert.deepEqual(b, a, `${species}/${mood}/${action}/${factor}/${phase}/${reducedMotion}: all preexisting fields exact`)
    assert.ok(pleasedWeight >= 0 && pleasedWeight <= 1)
    if (a.expression !== 'pleased') assert.equal(pleasedWeight, 0)
    else if (reducedMotion) assert.equal(pleasedWeight, 1)
    else if (pleasedWeight > 0 && pleasedWeight < 1) intermediateSmiles++
    frames++
  }
}
assert.ok(intermediateSmiles > 0)

const neutral = before.sampleMotion({ species: 'bun', mood: 'happy', action: 'idle', elapsedMs: 0, durationMs: 4000, distance: 0, reducedMotion: false })
const scenes = []
for (const species of speciesList) for (const mood of moods) for (const bodyColour of ['#FFD65C', '#38243b']) {
  for (const eyes of ['classic', 'sparkly', 'button', 'lashes']) for (const expression of ['mood', 'alert', 'pleased']) {
    scenes.push({ props: { species, mood, bodyColour, look: { eyes } }, frame: { ...neutral, expression } })
  }
}
for (const species of speciesList) for (const pose of ['idle', 'content', 'meh', 'scruffy', 'sick', 'sleeping', 'cheering']) {
  for (const bodyColour of ['#FFD65C', '#38243b']) for (const eyes of ['classic', 'sparkly', 'button', 'lashes']) {
    for (const expression of ['mood', 'alert', 'pleased']) scenes.push({ props: { species, pose, mood: 'happy', bodyColour, look: { eyes } }, frame: { ...neutral, expression } })
  }
}
for (const species of speciesList) for (const mood of moods) for (const action of ['greet', 'affection', 'celebrate', 'celebrate-big', 'wave']) {
  for (const reducedMotion of [false, true]) for (const phase of [0, .5, 1]) {
    scenes.push({ props: { species, mood, bodyColour: '#38243b', look: { eyes: 'lashes' } }, input: {
      species, mood, action, reducedMotion, elapsedMs: before.ACTION_MS[action] * phase, durationMs: before.ACTION_MS[action], distance: 0,
    } })
  }
}
async function render(label) {
  const server = await createServer({ plugins: [{ name: 'expression-exact-baseline', enforce: 'pre', transform(code, id) {
    const path = id.split('?')[0].replace(`${process.cwd()}/`, '')
    if (label === 'before' && baseline[path] !== undefined) return { code: baseline[path], map: null }
  } }], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
    const sampleMotion = label === 'before' ? before.sampleMotion : after.sampleMotion
    return scenes.map(scene => hash(renderToStaticMarkup(React.createElement('svg', null,
      React.createElement(AnimatedCharacterArt, { ...scene.props, frame: scene.input ? sampleMotion(scene.input) : scene.frame,
        equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }, strokeScale: 1.6 })))))
  } finally { await server.close() }
}
const beforeMarkup = await render('before'), afterMarkup = await render('after')
for (let i = 0; i < scenes.length; i++) assert.equal(afterMarkup[i], beforeMarkup[i], `Exact SVG markup including IDs: ${JSON.stringify(scenes[i])}`)
await writeFile(`${out}/expression-blend-differential.json`, JSON.stringify({ method:
  '40500 numeric samples: all preexisting fields/durations exact; new smile weight bounded and reduced stills retained. 1314 exact dressed SVG comparisons including IDs: legacy omitted weights across species/moods/eye styles/colours/poses; sampled reaction start/peak/end and reduced stills. No live temporal acceptance.',
  frames, intermediateSmiles, exactMarkup: scenes.length,
  baselineSha256: Object.fromEntries(paths.map(path => [path, hash(baseline[path])])),
  sourceSha256: Object.fromEntries(paths.map(path => [path, hash(current[path])])),
  runnerSha256: hash(await readFile(new URL(import.meta.url))),
  markupAggregateSha256: hash(JSON.stringify(beforeMarkup)),
}, null, 2) + '\n')
console.log(`${frames} frames preserve all preexisting fields; ${scenes.length} exact SVG comparisons including IDs; ${intermediateSmiles} intermediate smiles`)
