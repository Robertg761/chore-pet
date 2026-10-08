// Records the in-app demo video (docs/SPEC.md: in-app screen recording only), about 75 s.
//
//   npm run build
//   npm run demo:record          (CHROME=/path/to/chrome if Playwright has no browser of its own)
//
// Writes docs/media/chore-pet-demo.mp4: a 1080 x 1920 portrait video of the sample home playing
// on a phone, with short captions above it. The story, in order: the messy sample home and its
// kind pet; Done, the first gift and the streak; Skip this time; a bathroom from the room pill
// with a toilet and a shower; days pass and the kitchen gets stinky; catching up and the gifts;
// a milestone further on, the Rewards tiers and a tier-two outfit in the wardrobe; the share card.
//
// How it works:
// - The built app (dist/) is served on a free port and shown in an iframe on a small "stage"
//   page that holds the captions and a tap marker. Captions sit outside the phone, so they never
//   cover the health bar or the control being tapped. The stage is rendered at 2x, so the text
//   and the app are sharp. The app runs untouched; only the stage is added.
// - Days pass with Playwright's fake clock (page.clock) rather than the dev time panel:
//   completions are never stamped after the real date, so catching up only works if the page's
//   real clock moves too.
// - One cut: the milestone scene needs a home many chores further on, so the recording pauses
//   while the saved home is moved to chore 89 (scripts/media-common.mjs, seedMilestone) and
//   resumes on the Rewards-ready home. The caption says so.
// - Frames come from Chrome's screencast (smooth, about 30-60 fps) into demo/frames/ and ffmpeg
//   (needed on the PATH, with libx264) times them by their timestamps.
// Set CAPTIONS=0 for no captions, URL=http://localhost:4173/ to use a server that is already running.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { ALL_REWARDS, isolate, launchBrowser, ROOT, seedMilestone, serveApp } from './media-common.mjs'

const CAPTIONS = process.env.CAPTIONS !== '0'
const DAY = 24 * 60 * 60 * 1000
const OUT = `${ROOT}docs/media/chore-pet-demo.mp4`
const FRAMES = `${ROOT}demo/frames`

// The phone (CSS px) and the stage around it. Everything is drawn at 2x: the video is 1080 x 1920.
const PHONE = { w: 390, h: 820 }
const STAGE = { w: 540, h: 960 }
const SCALE = 2

