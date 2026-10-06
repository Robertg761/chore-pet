// Records the in-app demo video (docs/SPEC.md: in-app screen recording only).
//
//   npm run build && npx vite preview --port 4173
//   npm run demo:record            (CAPTIONS=0 for no captions; CHROME=/path/to/chrome if needed)
//
// Plays the sample home on a 390x844 phone at 2x, using the hidden time panel
// (?dev) to skip days. Writes demo/chore-pet-demo.webm; convert with
//   ffmpeg -i demo/chore-pet-demo.webm -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart chore-pet-demo.mp4
import { chromium } from 'playwright-core'
import { renameSync } from 'node:fs'
const BASE = process.env.URL ?? 'http://localhost:4173/'
const CAPTIONS = process.env.CAPTIONS !== '0'
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' })
const ctx = await b.newContext({
  viewport: { width: 780, height: 1688 }, deviceScaleFactor: 1, hasTouch: true,
  recordVideo: { dir: 'demo', size: { width: 780, height: 1688 } },
})
// Record a 390x844 phone at 2x: zoom the page so layout sees a 390px-wide screen.
await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2' }) })
const p = await ctx.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
const wait = (ms) => p.waitForTimeout(ms)
const caption = async (text) => {
  if (!CAPTIONS) return
  await p.evaluate((t) => {
    let el = document.getElementById('__cap')
    if (!el) {
      el = document.createElement('div'); el.id = '__cap'
      Object.assign(el.style, { position: 'fixed', left: '12px', right: '12px', bottom: '64px', zIndex: 99999, padding: '10px 14px', borderRadius: '14px', background: 'rgba(43,30,47,0.88)', color: '#fff', font: '700 15px/1.3 system-ui, sans-serif', textAlign: 'center', pointerEvents: 'none', transition: 'opacity .3s' })
      document.body.appendChild(el)
    }
    el.textContent = t; el.style.opacity = t ? '1' : '0'
  }, text)
}
const tap = async (role, name) => { await p.getByRole(role, { name }).first().tap(); }
const scrollTo = async (role, name) => { await p.getByRole(role, { name }).first().scrollIntoViewIfNeeded(); await wait(400) }

await p.goto(new URL('?dev', BASE).href, { waitUntil: 'networkidle' })
await tap('button', 'Collapse time panel')
await caption('Chore Pet: a tiny pet that lives in a home you build')
await wait(2500)
await caption('Voters can jump straight into a sample home')
await wait(1500)
await tap('button', 'Try a sample home')
await caption('Two chores are late, and you can see it: the sink and the bin are messy')
await wait(5000)
await caption('Mochi notices the mess too (kindly)')
await p.getByRole('button', { name: /^Mochi, feeling/ }).tap().catch(() => {})
await wait(3000)
await caption('Do the real chore, then tap Done')
await tap('button', 'Mark Wash the dishes done')
await wait(2600)
await caption('Your first chore always earns a gift')
await wait(1500)
await tap('button', 'Open it')
await wait(2500)
await tap('button', 'Put it on')
await caption('')
await wait(1500)
await tap('button', 'Mark Take out the trash done')
await caption('Everything clean, Mochi is happy')
await wait(3500)

await caption('Build mode: every object brings its own chores')
await tap('button', 'Build')
await wait(1500)
await p.getByRole('button', { name: /Couch/ }).first().scrollIntoViewIfNeeded()
await tap('button', /Couch/)
await wait(1200)
await tap('button', 'Place it')
await wait(2500)
await p.getByRole('button', { name: 'Close' }).first().tap().catch(() => {})
await wait(600)
await tap('button', 'Done')
await wait(1500)

await caption('Skipping ahead three days (demo time panel)…')
await p.getByRole('button', { name: /^Open time panel/ }).tap()
await wait(800)
await tap('button', '+3 days')
await tap('button', 'Collapse time panel')
await caption('Chores pile up, the room gets messy, and Mochi feels it')
await wait(5000)
await caption('…and another week')
await p.getByRole('button', { name: /^Open time panel/ }).tap()
await wait(600)
await tap('button', '+1 week')
await tap('button', 'Collapse time panel')
await caption('Mochi is poorly, but pets never die. Catching up brings them back')
await wait(5000)
const openGifts = async () => {
  const gift = p.getByRole('button', { name: 'Open it' })
  if (await gift.count()) { await gift.tap(); await wait(2000); await p.getByRole('button', { name: /Put it on|Lovely/ }).first().tap(); await wait(600) }
}
for (let i = 0; i < 30; i++) {
  const done = p.getByRole('button', { name: /^Mark .* done$/ })
  if (!(await done.count())) break
  const slow = i < 2
  await caption(slow ? 'Catching up, one chore at a time' : 'Every chore cleans up a bit of the room')
  await done.first().tap()
  if (slow) { await wait(600); await p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await wait(1500) } else await wait(450)
  await openGifts()
}
await wait(800)
await openGifts()
await p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
await wait(1200)
await caption('All caught up: Mochi is back to happy')
await wait(4500)

await caption('Unlocked outfits and looks in the wardrobe')
await tap('button', 'Wardrobe')
await wait(3500)
await tap('button', /^(Back|Cancel)$/)
await wait(800)
await caption('Share your home')
await scrollTo('button', 'Share your home')
await tap('button', 'Share your home')
await wait(2500)
await caption('Chore Pet: the real chores get done')
await wait(2500)
await ctx.close()
renameSync(await p.video().path(), 'demo/chore-pet-demo.webm')
console.log('wrote demo/chore-pet-demo.webm', errors.length ? `with page errors: ${errors.join('; ')}` : '')
await b.close()
