// Exact sampler differential, isolated from live playback and browser clocks.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import ts from 'typescript'
const out = 'docs/audits/2026-10-12-character-polish'
const baseline = await readFile(`${out}/smell-follow-baseline.ts.txt`, 'utf8')
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
    const allowed = !reducedMotion && action === 'smell' && mood !== 'sick'
    if (allowed) {
      const { leftAppendage: oldLeft, rightAppendage: oldRight, leftGroundX: oldGroundLeft, rightGroundX: oldGroundRight, ...oldRest } = a, { leftAppendage: newLeft, rightAppendage: newRight, leftGroundX: newGroundLeft, rightGroundX: newGroundRight, ...newRest } = b
      assert.deepEqual(newRest, oldRest, `${species}/${mood}/${action}/${factor}/${phase}: only appendages and horizontal ground contacts may change`)
      assert.equal(b.bodyX + (newGroundLeft ?? 0), 0)
      assert.equal(b.bodyX + (newGroundRight ?? 0), 0)
      if (oldLeft !== newLeft || oldRight !== newRight || oldGroundLeft !== newGroundLeft || oldGroundRight !== newGroundRight) {
        changed++; const key = `${species}/${action}`; changes[key] = (changes[key] ?? 0) + 1
      } else unchanged++
    } else { assert.deepEqual(b, a, `${species}/${mood}/${action}/${factor}/${phase}/${reducedMotion}: exact preservation`); unchanged++ }
    samples++
  }
}
assert.deepEqual(Object.keys(changes).sort(), ['bun/smell', 'mochi/smell', 'sprout/smell'])
assert.ok(changed > 0)
const sha256 = text => createHash('sha256').update(text).digest('hex')
await writeFile(`${out}/smell-follow-differential.json`, JSON.stringify({ method: 'Exact sampled frames across 3 species, 5 moods, 16 actions, 3 durations, 2 motion policies, 2 facings, and 15 phases. Only normal healthy smell appendages and horizontal ground contacts may differ; all other fields, actions, sick/reduced frames and durations are exact. Static numeric checks, not temporal acceptance.', samples, unchanged, changed, changes, sourceSha256: { baseline: sha256(baseline), current: sha256(current), runner: sha256(await readFile(new URL(import.meta.url))) } }, null, 2) + '\n')
console.log(`Compared ${samples} frames;${unchanged} exact;${changed} appendage/ground-contact-only differences`)
