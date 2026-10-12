import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out = 'docs/audits/2026-10-12-character-polish'
const baseline = await readFile(`${out}/dust-hand-baseline.ts.txt`, 'utf8'), current = await readFile('src/character/motion.ts', 'utf8')
async function load(source) {
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const before = await load(baseline), after = await load(current)
assert.deepEqual(after.ACTION_MS, before.ACTION_MS)
const phases = [0, .1, .18, .24, .3, .35, .42, .5, .6, .64, .76, .9, .92, 1, 2]
let samples = 0, unchanged = 0, changed = 0
const changes = {}
for (const species of ['mochi', 'bun', 'sprout']) for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick']) {
  for (const action of Object.keys(before.ACTION_MS)) for (const factor of [.5, 1, 2]) for (const reducedMotion of [false, true]) for (const facing of [1, -1]) for (const phase of phases) {
    const durationMs = before.ACTION_MS[action] * factor
    const input = { species, mood, action, durationMs, elapsedMs: phase * durationMs, blinkMs: 9250 + phase * durationMs, distance: phase * 3, facing, reducedMotion }
    const a = before.sampleMotion(input), b = after.sampleMotion(input)
    if (!reducedMotion && action === 'dust') {
      const { rightArm: oldHand, ...oldRest } = a, { rightArm: newHand, ...newRest } = b
      assert.deepEqual(newRest, oldRest, `${species}/${mood}/${factor}/${phase}: only dust rightArm may differ`)
      if (oldHand !== newHand) { changed++; changes[species] = (changes[species] ?? 0) + 1 } else unchanged++
    } else { assert.deepEqual(b, a, `${species}/${mood}/${action}/${factor}/${phase}/${reducedMotion}: exact preservation`); unchanged++ }
    samples++
  }
}
assert.deepEqual(Object.keys(changes).sort(), ['bun', 'mochi', 'sprout'])
const metrics = {}
for (const species of Object.keys(changes)) {
  const measure = module => {
    const angles = Array.from({ length: 1401 }, (_, elapsedMs) => module.sampleMotion({ species, mood: 'happy', action: 'dust', elapsedMs, durationMs: 1400, distance: 0, reducedMotion: false }).rightArm)
    const deltas = angles.slice(1).map((value, i) => value - angles[i]), signs = deltas.filter(value => Math.abs(value) > 1e-5).map(Math.sign)
    return { peakDegrees: Math.max(...angles.map(Math.abs)), speedDegreesPerSecond: Math.max(...deltas.map(Math.abs)) * 1000, directionChanges: signs.filter((sign, i) => i > 0 && sign !== signs[i - 1]).length }
  }
  metrics[species] = { before: measure(before), after: measure(after) }
}
const sha256 = text => createHash('sha256').update(text).digest('hex')
await writeFile(`${out}/dust-hand-differential.json`, JSON.stringify({ method: '43200exact frame comparisons across3species/5moods/16actions/3durations/2policies/2facings/15phases. Only normal dust rightArm may differ;allotherfields/actions/reduced/durations exact. Metrics use1ms happy samples;static/numeric,not temporal acceptance.', samples, unchanged, changed, changes, metrics, sourceSha256: { baseline: sha256(baseline), current: sha256(current), runner: sha256(await readFile(new URL(import.meta.url))) } }, null, 2) + '\n')
console.log(`Compared ${samples} frames;${unchanged} exact;${changed} normal dust hand-only changes`)
