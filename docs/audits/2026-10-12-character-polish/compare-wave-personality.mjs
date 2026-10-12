// Exact sampler differential, isolated from live playback and browser clocks.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import ts from 'typescript'
const out = 'docs/audits/2026-10-12-character-polish'
const baseline = await readFile(`${out}/wave-personality-baseline.ts.txt`, 'utf8')
const current = await readFile('src/character/motion.ts', 'utf8')
async function load(source) {
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const before = await load(baseline), after = await load(current)
assert.deepEqual(after.ACTION_MS, before.ACTION_MS)
const phases = [0, .1, .18, .3, .35, .4, .48, .5, .56, .64, .75, .9, .92, 1, 2]
let samples = 0, unchanged = 0, changed = 0
const changes = {}
for (const species of ['mochi', 'bun', 'sprout']) for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick']) {
  for (const action of Object.keys(before.ACTION_MS)) for (const factor of [.5, 1, 2]) for (const reducedMotion of [false, true]) for (const facing of [1, -1]) for (const phase of phases) {
    const durationMs = before.ACTION_MS[action] * factor
    const input = { species, mood, action, durationMs, elapsedMs: phase * durationMs, blinkMs: 9250 + phase * durationMs, distance: phase * 3, facing, reducedMotion }
    const a = before.sampleMotion(input), b = after.sampleMotion(input)
    const allowed = !reducedMotion && species !== 'bun' && ['greet', 'wave'].includes(action)
    if (allowed) {
      const { rightArm: oldArm, ...oldRest } = a, { rightArm: newArm, ...newRest } = b
      assert.deepEqual(newRest, oldRest, `${species}/${mood}/${action}/${factor}/${phase}: only right arm may change`)
      if (oldArm !== newArm) {
        changed++; const key = `${species}/${action}`; changes[key] = (changes[key] ?? 0) + 1
      } else unchanged++
    } else { assert.deepEqual(b, a, `${species}/${mood}/${action}/${factor}/${phase}/${reducedMotion}: exact preservation`); unchanged++ }
    samples++
  }
}
assert.deepEqual(Object.keys(changes).sort(), ['mochi/greet', 'mochi/wave', 'sprout/greet', 'sprout/wave'])
assert.ok(changed > 0)
const sha256 = text => createHash('sha256').update(text).digest('hex')
await writeFile(`${out}/wave-personality-differential.json`, JSON.stringify({ method: 'Exact sampled frames across3species/5moods/15actions/3durations/2motionpolicies/2facings/15phases. Only Mochi/Sprout normal greet/wave rightArm may differ;Bun/allotherfields/reduced/durations exact. Static numeric checks,not temporal acceptance.', samples, unchanged, changed, changes, sourceSha256: { baseline: sha256(baseline), current: sha256(current), runner: sha256(await readFile(new URL(import.meta.url))) } }, null, 2) + '\n')
console.log(`Compared ${samples} frames;${unchanged} exact;${changed} right-arm-only differences`)
