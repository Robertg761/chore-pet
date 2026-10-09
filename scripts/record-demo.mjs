// Records the in-app demo video (docs/SPEC.md: in-app screen recording only), about 60 s, 60 fps.
//
//   npm run build
//   npm run demo:record          (CHROME=/path/to/chrome if Playwright has no browser of its own)
//
// Writes docs/media/chore-pet-demo.mp4: a 1080 x 1920 portrait video. A title card (the logo and the
// three pets dropping in) hands over to the real app on a phone; short captions pop in above it,
// the phone punches in at the key moments and confetti bursts around it at the gifts. The story, in
// order: the messy sample home and its kind pet; Done, the first gift and the streak; Skip this
// time; a bathroom from the room pill with a toilet and a shower; days pass and the kitchen gets
// stinky; catching up and the gifts; a milestone further on, the Rewards tiers and a tier-two outfit
// in the wardrobe; the share card; an end card with the link.
//
// How it works:
// - The built app (dist/) is served on a free port and shown in an iframe on a "stage" page that
//   holds everything decorative: the drifting background, the captions, the title and end cards, the
//   tap marker, the confetti. The stage is rendered at 2x, so text and app are sharp. The app runs
//   untouched, and the pets on the cards are the app's own art, copied from its landing page.
// - Everything animated on the stage is transform or opacity only (no filters, no animated shadows),
//   so frames are cheap to produce and arrive evenly. The camera punch-in scales the app inside the
//   phone's screen (the frame stays put) and always returns to rest before the next tap.
// - Days pass with Playwright's fake clock (page.clock) rather than the dev time panel:
//   completions are never stamped after the real date, so catching up only works if the page's
//   real clock moves too.
// - One cut: the milestone scene needs a home many chores further on, so the recording pauses
//   while the saved home is moved to chore 89 (scripts/media-common.mjs, seedMilestone) and
//   resumes on the Rewards-ready home. The caption says so.
// - Frames come from Chrome's screencast into demo/frames/ and ffmpeg (needed on the PATH, with
//   libx264) times them by their timestamps and encodes at 60 fps.
// Set CAPTIONS=0 for no captions, URL=http://localhost:4173/ to use a server that is already running,
// OUT=path.mp4 to write elsewhere, DEBUG_FRAMES=file.json to dump every frame's timestamp,
// FPS=30 for a lighter file, PACE=1 for the unhurried waits (default 0.82), BGMODE=none|lite|full for
// the stage background (lite: 3 blobs; full: 5, which slows the screencast), SCENE_TEST=1 to record
// only the title card and the first few seconds (for timing the capture).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { ALL_REWARDS, isolate, launchBrowser, ROOT, seedMilestone, serveApp } from './media-common.mjs'

const CAPTIONS = process.env.CAPTIONS !== '0'
const FPS = Number(process.env.FPS ?? 60)
const DAY = 24 * 60 * 60 * 1000
const OUT = process.env.OUT ?? `${ROOT}docs/media/chore-pet-demo.mp4`
const FRAMES = `${ROOT}demo/frames`

// The phone (CSS px) and the stage around it. Everything is drawn at 2x: the video is 1080 x 1920.
const PHONE = { w: 390, h: 820 }
const STAGE = { w: 540, h: 960 }
const SCALE = 2

// A damped spring as a CSS linear() easing, so pops overshoot and settle.
const spring = (zeta, omega, seconds, steps = 40) => {
  const wd = omega * Math.sqrt(1 - zeta * zeta)
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * seconds
    const x = 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
    points.push(i === steps ? 1 : Number(x.toFixed(4)))
  }
  return `linear(${points.join(', ')})`
}
const POP = spring(0.5, 17, 0.75)
const CAM = spring(0.8, 15, 0.55)
const CAM_MS = 560
const SETTLE = 380

const SPARK = '<svg class="sp" viewBox="-1.25 -1.25 2.5 2.5" aria-hidden="true"><use href="#spk"/></svg>'
const sparkAt = (x, y, size, fill, delay, extra = '') =>
  `<svg class="sp tw" viewBox="-1.25 -1.25 2.5 2.5" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;--f:${fill};--dl:${delay}s;${extra}" aria-hidden="true"><use href="#spk"/></svg>`

const BGMODE = process.env.BGMODE ?? 'lite'
const BLOBS = BGMODE === 'none' ? '' : [
  ['#ffcfda', -150, -110, 26, 70, 50],
  ['#9ed8f5', 250, 170, 31, -80, 60],
  ['#ffd65c', -170, 620, 28, 90, -50],
  ['#8ccb5e', 300, 740, 24, -90, -60],
  ['#d9cdf5', 120, 380, 35, 60, -70],
].slice(0, BGMODE === 'lite' ? 3 : 5).map(([c, x, y, d, mx, my]) => `<div class="blob" style="left:${x}px;top:${y}px;--c:${c};--d:${d}s;--mx:${mx}px;--my:${my}px"></div>`).join('')