const stageHtml = (appUrl) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Chore Pet demo</title>
<style>
@font-face { font-family: 'Nunito'; font-weight: 400 900; src: url('${appUrl}fonts/nunito-latin.woff2') format('woff2'); }
:root { --ink: #2b1e2f; --ground: #efe9ff; --accent: #6f5cf0; }
html, body { margin: 0; width: ${STAGE.w * SCALE}px; height: ${STAGE.h * SCALE}px; overflow: hidden; background: var(--ground); font-family: 'Nunito', system-ui, sans-serif; }
.stage { position: relative; width: ${STAGE.w}px; height: ${STAGE.h}px; transform: scale(${SCALE}); transform-origin: 0 0; }
.cap { position: absolute; left: 34px; right: 34px; top: 14px; height: 78px; display: flex; align-items: center; justify-content: center;
  box-sizing: border-box; padding: 0 22px; text-align: center; background: #fff; border: 3px solid var(--ink); border-radius: 20px; box-shadow: 0 4px 0 var(--ink);
  color: var(--ink); font-weight: 800; font-size: 23px; line-height: 1.2; text-wrap: balance;
  transition: opacity .22s ease, transform .3s cubic-bezier(.22, 1, .36, 1); }
.cap.off { opacity: 0; transform: translateY(8px) scale(.98); }
.cap.none { display: none; }
.phone { position: absolute; left: ${(STAGE.w - PHONE.w - 16) / 2}px; top: 108px; width: ${PHONE.w}px; height: ${PHONE.h}px;
  border: 8px solid var(--ink); border-radius: 44px; background: var(--ground); overflow: hidden; box-shadow: 0 8px 0 rgba(43, 30, 47, .18); }
iframe { display: block; width: ${PHONE.w}px; height: ${PHONE.h}px; border: 0; }
.tap { position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: rgba(111, 92, 240, .28); border: 3px solid var(--accent); }
.tap.go { animation: tap .55s cubic-bezier(.22, 1, .36, 1); }
@keyframes tap { 0% { opacity: .95; transform: scale(.35); } 70% { opacity: .7; } 100% { opacity: 0; transform: scale(1.25); } }
</style></head>
<body><div class="stage">
<div class="cap off" id="cap"></div>
<div class="phone"><iframe id="app" src="${appUrl}" title="Chore Pet"></iframe></div>
<div class="tap" id="tap"></div>
</div></body></html>`

const app = await serveApp()
const browser = await launchBrowser()
const ctx = await browser.newContext({
  viewport: { width: STAGE.w * SCALE, height: STAGE.h * SCALE },
  hasTouch: true,
  serviceWorkers: 'block',
})
await isolate(ctx)
await ctx.route(`${app.url}__stage.html`, (route) => route.fulfill({ contentType: 'text/html', body: stageHtml(app.url) }))
const stage = await ctx.newPage()
rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })

// Mid-morning, so the day doesn't roll over while recording.
const start = new Date(); start.setHours(10, 0, 0, 0)
await stage.clock.install({ time: start })
const errors = []
stage.on('pageerror', (e) => errors.push(e.message))
stage.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await stage.goto(`${app.url}__stage.html`, { waitUntil: 'load' })
const phone = stage.frames().find((f) => f !== stage.mainFrame())
await phone.getByRole('button', { name: 'Try a sample home' }).waitFor()
await stage.waitForTimeout(800)

// Screencast, with a pause that leaves no gap in the video.
const frames = []
const cdp = await ctx.newCDPSession(stage)
let cut = 0 // seconds of recording left out so far
// Playback speed over the recording (1 is real time, 2 a time-lapse), as changes on the recording's timeline.
const ramps = [{ at: 0, speed: 1 }]
const setSpeed = (speed) => ramps.push({ at: Date.now() / 1000 - cut, speed })
const playTime = (a, b) => ramps.reduce((total, r, i) => {
  const from = Math.max(a, r.at)
  const to = Math.min(b, ramps[i + 1]?.at ?? Infinity)
  return to > from ? total + (to - from) / r.speed : total
}, 0)
let pausedAt = 0
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = `${FRAMES}/${String(frames.length).padStart(5, '0')}.jpg`
  writeFileSync(file, Buffer.from(data, 'base64'))
  // Timestamps can arrive slightly out of order; never let time run backwards.
  frames.push({ file, t: Math.max(metadata.timestamp - cut, frames.at(-1)?.t ?? 0) })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
const startCast = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88 })
const pauseCast = async () => { await cdp.send('Page.stopScreencast'); pausedAt = Date.now() / 1000 }
const resumeCast = async () => { cut += Date.now() / 1000 - pausedAt; await startCast() }

const wait = (ms) => stage.waitForTimeout(ms)
const t0 = Date.now()
const log = (what) => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  ${what}` + (process.env.DEBUG_TIME ? `  (video ${playTime(frames[0]?.t ?? 0, frames.at(-1)?.t ?? 0).toFixed(1)}s)` : ''))

let current = ''
const caption = async (text) => {
  if (!CAPTIONS || text === current) return
  current = text
  await stage.evaluate(() => document.getElementById('cap').classList.add('off'))
  await wait(170)
  await stage.evaluate((t) => {
    const el = document.getElementById('cap')
    el.textContent = t
    el.classList.toggle('none', !t)
    if (t) el.classList.remove('off')
  }, text)
}

