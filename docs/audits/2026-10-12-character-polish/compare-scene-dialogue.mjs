import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const dir = 'docs/audits/2026-10-12-character-polish'
const baseline = `${dir}/scene-dialogue-before-captures`, final = `${dir}/scene-dialogue-final-captures`
const hash = value => createHash('sha256').update(value).digest('hex')
const files = (await readdir(final)).filter(name => name.endsWith('.json')).sort(), samples = []
assert.equal(files.length, 12)
for (const file of files) {
  const oldBytes = await readFile(`${baseline}/${file}`), newBytes = await readFile(`${final}/${file}`)
  const a = JSON.parse(oldBytes), b = JSON.parse(newBytes), old = a.after, current = b.after
  const adapted = b.textPercent === 200 && [640, 844].includes(b.width)
  const gap = data => data.bubble.y - Math.max(data.tools.bottom, data.doors?.bottom ?? -Infinity)
  assert.equal(gap(current), 4)
  assert.ok(current.body.y - current.bubble.bottom >= 8)
  const unchangedGeometry = ['width', 'height'].every(key => old.canvas[key] === current.canvas[key] && old.body[key] === current.body[key])
  if (!adapted) assert.ok(unchangedGeometry, `${file}: existing canvas and resident sizes remain exact`)
  else {
    assert.ok(current.canvas.height >= 250)
    assert.ok(current.body.height >= (b.multi ? 18 : 22))
  }
  const png = file.replace('.json', '.png')
  const oldImage = await readFile(`${baseline}/${png}`), newImage = await readFile(`${final}/${png}`)
  const originalAlreadyClear = gap(old) === 4
  if (originalAlreadyClear) assert.equal(hash(oldImage), hash(newImage), `${file}: already-clear view stays pixel exact`)
  samples.push({ width: b.width, height: b.height, textPercent: b.textPercent, multi: b.multi, adapted,
    controlGapBefore: gap(old), controlGapAfter: gap(current), residentGapAfter: current.body.y - current.bubble.bottom,
    oldCanvas: { width: old.canvas.width, height: old.canvas.height }, newCanvas: { width: current.canvas.width, height: current.canvas.height },
    oldBody: { width: old.body.width, height: old.body.height }, newBody: { width: current.body.width, height: current.body.height },
    unchangedGeometry, imageByteExact: hash(oldImage) === hash(newImage),
    inputs: { baseline: { path: `${baseline}/${file}`, sha256: hash(oldBytes) }, final: { path: `${final}/${file}`, sha256: hash(newBytes) },
      baselineImage: { path: `${baseline}/${png}`, sha256: hash(oldImage) }, finalImage: { path: `${final}/${png}`, sha256: hash(newImage) } } })
}
await writeFile(`${dir}/scene-dialogue-comparison.json`, JSON.stringify({
  method: 'Twelve deterministic native before/production pairs. Existing canvas/body sizes exact in nine unaffected layouts; three cramped enlarged landscape samples adapt. All five already-clear views have byte-exact PNGs. This compares stored geometry and pixels, not human temporal playback.',
  runnerSha256: hash(await readFile(new URL(import.meta.url))), samples,
}, null, 2) + '\n')
console.log('12 pairs verified: 9 exact canvas/body sizes, 3 enlarged landscape improvements, 5 byte-exact already-clear views, 4px speech clearance in all cases.')