const FLOATERS = [
  [28, 130, 22, '#ffd65c', 0], [496, 168, 26, '#ffffff', 0.7], [22, 400, 28, '#f28fa0', 1.3], [500, 470, 22, '#ffd65c', 0.4],
  [26, 690, 24, '#9ed8f5', 1.9], [498, 760, 28, '#ffcfda', 1.1], [30, 905, 20, '#ffffff', 2.2], [494, 920, 22, '#ffd65c', 0.2],
].map(([x, y, s, f, d]) => sparkAt(x, y, s, f, d)).join('')

const LETTER_COLOURS = ['#f28fa0', '#ffd65c', '#8ccb5e', '#9ed8f5', '#ffcfda', '', '#e86a4a', '#ffd65c', '#6f95f0']
const logo = (cls = '') => {
  const letters = (word, from) => [...word].map((ch, i) => `<b style="--c:${LETTER_COLOURS[from + i]};--i:${from + i}">${ch}</b>`).join('')
  return `<div class="logo ${cls}"><span class="word">${letters('Chore', 0)}</span><span class="word">${letters('Pet', 6)}</span></div>`
}

const stageHtml = (appUrl) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Chore Pet demo</title>
<style>
@font-face { font-family: 'Nunito'; font-weight: 400 900; src: url('${appUrl}fonts/nunito-latin.woff2') format('woff2'); }
:root { --ink: #2b1e2f; --ground: #efe9ff; --accent: #6f5cf0; --sun: #ffd65c; --pop: ${POP}; --cam: ${CAM}; }
html, body { margin: 0; width: ${STAGE.w * SCALE}px; height: ${STAGE.h * SCALE}px; overflow: hidden; background: var(--ground); font-family: 'Nunito', system-ui, sans-serif; }
.stage { position: relative; width: ${STAGE.w}px; height: ${STAGE.h}px; transform: scale(${SCALE}); transform-origin: 0 0; overflow: hidden; color: var(--ink); }

/* Background: soft palette blobs drifting, and sparkles twinkling. Transform and opacity only. */
.bg { position: absolute; inset: 0; overflow: hidden; }
.blob { position: absolute; width: 380px; height: 380px; border-radius: 50%; opacity: .8;
  background: radial-gradient(circle, var(--c) 0%, var(--c) 38%, rgba(255, 255, 255, 0) 70%); animation: drift var(--d) ease-in-out infinite alternate; }
@keyframes drift { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(var(--mx), var(--my), 0) scale(1.1); } }
/* While the app is on screen the background holds still: every moving layer makes the screencast encode a whole
   frame, which halves the rate the app itself is captured at. It drifts through the cards and the transitions. */