// A tap, with a marker where the finger lands. The target is found once, left a moment to stop
// moving (sheets spring in), and then touched directly, which keeps taps quick and the pacing even.
let pressTime = 0
const press = async (locator) => {
  const began = Date.now()
  const target = locator.first()
  await target.waitFor({ state: 'visible' })
  let box = await target.boundingBox()
  for (let i = 0; i < 12; i++) {
    await wait(70)
    const again = await target.boundingBox()
    const still = Math.abs(again.x - box.x) < 0.5 && Math.abs(again.y - box.y) < 0.5
    box = again
    if (still) break
  }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await stage.evaluate(([x, y]) => {
    const el = document.getElementById('tap')
    el.style.left = `${x}px`; el.style.top = `${y}px`
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go')
  }, [x / SCALE, y / SCALE])
  await stage.touchscreen.tap(x, y)
  pressTime += Date.now() - began
}
const tap = (role, name) => press(phone.getByRole(role, { name }))
const tab = (name) => press(phone.getByRole('navigation').getByRole('button', { name }))
const reloadPhone = async () => {
  await phone.evaluate(() => location.reload())
  await wait(600)
  await phone.getByRole('navigation').waitFor()
  await wait(1200)
}

// Open every gift that is waiting: the reveal takes about a second, then wear it or save it for later.
// `quick` is for the later gifts of a run, which go by faster.
const openGifts = async ({ quick = false } = {}) => {
  for (let i = 0; i < 5; i++) {
    const gift = phone.getByRole('button', { name: 'Open it', exact: true })
    if (!(await gift.count())) return
    const before = ramps.at(-1).speed
    setSpeed(quick ? 1.9 : 1)
    await press(gift)
    await wait(1400)
    await press(phone.getByRole('button', { name: /^(Put it on|Maybe later|Lovely!)$/ }))
    await wait(500)
    setSpeed(before)
  }
}
const skipDays = async (days) => {
  await stage.clock.fastForward(days * DAY)
  await wait(1200)
}

try {
// --- 1. Meet the pets -------------------------------------------------------------------
await startCast()
await caption('A tiny pet that lives in a home you build')
await wait(2200)
await press(phone.getByRole('button', { name: 'Try a sample home' }))
log('sample home')
await caption('Late chores show up as mess')
await wait(2600)
await press(phone.getByRole('button', { name: /^Mochi, feeling/ })).catch(() => {})
await caption('The pet notices, kindly')
await wait(1600)

// --- 2. Done, the first gift, the streak -----------------------------------------------
await caption('Do the real chore, then tap Done')
await wait(600)
await tap('button', 'Done: Wash the dishes')
await wait(1200)
await caption('Your first chore earns a gift')
await tap('button', 'Open it')
await wait(1200)
await tap('button', 'Put it on')
await wait(700)
await caption('Keep going and a streak starts')
await tap('button', 'Done: Take out the trash')
await wait(1700)
log('done + streak')

// --- 3. Skip this time -------------------------------------------------------------------
await caption('Not needed today? Skip it, honestly')
await wait(400)
await tap('button', 'Edit Wipe the stove')
await wait(800)
await tap('button', 'Skip this time')
await wait(400)
await caption('A skip keeps things tidy and earns nothing')
await wait(1800)
// The note about it stays for five seconds, and would cover the next screen's tray.
setSpeed(2.5)
await phone.getByText(/^Skipped: /).waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
setSpeed(1)
log('skip')

// --- 4. A bathroom from the room pill ----------------------------------------------------
await caption('Add a room from the room pill')
await tap('button', /^Rooms: Kitchen/)
await wait(1300)
await tap('button', 'Add a bathroom')
await wait(700)
await caption('Every object brings its own chores')
await tap('button', /^Shower/)
await wait(700)
await tap('button', 'Place it')
await wait(1400)
await tap('button', 'Close')
await wait(400)
await tap('button', /^Toilet/)
await wait(500)
await tap('button', 'Place it')
await wait(900)
await tap('button', 'Close')
await wait(300)
await tap('button', 'Finish')
await caption('A shower and a toilet: new chores')
await wait(1900)
log('bathroom')

// --- 5. Days pass -------------------------------------------------------------------------
await caption('Back in the kitchen, three days pass...')
await tap('button', /^Rooms: Bathroom/)
await wait(500)
await tap('button', /^Show the kitchen/)
await wait(800)
await skipDays(3)
await caption('Mess builds up: stink, flies, dust')
await wait(2200)
await caption('A week more, and Mochi is poorly')
await skipDays(7)
await wait(1000)
await caption('Never gone: it always gets better')
await wait(1800)
log('days pass')

// --- 6. Catching up -----------------------------------------------------------------------
await caption('Catch up, one chore at a time')
setSpeed(2.8)
let first = true
for (let i = 0; i < 30; i++) {
  const done = phone.getByRole('button', { name: /^Done: / })
  await openGifts({ quick: !first })
  if (!(await done.count())) break
  await press(done)
  // The gift for a milestone chore appears a moment after the tap.
  await wait(900)
  if (await phone.getByRole('button', { name: 'Open it', exact: true }).count()) {
    await caption(first ? 'Gifts along the way' : 'Gifts along the way')
    await openGifts({ quick: !first })
    first = false
  }
}
await wait(900)
await openGifts({ quick: true })
setSpeed(1)
await caption('All caught up: Mochi is happy again')
await wait(2000)
log('caught up')

// --- 7. Further on: the Rewards tiers and a tier-two outfit -------------------------------
await caption('Fast forward: 89 chores later...')
await wait(500)
await pauseCast()
await skipDays(1)
await seedMilestone(phone, {
  choreCount: 89,
  bestStreak: 21,
  // Everything before chore 90's heart glasses, which the demo then earns on camera.
  unlockedItems: ALL_REWARDS.slice(0, 19),
})
await reloadPhone()
// Chore 90 is done off camera; its gift is waiting when the recording picks up.
await phone.getByRole('button', { name: /^Done: / }).first().tap()
await phone.getByRole('button', { name: 'Open it', exact: true }).waitFor({ timeout: 8000 })
await resumeCast()
await caption('Chore 90 earns heart glasses')
await wait(500)
await openGifts()
// The Undo note covers the bottom of the next screen for a few seconds; let it go first.
setSpeed(2)
await phone.getByText(/^Done: /).waitFor({ state: 'hidden', timeout: 9000 })
setSpeed(1)
await caption('Two tiers of rewards, only from real chores')
await tab('Rewards')
await wait(1500)
await phone.locator('.rewards-grid').first().evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }))
await wait(1600)
await tap('button', /For your home/)
await wait(1500)
log('rewards')

