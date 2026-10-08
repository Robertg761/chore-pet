// Records the in-app demo video (docs/SPEC.md: in-app screen recording only).
//
//   npm run build && npx vite preview --port 4173
//   npm run demo:record            (CAPTIONS=0 for no captions; CHROME=/path/to/chrome if needed)
//
// Plays the sample home on a 390x844 phone. Days pass with Playwright's fake
// clock rather than the dev time panel: completions are never stamped after the
// real date, so catching up only works if the page's real clock moves too.
// Frames come from Chrome's screencast (smooth, about 50 fps) into demo/frames/,
// and ffmpeg (needed on the PATH) times them by their timestamps and scales
// them 2x into docs/media/chore-pet-demo.mp4.
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
const BASE = process.env.URL ?? 'http://localhost:4173/'
const CAPTIONS = process.env.CAPTIONS !== '0'
const DAY = 24 * 60 * 60 * 1000
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
const p = await ctx.newPage()
rmSync('demo/frames', { recursive: true, force: true })
mkdirSync('demo/frames', { recursive: true })
const frames = []
const cdp = await ctx.newCDPSession(p)
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = `demo/frames/${String(frames.length).padStart(5, '0')}.jpg`
  writeFileSync(file, Buffer.from(data, 'base64'))
  frames.push({ file, t: metadata.timestamp })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
// Mid-morning, so the day doesn't roll over while recording.
const start = new Date(); start.setHours(10, 0, 0, 0)
await p.clock.install({ time: start })
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
const wait = (ms) => p.waitForTimeout(ms)
const caption = async (text) => {
  if (!CAPTIONS) return
  await p.evaluate((t) => {
    let el = document.getElementById('__cap')
    if (!el) {
      el = document.createElement('div'); el.id = '__cap'
      Object.assign(el.style, { position: 'fixed', left: '12px', right: '12px', bottom: '72px', zIndex: 99999, padding: '10px 14px', borderRadius: '14px', background: 'rgba(43,30,47,0.9)', color: '#fff', font: '700 15px/1.3 system-ui, sans-serif', textAlign: 'center', pointerEvents: 'none', transition: 'opacity .3s' })
      document.body.appendChild(el)
    }
    el.textContent = t; el.style.opacity = t ? '1' : '0'
  }, text)
}
const tap = async (role, name) => { await p.getByRole(role, { name }).first().tap() }
const tab = async (name) => { await p.getByRole('navigation').getByRole('button', { name }).first().tap() }
const openGifts = async () => {
  for (let i = 0; i < 4; i++) {
    const gift = p.getByRole('button', { name: 'Open it', exact: true })
    if (!(await gift.count())) return
    await gift.tap(); await wait(2200)
    await p.getByRole('button', { name: /^(Put it on|Maybe later)$/ }).first().tap(); await wait(700)
  }
}
const skipDays = async (days) => {
  await p.clock.fastForward(days * DAY)
  await wait(1200)
}

await p.goto(BASE, { waitUntil: 'networkidle' })
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95 })
await caption('Chore Pet: a tiny pet that lives in a home you build')
await wait(2800)
await caption('Jump straight into a sample home')
await wait(1400)
await tap('button', 'Try a sample home')
await caption('Two chores are late, and you can see it: the sink and the bin are stinky')
await wait(5000)
await caption('Mochi notices too, kindly')
await p.getByRole('button', { name: /^Mochi, feeling/ }).tap().catch(() => {})
await wait(3000)

await caption('Do the real chore, then tap Done')
await tap('button', 'Done: Wash the dishes')
await wait(2400)
await caption('Your first chore always earns a gift')
await tap('button', 'Open it')
await wait(2600)
await tap('button', 'Put it on')
await wait(1200)
await caption('A streak starts, right by the health bar')
await tap('button', 'Done: Take out the trash')
await wait(3200)

await caption("Not needed this time? Skip it honestly: it's tidy, but earns nothing")
await tap('button', /All chores/)
await wait(1200)
await p.getByRole('dialog', { name: 'All chores' }).getByRole('button', { name: 'Edit Wipe the table' }).tap()
await wait(1600)
await tap('button', 'Skip this time')
await wait(3200)

await caption('Build mode: every object brings its own chores')
await tab('Build')
await wait(1500)
await p.locator('.tray-scroller').evaluate((el) => el.scrollTo({ left: 520, behavior: 'smooth' }))
await wait(1400)
await tap('button', /^Couch/)
await wait(1200)
await tap('button', 'Place it')
await wait(2800)
await p.getByRole('button', { name: 'Close' }).first().tap().catch(() => {})
await wait(600)
await tap('button', 'Finish')
await wait(1500)

await caption('Three days later…')
await skipDays(3)
await caption('Chores pile up, the room gets messy, and Mochi feels it')
await wait(5000)
await caption('…and another week')
await skipDays(7)
await caption('Mochi is poorly, but pets never die. Catching up brings them back')
await wait(5000)

for (let i = 0; i < 30; i++) {
  const done = p.getByRole('button', { name: /^Done: / })
  if (!(await done.count())) break
  const slow = i < 2
  await caption(slow ? 'Catching up, one chore at a time' : 'Every chore cleans up a bit of the room')
  await done.first().tap()
  await wait(slow ? 1800 : 900)
  await openGifts()
}
// A gift shows a moment after the chore that earned it.
await wait(2600)
await openGifts()
await caption('All caught up: Mochi is back to happy')
await wait(4500)
await openGifts()

await caption('Rewards come only from real chores: 26 to earn')
await tab('Rewards')
await wait(3500)
await caption('Every outfit fits every pet')
await tab('Wardrobe')
await wait(3500)
await caption('Share your home')
await tab('More')
await wait(800)
await tap('button', 'Share your home')
await wait(3000)
await caption('Chore Pet: the real chores get done')
await wait(2800)
await cdp.send('Page.stopScreencast')
const end = Date.now() / 1000
await b.close()
// Each frame lasts until the next one (the last one until the end), so pauses keep their length.
const list = frames.map((f, i) => `file '${f.file.slice('demo/'.length)}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`)
writeFileSync('demo/frames.txt', `${list.join('\n')}\nfile '${frames.at(-1).file.slice('demo/'.length)}'\n`)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'demo/frames.txt',
  '-vf', 'scale=780:1688:flags=lanczos,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', 'docs/media/chore-pet-demo.mp4'])
console.log(`wrote docs/media/chore-pet-demo.mp4 from ${frames.length} frames`, errors.length ? `with page errors: ${errors.join('; ')}` : '')