.calm .blob, .calm .bg .tw { animation-play-state: paused; }
.sp { position: absolute; display: block; fill: var(--f, #ffd65c); stroke: var(--ink); stroke-width: .2; stroke-linejoin: round; }
.tw { margin: -12px 0 0 -12px; animation: twinkle 2.6s ease-in-out var(--dl, 0s) infinite both; }
@keyframes twinkle { 0%, 100% { transform: translateY(6px) scale(.15) rotate(0deg); opacity: 0; } 50% { transform: translateY(-10px) scale(1) rotate(50deg); opacity: 1; } }

/* Captions spring in with an accent keyword and a little sparkle. */
.cap { position: absolute; left: 34px; right: 34px; top: 14px; height: 78px; z-index: 5; display: flex; align-items: center; justify-content: center;
  box-sizing: border-box; padding: 0 22px; text-align: center; background: #fff; border: 3px solid var(--ink); border-radius: 20px; box-shadow: 0 5px 0 var(--ink);
  font-weight: 800; font-size: 23px; line-height: 1.2; text-wrap: balance; opacity: 0; }
.cap.show { opacity: 1; animation: capPop .6s var(--pop) both; }
.cap.hide { opacity: 0; transform: translateY(-10px) scale(.92); transition: opacity .18s ease, transform .18s ease; }
@keyframes capPop { from { transform: translateY(-22px) scale(.6); opacity: 0; } 30% { opacity: 1; } to { transform: none; opacity: 1; } }
.cap em { font-style: normal; font-weight: 900; color: var(--accent); display: inline-block; animation: kw .65s .12s var(--pop) both; }
@keyframes kw { from { transform: scale(.6) rotate(-8deg); } to { transform: none; } }
.cap .sp { right: -12px; top: -18px; width: 32px; height: 32px; --f: var(--sun); animation: capSpark 1s .08s var(--pop) both; }
@keyframes capSpark { from { transform: scale(0) rotate(-90deg); } to { transform: scale(1) rotate(0deg); } }

/* The phone: springs in from below after the title card, slides away before the end card. */
.phone { position: absolute; left: ${(STAGE.w - PHONE.w - 16) / 2}px; top: 108px; width: ${PHONE.w}px; height: ${PHONE.h}px; z-index: 2;
  border: 8px solid var(--ink); border-radius: 44px; background: var(--ground); overflow: hidden; box-shadow: 0 10px 0 rgba(43, 30, 47, .2);
  transform-origin: 50% 100%; transition: transform .75s var(--pop), opacity .2s ease; }
.phone.away { transform: translateY(150px) scale(.5); opacity: 0; transition: none; }
.phone.out { transform: translateY(840px) scale(.72) rotate(6deg); opacity: 0; transition: transform .5s cubic-bezier(.6, -.15, .9, .5), opacity .3s ease .2s; }
.cam { width: ${PHONE.w}px; height: ${PHONE.h}px; transform-origin: 50% 50%; transition: transform ${CAM_MS}ms var(--cam); }
iframe { display: block; width: ${PHONE.w}px; height: ${PHONE.h}px; border: 0; }

.tap { position: absolute; z-index: 3; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: rgba(111, 92, 240, .28); border: 3px solid var(--accent); }
.tap.go { animation: tap .55s cubic-bezier(.22, 1, .36, 1); }
@keyframes tap { 0% { opacity: .95; transform: scale(.35); } 70% { opacity: .7; } 100% { opacity: 0; transform: scale(1.25); } }

/* Confetti: x, then a ballistic y, then a spin, on three nested layers. */
.fx { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
.px { position: absolute; width: 0; height: 0; animation: px var(--dur) cubic-bezier(.1, .6, .3, 1) both, fade var(--dur) linear both; }
@keyframes px { from { transform: translateX(0); } to { transform: translateX(var(--dx)); } }
@keyframes fade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
.py { animation: py var(--dur) linear both; }
@keyframes py { 0% { transform: translateY(0); animation-timing-function: cubic-bezier(.2, .8, .4, 1); }
  38% { transform: translateY(var(--up)); animation-timing-function: cubic-bezier(.5, 0, .9, .6); } 100% { transform: translateY(var(--down)); } }
.pr { position: absolute; left: calc(var(--w) / -2); top: calc(var(--h) / -2); width: var(--w); height: var(--h); box-sizing: border-box; background: var(--c);
  border: 2px solid var(--ink); border-radius: var(--r); animation: pr var(--dur) linear both; }
.pr.star { background: none; border: 0; }
.pr.star .sp { position: static; width: 100%; height: 100%; }
@keyframes pr { from { transform: scale(.3) rotate(0deg); } 15% { transform: scale(1) rotate(calc(var(--rot) * .15)); } to { transform: scale(.9) rotate(var(--rot)); } }
.ring { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; box-sizing: border-box; border: 5px solid var(--accent); border-radius: 50%; animation: ring .6s cubic-bezier(.1, .7, .3, 1) both; }
@keyframes ring { from { transform: scale(.2); opacity: .9; } to { transform: scale(2.8); opacity: 0; } }

/* Title and end cards. */
.card { position: absolute; inset: 0; z-index: 8; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; visibility: hidden; }
.card.on { visibility: visible; }
.card.leave { animation: leave .32s cubic-bezier(.5, 0, .9, .4) both; }
@keyframes leave { to { transform: scale(1.2); opacity: 0; } }
.logo { display: flex; flex-direction: column; align-items: center; font-weight: 900; font-size: 132px; line-height: .98; letter-spacing: -1px; }
.logo.one { flex-direction: row; gap: 22px; font-size: 84px; }
.word { display: flex; }
.word:last-child { transform: rotate(-3deg); }
.logo b { display: inline-block; font-weight: 900; color: var(--c, #fff); opacity: 0; transform-origin: 50% 90%;
  -webkit-text-stroke: 16px var(--ink); paint-order: stroke fill; text-shadow: 0 8px 0 rgba(43, 30, 47, .22); }
.logo.one b { -webkit-text-stroke: 12px var(--ink); }
.on .logo b { animation: letter .7s var(--pop) calc(var(--i) * 55ms) both; }
@keyframes letter { from { opacity: 0; transform: translateY(70px) scale(.3) rotate(-14deg); } 25% { opacity: 1; } to { opacity: 1; transform: none; } }
.pets { display: flex; justify-content: center; gap: 2px; margin-top: 38px; }
.pet { position: relative; width: 168px; display: flex; flex-direction: column; align-items: center; }
.pet .drop { opacity: 0; transform-origin: 50% 100%; }
.pet .bob { transform-origin: 50% 100%; line-height: 0; }
.pet svg.art { width: 154px; height: auto; display: block; }
.pet .nm { margin-top: 4px; font-weight: 900; font-size: 22px; opacity: 0; }
.pet .shadow { position: absolute; left: 30px; right: 30px; top: 134px; height: 20px; border-radius: 50%; background: rgba(43, 30, 47, .15); opacity: 0; }
.on .pet .drop { animation: drop 1.05s linear calc(.5s + var(--i) * .2s) both; }
.on .pet .bob { animation: bob 1.5s ease-in-out calc(1.7s + var(--i) * .17s) infinite; }
.on .pet .nm { animation: rise .5s var(--pop) calc(1s + var(--i) * .2s) both; }
.on .pet .shadow { animation: fadein .3s ease calc(.6s + var(--i) * .2s) both; }
@keyframes drop {
  0% { opacity: 1; transform: translateY(-460px) scale(.82, 1.25); animation-timing-function: cubic-bezier(.55, 0, 1, .65); }
  38% { opacity: 1; transform: translateY(0) scale(.86, 1.2); animation-timing-function: ease-out; }
  48% { opacity: 1; transform: translateY(0) scale(1.28, .7); animation-timing-function: cubic-bezier(.2, .7, .4, 1); }
  66% { opacity: 1; transform: translateY(-46px) scale(.93, 1.09); animation-timing-function: cubic-bezier(.55, 0, 1, .65); }
  82% { opacity: 1; transform: translateY(0) scale(1.1, .9); animation-timing-function: ease-out; }
  100% { opacity: 1; transform: none; } }
@keyframes bob { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-9px) scale(.97, 1.04); } }
@keyframes rise { from { opacity: 0; transform: translateY(16px) scale(.8); } to { opacity: 1; transform: none; } }
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
.tag { margin-top: 30px; max-width: 410px; text-align: center; font-weight: 800; font-size: 28px; line-height: 1.25; text-wrap: balance; opacity: 0; }
.tag em { font-style: normal; font-weight: 900; color: var(--accent); }
.on .tag { animation: rise .6s var(--pop) 1.2s both; }
.url { margin-top: 28px; padding: 12px 26px; border: 4px solid var(--ink); border-radius: 999px; background: var(--accent); color: #fff; font-weight: 900; font-size: 25px;
  box-shadow: 0 6px 0 var(--ink); opacity: 0; }
.on .url { animation: rise .6s var(--pop) 1.1s both; }
.out .pets { margin-top: 30px; }
.out .pet { width: 140px; }
.out .pet svg.art { width: 128px; }
.out .pet .shadow { left: 24px; right: 24px; top: 112px; }
.out .tag { margin-top: 26px; font-size: 32px; }
.out .on .tag, .out.on .tag { animation-delay: .95s; }
.card .sp { z-index: 1; }
</style></head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="spk" viewBox="-1.25 -1.25 2.5 2.5"><path d="M0 -1.15 C.12 -.4 .4 -.12 1.15 0 C.4 .12 .12 .4 0 1.15 C-.12 .4 -.4 .12 -1.15 0 C-.4 -.12 -.12 -.4 0 -1.15Z"/></symbol></defs></svg>
<div class="stage" id="stage">
<div class="bg">${BLOBS}${FLOATERS}</div>
<div class="phone away" id="phone"><div class="cam" id="cam"><iframe id="app" src="${appUrl}" title="Chore Pet"></iframe></div></div>
<div class="tap" id="tap"></div>
<div class="cap" id="cap"></div>
<div class="fx" id="fx"></div>
<div class="card" id="intro">
  ${sparkAt(70, 160, 30, '#ffd65c', 0.1)}${sparkAt(468, 200, 38, '#ffffff', 0.9)}${sparkAt(44, 520, 24, '#f28fa0', 1.5)}${sparkAt(496, 560, 30, '#ffd65c', 0.5)}${sparkAt(120, 790, 22, '#9ed8f5', 1.2)}${sparkAt(430, 770, 28, '#ffffff', 2)}${sparkAt(270, 120, 24, '#ffcfda', 1.7)}
  ${logo()}
  <div class="pets" data-pets></div>
  <div class="tag">A tiny pet that lives in a <em>home</em> you build</div>
</div>
<div class="card out" id="outro">
  ${sparkAt(60, 210, 34, '#ffd65c', 0.1)}${sparkAt(480, 250, 28, '#ffffff', 0.9)}${sparkAt(40, 640, 26, '#f28fa0', 1.5)}${sparkAt(500, 700, 32, '#ffd65c', 0.5)}${sparkAt(150, 800, 22, '#9ed8f5', 1.2)}${sparkAt(410, 170, 22, '#ffcfda', 2)}
  ${logo('one')}
  <div class="pets" data-pets></div>
  <div class="url">robertg761.github.io/chore-pet</div>
  <div class="tag">Do real chores. <em>Keep it happy.</em></div>
</div>
</div>
<script>
const $ = (id) => document.getElementById(id)
const reflow = (el) => void el.offsetWidth
// Caption: "*word*" is the accent keyword. Replaced in place; the pop-in is the cue.
window.setCaption = (text) => {
  const cap = $('cap')
  cap.classList.remove('show', 'hide')
  if (!text) { cap.classList.add('hide'); return }
  cap.innerHTML = '<span>' + text.replace(/[&<]/g, (c) => ({ '&': '&amp;', '<': '&lt;' })[c]).replace(/\\*([^*]+)\\*/g, '<em>$1</em>') + '</span>${SPARK.replace(/'/g, "\\'")}'
  reflow(cap)
  cap.classList.add('show')
}
window.fillPets = (svgs, names) => {
  document.querySelectorAll('[data-pets]').forEach((row) => {
    row.innerHTML = svgs.map((svg, i) => '<div class="pet" style="--i:' + i + '"><div class="shadow"></div><div class="drop"><div class="bob">' + svg.replace('<svg', '<svg class="art"') + '</div></div><span class="nm">' + names[i] + '</span></div>').join('')
  })
}
window.card = (id, on) => { const c = $(id); c.classList.toggle('on', on); c.classList.remove('leave') }
window.leave = (id) => { const c = $(id); c.classList.add('leave') }
window.phoneIn = () => { const p = $('phone'); p.classList.remove('out'); reflow(p); p.classList.remove('away') }
window.phoneOut = () => { const p = $('phone'); p.classList.add('out') }
window.calm = (on) => document.body.classList.toggle('calm', on)
window.camTo = (x, y, s) => {
  const cam = $('cam')
  if (s !== 1) cam.style.transformOrigin = x + 'px ' + y + 'px'
  cam.style.transform = 'scale(' + s + ')'
}
window.tapAt = (x, y) => {
  const el = $('tap')
  el.style.left = x + 'px'; el.style.top = y + 'px'
  el.classList.remove('go'); reflow(el); el.classList.add('go')
}
// Confetti, from a fixed seed so every recording looks the same.
let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const COLOURS = ['#f28fa0', '#ffd65c', '#8ccb5e', '#9ed8f5', '#6f5cf0', '#e86a4a', '#ffcfda', '#6f95f0']
window.burst = (x, y, count, aim, force, spread = 1.4) => {
  const fx = $('fx')
  const ring = document.createElement('div')
  ring.className = 'ring'; ring.style.left = x + 'px'; ring.style.top = y + 'px'
  ring.addEventListener('animationend', () => ring.remove())
  fx.appendChild(ring)
  for (let i = 0; i < count; i++) {
    const dur = 1.1 + rnd() * 0.7
    const dx = (aim + (rnd() - 0.5) * spread) * force * 0.55 * (0.5 + rnd() * 0.7)
    const up = -(force * (0.6 + rnd() * 0.9))
    const kind = rnd()
    const size = 8 + rnd() * 6
    const px = document.createElement('div')
    px.className = 'px'
    px.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--dx:' + dx.toFixed(1) + 'px;--dur:' + dur.toFixed(2) + 's;animation-delay:' + (rnd() * 0.08).toFixed(2) + 's'
    const colour = COLOURS[Math.floor(rnd() * COLOURS.length)]
    const shape = kind < 0.4 ? { w: size * 1.5, h: size * 0.8, r: '2px', cls: '' } : kind < 0.7 ? { w: size, h: size, r: '50%', cls: '' } : { w: size * 2, h: size * 2, r: '0', cls: ' star' }
    px.innerHTML = '<div class="py" style="--up:' + up.toFixed(1) + 'px;--down:' + (force * 0.9 + rnd() * 70).toFixed(1) + 'px"><div class="pr' + shape.cls + '" style="--w:' + shape.w.toFixed(1) + 'px;--h:' + shape.h.toFixed(1) + 'px;--r:' + shape.r + ';--c:' + colour + ';--rot:' + Math.round((rnd() - 0.5) * 900) + 'deg">' + (shape.cls ? '<svg class="sp" viewBox="-1.25 -1.25 2.5 2.5" style="--f:' + colour + '"><use href="#spk"/></svg>' : '') + '</div></div>'
    px.addEventListener('animationend', (e) => { if (e.animationName === 'fade') px.remove() })
    fx.appendChild(px)
  }
}
</script>
</body></html>`

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
// Always a Thursday (the latest one), so the sample home's weekly chores, and so the home list, play
// out the same whichever day this runs: on a Friday "Clear out old food" would be due and crowd it.
const start = new Date(); start.setHours(10, 0, 0, 0)
start.setDate(start.getDate() - ((start.getDay() - 4 + 7) % 7))
await stage.clock.install({ time: start })
const errors = []
stage.on('pageerror', (e) => errors.push(e.message))
stage.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await stage.goto(`${app.url}__stage.html`, { waitUntil: 'load' })
const phone = stage.frames().find((f) => f !== stage.mainFrame())
await phone.getByRole('button', { name: 'Try a sample home' }).waitFor()
// The cards show the app's own pets, copied from its landing page.
const pets = await stage.evaluate(() => {
  const doc = document.getElementById('app').contentDocument
  return {
    svgs: [...doc.querySelectorAll('.landing-pet-art svg')].map((s) => s.outerHTML),
    names: [...doc.querySelectorAll('.landing-pet-name')].map((n) => n.textContent),
  }
})
await stage.evaluate(([svgs, names]) => window.fillPets(svgs, names), [pets.svgs, pets.names])
await stage.evaluate(() => document.fonts.load("900 100px 'Nunito'").then(() => document.fonts.ready))
await stage.waitForTimeout(600)

// Screencast, with a pause that leaves no gap in the video.
const frames = []
const cdp = await ctx.newCDPSession(stage)
let cut = 0 // seconds of recording left out so far
// Playback speed. Parts of the story are time-lapsed so the video keeps its length however slowly this
// machine runs: `lapse(seconds, fn)` runs fn, then plays it back in about that many seconds (never slower than
// real time). Gifts inside it keep their own, fixed pace. Times are on the recording's timeline.
let pausedAt = 0
const segments = [] // { from, to, speed, fixed }
const now = () => Date.now() / 1000 - cut
const speedAt = (t) => {
  const covering = segments.filter((g) => t >= g.from && t < g.to)
  return (covering.findLast((g) => g.fixed) ?? covering.at(-1))?.speed ?? 1
}
const playTime = (a, b) => {
  const points = [...new Set([a, b, ...segments.flatMap((g) => [g.from, g.to]).filter((t) => t > a && t < b)])].sort((x, y) => x - y)
  return points.slice(1).reduce((total, t, i) => total + (t - points[i]) / speedAt((t + points[i]) / 2), 0)
}
const lapse = async (seconds, fn) => {
  const from = now()
  const inner = segments.length
  await fn()
  const to = now()
  let fixedReal = 0
  let fixedPlay = 0
  for (const g of segments.slice(inner).filter((g) => g.fixed)) {
    const real = Math.min(g.to, to) - Math.max(g.from, from)
    fixedReal += real
    fixedPlay += real / g.speed
  }
  segments.push({ from, to, speed: Math.max(1, (to - from - fixedReal) / Math.max(0.5, seconds - fixedPlay)), fixed: false })
}
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  // Ack first: the next frame is only sent once this one is acknowledged.
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  const file = `${FRAMES}/${String(frames.length).padStart(5, '0')}.jpg`
  writeFileSync(file, Buffer.from(data, 'base64'))
  // Timestamps can arrive slightly out of order; never let time run backwards.
  frames.push({ file, ts: metadata.timestamp, t: Math.max(metadata.timestamp - cut, frames.at(-1)?.t ?? 0) })
})
const startCast = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 })
const pauseCast = async () => { await cdp.send('Page.stopScreencast'); pausedAt = Date.now() / 1000 }
const resumeCast = async () => { cut += Date.now() / 1000 - pausedAt; await startCast() }

// Waits are the story's pacing; PACE trims them (a little under real time keeps the video brisk).
const PACE = Number(process.env.PACE ?? 0.82)
const wait = (ms) => stage.waitForTimeout(Math.max(80, ms * PACE))
const t0 = Date.now()
const log = (what) => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  ${what}` + (process.env.DEBUG_TIME ? `  (video ${playTime(frames[0]?.t ?? 0, frames.at(-1)?.t ?? 0).toFixed(1)}s)` : ''))