await caption("Dress up in them: chef's hat, heart glasses")
await tab('Wardrobe')
await wait(800)
await press(phone.getByRole('button', { name: /Chef's hat/ }))
await wait(1100)
await tap('tab', /^Face/)
await wait(1700)
log('wardrobe')

// --- 8. Share ---------------------------------------------------------------------------
await caption('Share a picture of your home')
await tab('More')
await wait(500)
await tap('button', 'Share your home')
await wait(2000)
await caption('Chore Pet: the real chores get done')
await wait(1800)
log('end')
if (process.env.DEBUG_TIME) console.log('time spent finding and tapping', (pressTime / 1000).toFixed(1), 's')

} catch (e) {
  await stage.screenshot({ path: `${ROOT}demo/failed.png` }).catch(() => {})
  console.error('Failed; the stage is in demo/failed.png')
  throw e
}

await cdp.send('Page.stopScreencast')
const end = Date.now() / 1000 - cut
if (process.env.DEBUG_TIME) console.log('first', frames[0].t, 'last', frames.at(-1).t, 'end', end, 'cut', cut)
await browser.close()
await app.close()

// Each frame lasts until the next one (the last one until the end), so pauses keep their length.
const rel = (f) => f.slice(`${ROOT}demo/`.length)
const list = frames.map((f, i) => `file '${rel(f.file)}'\nduration ${playTime(f.t, Math.max(f.t, frames[i + 1]?.t ?? end)).toFixed(4)}`)
writeFileSync(`${ROOT}demo/frames.txt`, `${list.join('\n')}\nfile '${rel(frames.at(-1).file)}'\n`)
mkdirSync(`${ROOT}docs/media`, { recursive: true })
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${ROOT}demo/frames.txt`,
  '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-movflags', '+faststart', OUT])
const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).toString())
if (process.env.KEEP_FRAMES !== '1') rmSync(FRAMES, { recursive: true, force: true })
console.log(`wrote docs/media/chore-pet-demo.mp4 (${seconds.toFixed(1)} s) from ${frames.length} frames`, errors.length ? `with page errors: ${errors.join('; ')}` : '')