// Captions pop in over the old one ("*word*" is the accent keyword), so there is nothing to wait for.
let current = ''
const caption = async (text) => {
  if (!CAPTIONS || text === current) return
  current = text
  await stage.evaluate((t) => window.setCaption(t), text)
}

// The camera punches in on the app inside the phone's screen, and must be back at rest before a tap.
let zoomed = false
let camMoved = 0
const camera = async (x, y, scale) => {
  zoomed = scale !== 1
  camMoved = Date.now()
  await stage.evaluate(([x, y, s]) => window.camTo(x, y, s), [x, y, scale])
}
const rest = () => (zoomed ? camera(0, 0, 1) : Promise.resolve())
/** Punch in on the middle of an element (or a point in the phone's own pixels). */
const zoom = async (target, scale = 1.2) => {
  let point = target
  if (!Array.isArray(target)) {
    const box = await target.first().boundingBox()
    const screen = await stage.locator('#app').boundingBox()
    if (!box || !screen) return
    point = [(box.x + box.width / 2 - screen.x) / SCALE, (box.y + box.height / 2 - screen.y) / SCALE]
  }
  await camera(point[0], point[1], scale)
}
// Burst of confetti around the phone, from both sides and over the top.
const celebrate = (big = true) => stage.evaluate((big) => {
  window.burst(70, 600, big ? 20 : 12, 1.2, 230)
  window.burst(470, 600, big ? 20 : 12, -1.2, 230)
  if (big) window.burst(270, 330, 18, 0, 260, 3)
}, big)

// A tap, with a marker where the finger lands. The target is found once, left a moment to stop
// moving (sheets spring in), and then touched directly, which keeps taps quick and the pacing even.
let pressTime = 0
const press = async (locator) => {
  const began = Date.now()
  await rest()
  const settle = camMoved + SETTLE - Date.now()
  if (settle > 0) await wait(settle)
  const target = locator.first()
  await target.waitFor({ state: 'visible' })
  let box = await target.boundingBox()
  for (let i = 0; i < 12; i++) {
    await stage.waitForTimeout(60)
    const again = await target.boundingBox()
    const still = Math.abs(again.x - box.x) < 0.5 && Math.abs(again.y - box.y) < 0.5
    box = again
    if (still) break
  }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await stage.evaluate(([x, y]) => window.tapAt(x, y), [x / SCALE, y / SCALE])
  await stage.touchscreen.tap(x, y)
  pressTime += Date.now() - began
}
const tap = (role, name) => press(phone.getByRole(role, { name }))
// Anchored: the Rewards tab's full name ("Rewards, Gift in 2: 2 more chores to ...") would otherwise match "More".
const tab = (name) => press(phone.getByRole('navigation').getByRole('button', { name: new RegExp(`^${name}\\b`) }))
const reloadPhone = async () => {
  await phone.evaluate(() => location.reload())
  await wait(600)
  await phone.getByRole('navigation').waitFor()
  await wait(1200)
}

// Open every gift that is waiting: the reveal takes about a second, then wear it or save it for later.
// `quick` is for the later gifts of a run, which go by faster. `show` punches in on the reveal with confetti.
const openGifts = async ({ quick = false, show = null } = {}) => {
  for (let i = 0; i < 5; i++) {
    const gift = phone.getByRole('button', { name: 'Open it', exact: true })
    if (!(await gift.count())) return
    const from = now()
    await press(gift)
    // A tap that lands as the sheet springs in can be missed: the box is disabled once it is opening.
    await wait(300)
    if ((await gift.count()) && (await gift.isEnabled().catch(() => false))) await press(gift)
    if (show && i === 0) {
      await wait(250)
      await celebrate(show === 'big')
      await zoom(phone.locator('.gift-stage'), 1.18)
      await wait(900)
      await rest()
    } else {
      await wait(quick ? 1000 : 1200)
    }
    await press(phone.getByRole('button', { name: /^(Put it on|Maybe later|Lovely!)$/ }))
    await wait(quick ? 350 : 450)
    segments.push({ from, to: now(), speed: quick ? 2.5 : 1, fixed: true })
  }
}
const skipDays = async (days) => {
  await stage.clock.fastForward(days * DAY)
  await wait(900)
}

try {
// --- 0. Title card ------------------------------------------------------------------------
await startCast()
await stage.evaluate(() => window.card('intro', true))
await wait(2450 / PACE)
await stage.evaluate(() => { window.leave('intro'); window.burst(270, 480, 22, 0, 250, 3) })
await wait(150)
await stage.evaluate(() => window.phoneIn())
await caption('Pick a pet, step *inside*')
await wait(700)
await stage.evaluate(() => window.calm(true))
if (process.env.SCENE_TEST) { await wait(3500); throw new Error('scene-test') }

// --- 1. Meet the pets -------------------------------------------------------------------
await wait(300)
await press(phone.getByRole('button', { name: 'Try a sample home' }))
log('sample home')
await caption('Late chores show up as *mess*')
await wait(1900)
await press(phone.getByRole('button', { name: /^Mochi, feeling/ })).catch(() => {})
await caption('The pet notices, *kindly*')
await wait(1200)

// --- 2. Done, the first gift, the streak -----------------------------------------------
await caption('Do the real chore, then tap *Done*')
await wait(500)
await tap('button', 'Done: Wash the dishes')
await wait(250)
await zoom([195, 330], 1.2) // the mess clearing
await wait(1200)
await caption('Your first chore earns a *gift*')
await tap('button', 'Open it')
await wait(450)
await celebrate(true)
await zoom(phone.locator('.gift-stage'), 1.18)
await wait(1050)
await rest()
await tap('button', 'Put it on')
await wait(500)
await caption('Keep going and a *streak* starts')
await tap('button', 'Done: Take out the trash')
await wait(350)
await zoom(phone.locator('.hb-streak'), 1.4)
await wait(1350)
await rest()
log('done + streak')

// --- 3. Skip this time -------------------------------------------------------------------
await caption('Not needed today? *Skip* it, honestly')
await wait(300)
await tap('button', 'Edit Wipe the stove')
await wait(600)
await tap('button', 'Skip this time')
await wait(300)
await caption('A skip keeps things *tidy*')
await wait(1200)
// The note about it stays for five seconds, and would cover the next screen's tray.
await lapse(0.8, () => phone.getByText(/^Skipped: /).waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {}))
log('skip')

// --- 4. A bathroom from the room pill ----------------------------------------------------
await caption('Add a *room* from the room pill')
await tap('button', /^Rooms: Kitchen/)
await wait(1000)
await lapse(5, async () => {
  await tap('button', 'Add a bathroom')
  await wait(500)
  await caption('Every object brings its own *chores*')
  await tap('button', /^Shower/)
  await wait(600)
  await tap('button', 'Place it')
  await wait(1200)
  await tap('button', 'Close')
  await wait(300)
  await tap('button', /^Toilet/)
  await wait(400)
  await tap('button', 'Place it')
  await wait(800)
  await tap('button', 'Close')
  await wait(250)
  await tap('button', 'Finish')
})
await caption('A shower and a toilet: *new chores*')
await wait(1300)
log('bathroom')

// --- 5. Days pass -------------------------------------------------------------------------
await caption('Back in the kitchen, three *days* pass...')
await tap('button', /^Rooms: Bathroom/)
await wait(400)
await tap('button', /^Show the kitchen/)
await wait(600)
await skipDays(3)
await caption('*Mess* builds up: stink, flies, dust')
await wait(1500)
await caption('A week more, and Mochi is *poorly*')
await skipDays(7)
await wait(600)
await caption('Never gone: it always gets *better*')
await wait(1300)
log('days pass')

// --- 6. Catching up -----------------------------------------------------------------------
await caption('Catch *up*, one chore at a time')
await lapse(8, async () => {
  let first = true
  for (let i = 0; i < 30; i++) {
    const done = phone.getByRole('button', { name: /^Done: / })
    await openGifts({ quick: !first })
    if (!(await done.count())) break
    await press(done)
    // The gift for a milestone chore appears a moment after the tap.
    await wait(800)
    if (await phone.getByRole('button', { name: 'Open it', exact: true }).count()) {
      await caption('*Gifts* along the way')
      await openGifts({ quick: !first, show: first ? 'small' : null })
      first = false
    }
  }
  await wait(700)
  await openGifts({ quick: true })
})
await caption('All caught up: Mochi is *happy* again')
await wait(1500)
log('caught up')

// --- 7. Further on: the Rewards tiers and a tier-two outfit -------------------------------
await caption('Fast forward: 89 chores *later*...')
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
await caption('Chore 90 earns *heart glasses*')
await wait(400)
await openGifts({ show: 'big' })
// The Undo note covers the bottom of the next screen for a few seconds; let it go first.
await lapse(1, () => phone.getByText(/^Done: /).waitFor({ state: 'hidden', timeout: 9000 }))
await caption('Two reward tiers, earned by *real* chores')
await tab('Rewards')
await wait(1100)
await phone.locator('.rewards-grid').first().evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }))
await wait(1300)
await tap('button', /For your home/)
await wait(1100)
log('rewards')

await caption("*Dress up* in a chef's hat, heart glasses")
await tab('Wardrobe')
await wait(600)
await press(phone.getByRole('button', { name: /Chef's hat/ }))
await wait(900)
await tap('tab', /^Face/)
await wait(1300)
log('wardrobe')

// --- 8. Share, and the end card ----------------------------------------------------------
await caption('Share a *picture* of your home')
await tab('More')
await wait(400)
await tap('button', 'Share your home')
await wait(1700)
await caption('')
await stage.evaluate(() => { window.calm(false); window.phoneOut() })
await wait(350)
await stage.evaluate(() => { window.card('outro', true); window.burst(270, 330, 18, 0, 240, 3) })
await wait(2600 / PACE)
log('end')
if (process.env.DEBUG_TIME) console.log('time spent finding and tapping', (pressTime / 1000).toFixed(1), 's')

} catch (e) {
  if (e.message !== 'scene-test') {
  await stage.screenshot({ path: `${ROOT}demo/failed.png` }).catch(() => {})
  console.error('Failed; the stage is in demo/failed.png')
  throw e
  }
}

await cdp.send('Page.stopScreencast')
const end = Date.now() / 1000 - cut
if (process.env.DEBUG_TIME) console.log('first', frames[0].t, 'last', frames.at(-1).t, 'end', end, 'cut', cut)
if (process.env.DEBUG_FRAMES) writeFileSync(process.env.DEBUG_FRAMES, JSON.stringify(frames.map((f) => ({ ts: f.ts, t: f.t }))))
await browser.close()
await app.close()

// Each frame lasts until the next one (the last one until the end), so pauses keep their length.
const rel = (f) => f.slice(`${ROOT}demo/`.length)
const list = frames.map((f, i) => `file '${rel(f.file)}'\nduration ${playTime(f.t, Math.max(f.t, frames[i + 1]?.t ?? end)).toFixed(4)}`)
writeFileSync(`${ROOT}demo/frames.txt`, `${list.join('\n')}\nfile '${rel(frames.at(-1).file)}'\n`)
mkdirSync(new URL('.', `file://${OUT}`).pathname, { recursive: true })
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${ROOT}demo/frames.txt`,
  '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', OUT])
const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).toString())
if (process.env.KEEP_FRAMES !== '1') rmSync(FRAMES, { recursive: true, force: true })
console.log(`wrote ${OUT.startsWith(ROOT) ? OUT.slice(ROOT.length) : OUT} (${seconds.toFixed(1)} s, ${FPS} fps) from ${frames.length} frames`, errors.length ? `with page errors: ${errors.join('; ')}` : '')
