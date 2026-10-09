// Records the story cut of the demo video (docs/SPEC.md: in-app screen recording only): a tiny story about
// one pet, Mochi, told with the room and the pet huge on screen. About a minute, 60 fps, with sound.
//
//   npm run build
//   npm run demo:story                      portrait, 1080 x 1920 -> demo/chore-pet-story.mp4
//   FORMAT=landscape npm run demo:story     landscape, 1920 x 1080 -> demo/chore-pet-story-16x9.mp4
//   (CHROME=/path/to/chrome if Playwright has no browser of its own; OUT=path.mp4 to write elsewhere)
//
// The story, in order:
//   - cold open on the stinky sink, flies and all: "Chores are boring." The camera finds Mochi beside it, sad:
//     "So we gave them a pet." Then the whole kitchen: "Late chores show up as mess.";
//   - a bathroom is added and a toilet placed: its sheet says the chore it brings ("Each thing you place brings
//     a real chore.");
//   - back in the kitchen: the dirty sink, Done on "Wash the dishes", Mochi cheers;
//   - a gift drops in: the red beanie; then the same sink again, clean (Mochi's cheer line sits over it until then);
//   - a few days pass on camera (a day counter, the health bar and mood falling): Mochi gets scruffy;
//   - you catch up, a gift on the way ("Outfits and decor, only from real chores."), the room clean, Mochi happy;
//   - "Weeks later": a cosy living room and a dressed-up Mochi; an end card with the three pets and the link.
//
// Why portrait first: the room is wider than tall, so in a square or portrait frame its size is set by the width
// (about 1000 px), and portrait adds room for big captions above it. Landscape is for the 16:9 build card: the
// room fills the right of the frame and the captions sit beside it.
//
// How it works (the plumbing is record-demo.mjs's, kept the same so both recorders behave alike):
// - The built app runs untouched in an iframe on a "stage" page, inside a window. A camera (one transform) frames
//   any box of the live layout: the sink, Mochi's face, the room, a chore row, the gift. A matte (clip-path) trims
//   the window to the band that shot is about, so no strip of a neighbouring header or list is ever half in view.
//   Everything decorative (captions, the badge, cross-fades, confetti, the tap marker, the end card) is on the stage.
// - Slow motion: the page runs SLOW (4) times slower than real time and ffmpeg divides the timestamps, so the
//   60 fps video has real motion in every frame. Days pass with Playwright's fake clock.
// - Holds: while the camera sits on a reaction, the page's JS clock is held still for a moment (the pet keeps
//   breathing and blinking, the flies keep buzzing: those are CSS). Mochi stays where the camera is looking, and
//   the cheer gets its beat before the app's gift sheet slides up.
// - Two cuts: the start (the sample home is opened two days earlier, so the kitchen is properly behind) and
//   "Weeks later" behind a cross-fade (the home is moved on to 140 chores and every reward, a living room is
//   furnished and Mochi dressed, with scripts/media-common.mjs's seeding helpers, as showcase.mjs does).
// - Every caption stays up for at least (words / 2.5) + 1 seconds of video; the recorder waits if a scene is
//   quicker. The captions and their times are written to <out>.captions.json.
// Set AUDIO=0 for a silent video, FPS=30 for a lighter file, STOP=open|build|done|gift|lapse|catchup to stop
// after that scene (for iterating), KEEP_FRAMES=1 to keep the frames, URL=... to use a running server.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { addSound, interceptAudio } from './demo-audio.mjs'
import { ALL_REWARDS, isolate, launchBrowser, readSnapshot, ROOT, seedMilestone, seedPet, seedRoom, serveApp, LIVING_ROOM } from './media-common.mjs'

const FORMAT = process.env.FORMAT === 'landscape' ? 'landscape' : 'portrait'
const WIDE = FORMAT === 'landscape'
const FPS = Number(process.env.FPS ?? 60)
const K = Number(process.env.SLOW ?? 4)
const DAY = 24 * 60 * 60 * 1000
const OUT = process.env.OUT ?? `${ROOT}demo/chore-pet-story${WIDE ? '-16x9' : ''}.mp4`
const WORK = `${ROOT}demo/story-${FORMAT}`
const FRAMES = `${WORK}/frames`
const STOP = process.env.STOP ?? ''

// The stage (CSS px, drawn at 2x), where the captions go, and the most the window onto the app can cover.
const SCALE = 2
const L = WIDE
  ? { stage: { w: 960, h: 540 }, cap: { x: 26, y: 76, w: 300, h: 420 }, capSize: 46, win: { x: 344, y: 12, w: 604, h: 516 }, badge: { x: 26, y: 22 } }
  : { stage: { w: 540, h: 960 }, cap: { x: 18, y: 62, w: 504, h: 190 }, capSize: 47, win: { x: 14, y: 264, w: 512, h: 678 }, badge: { x: 0, y: 18 } }
const STAGE = L.stage
const WIN = L.win
const VIEW = { w: WIN.w, h: WIN.h }
const APP = { w: 390, h: 820 }
const BORDER = 5

// A damped spring as a CSS linear() easing (as in record-demo.mjs): pops overshoot; the camera doesn't.
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
const CAM = spring(0.97, 9, 1)
const CAM_S = 0.9 // seconds a camera move takes, unless a shot asks for a quicker one

// Runs in every frame, before the page: all CSS animations and transitions (and Element.animate) play at 1/k.
function slowAnimations(k) {
  const rate = 1 / k
  const apply = () => { for (const a of document.getAnimations()) if (a.playbackRate !== rate) a.updatePlaybackRate(rate) }
  const animate = Element.prototype.animate
  Element.prototype.animate = function (...args) { const a = animate.apply(this, args); a.updatePlaybackRate(rate); return a }
  const watch = () => {
    new MutationObserver(apply).observe(document, { subtree: true, childList: true, attributes: true })
    addEventListener('animationstart', apply, true)
    addEventListener('transitionrun', apply, true)
    apply()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch)
  else watch()
}

const BLOBS = (WIDE
  ? [['#ffcfda', -150, -150, 26, 70, 50], ['#9ed8f5', 650, 260, 31, -80, 60], ['#ffd65c', -120, 330, 28, 90, -50]]
  : [['#ffcfda', -150, -110, 26, 70, 50], ['#9ed8f5', 250, 170, 31, -80, 60], ['#ffd65c', -170, 620, 28, 90, -50]]
).map(([c, x, y, d, mx, my]) => `<div class="blob" style="left:${x}px;top:${y}px;--c:${c};--d:${d}s;--mx:${mx}px;--my:${my}px"></div>`).join('')
const LETTER_COLOURS = ['#f28fa0', '#ffd65c', '#8ccb5e', '#9ed8f5', '#ffcfda', '', '#e86a4a', '#ffd65c', '#6f95f0']
const logo = (cls) => {
  const letters = (word, from) => [...word].map((ch, i) => `<b style="--c:${LETTER_COLOURS[from + i]};--i:${from + i}">${ch}</b>`).join('')
  return `<div class="logo ${cls}"><span class="word">${letters('Chore', 0)}</span><span class="word">${letters('Pet', 6)}</span></div>`
}
const URL_TEXT = 'robertg761.github.io/chore-pet'

const stageHtml = (appUrl) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Chore Pet story</title>
<style>
@font-face { font-family: 'Nunito'; font-weight: 400 900; src: url('${appUrl}fonts/nunito-latin.woff2') format('woff2'); }
:root { --ink: #2b1e2f; --ground: #efe9ff; --accent: #6f5cf0; --sun: #ffd65c; --pop: ${POP}; --cam: ${CAM}; --camms: ${CAM_S}s; }
html, body { margin: 0; width: ${STAGE.w * SCALE}px; height: ${STAGE.h * SCALE}px; overflow: hidden; background: var(--ground); font-family: 'Nunito', system-ui, sans-serif; }
.stage { position: relative; width: ${STAGE.w}px; height: ${STAGE.h}px; transform: scale(${SCALE}); transform-origin: 0 0; overflow: clip; color: var(--ink); }
.bg { position: absolute; inset: 0; overflow: hidden; }
.blob { position: absolute; width: 380px; height: 380px; border-radius: 50%; opacity: .8;
  background: radial-gradient(circle, var(--c) 0%, var(--c) 38%, rgba(255, 255, 255, 0) 70%); animation: drift var(--d) ease-in-out infinite alternate; }
@keyframes drift { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(var(--mx), var(--my), 0) scale(1.1); } }
/* While the app is on screen the background holds still, so the screencast spends its frames on the app. */
.calm .blob { animation-play-state: paused; }
.sp { position: absolute; display: block; fill: var(--f, #ffd65c); stroke: var(--ink); stroke-width: .2; stroke-linejoin: round; }

/* The name, small, from the first frame. */
.badge { position: absolute; top: ${L.badge.y}px; ${WIDE ? `left: ${L.badge.x}px;` : 'left: 0; right: 0; justify-content: center;'} z-index: 6; display: flex; pointer-events: none; }
.logo { display: flex; flex-direction: row; gap: .2em; font-weight: 900; line-height: .98; letter-spacing: -.01em; }
.word { display: flex; }
.word:last-child { transform: rotate(-3deg); }
.logo b { display: inline-block; font-weight: 900; color: var(--c, #fff); transform-origin: 50% 90%; paint-order: stroke fill; }
.logo.small { font-size: ${WIDE ? 36 : 34}px; }
.logo.small b { -webkit-text-stroke: 6px var(--ink); text-shadow: 0 3px 0 rgba(43, 30, 47, .22); }
.logo.big { font-size: ${WIDE ? 74 : 104}px; }
.logo.big b { -webkit-text-stroke: 13px var(--ink); text-shadow: 0 8px 0 rgba(43, 30, 47, .22); opacity: 0; }

/* Kinetic captions: big words that pop in one after another. "*word*" is the accent. */
.cap { position: absolute; left: ${L.cap.x}px; top: ${L.cap.y}px; width: ${L.cap.w}px; height: ${L.cap.h}px; z-index: 5; display: flex; align-items: center;
  justify-content: ${WIDE ? 'flex-start' : 'center'}; text-align: ${WIDE ? 'left' : 'center'}; pointer-events: none; }
.cap .lines { font-weight: 900; font-size: ${L.capSize}px; line-height: 1.08; letter-spacing: -.5px; text-wrap: balance; }
.w { display: inline-block; opacity: 0; transform-origin: 50% 80%; }
.show .w { animation: wpop .6s var(--pop) calc(var(--i) * 95ms) both; }
.cap.set .w { animation: none; opacity: 1; }
@keyframes wpop { from { opacity: 0; transform: translateY(28px) scale(.45) rotate(-7deg); } 30% { opacity: 1; } to { opacity: 1; transform: none; } }
.a { color: var(--accent); }
.cap.hide .lines { opacity: 0; transform: translateY(-14px) scale(.9); transition: opacity .2s ease, transform .2s ease; }

/* The window onto the app: the camera inside, a matte that trims it to the shot, and an outline that follows. */
/* overflow: clip, not hidden: a hidden box can still be scrolled (focus inside the app scrolls it to the focused button). */
.win { position: absolute; left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; z-index: 2; overflow: clip; background: var(--ground);
  clip-path: inset(0 0 0 0 round 30px); transition: clip-path var(--camms) var(--cam); }
.cam { position: absolute; left: 0; top: 0; width: ${APP.w}px; height: ${APP.h}px; transform-origin: 0 0; transition: transform var(--camms) var(--cam); }
.frame { position: absolute; z-index: 3; box-sizing: border-box; border: ${BORDER}px solid var(--ink); border-radius: 35px; pointer-events: none; box-shadow: 0 7px 0 rgba(43, 30, 47, .16);
  transition: left var(--camms) var(--cam), top var(--camms) var(--cam), width var(--camms) var(--cam), height var(--camms) var(--cam); }
.cut .win, .cut .cam, .cut .frame { transition: none; }
iframe { display: block; width: ${APP.w}px; height: ${APP.h}px; border: 0; }
.chip { position: absolute; z-index: 4; padding: 8px 24px; border: 4px solid var(--ink); border-radius: 999px; background: #fff; box-shadow: 0 5px 0 var(--ink);
  font-weight: 900; font-size: 32px; white-space: nowrap; transform: translate(-50%, -100%); opacity: 0; pointer-events: none; }
.chip.show { opacity: 1; animation: chip .5s var(--pop) both; }
@keyframes chip { from { transform: translate(-50%, -100%) scale(.5); } to { transform: translate(-50%, -100%); } }

/* Highlight ring and tap marker. */
.ring2 { position: absolute; z-index: 4; box-sizing: border-box; border: 7px solid var(--accent); border-radius: 20px; pointer-events: none; opacity: 0;
  background: rgba(111, 92, 240, .1); box-shadow: 0 0 0 4px #fff; }
.ring2.go { animation: ring2 2.2s cubic-bezier(.2, .9, .3, 1) both; }
@keyframes ring2 { 0% { opacity: 0; transform: scale(1.3); } 18% { opacity: 1; transform: scale(1); } 82% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.04); } }
.tap { position: absolute; z-index: 4; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: rgba(111, 92, 240, .28); border: 4px solid var(--accent); }
.tap.go { animation: tap .6s cubic-bezier(.22, 1, .36, 1); }
@keyframes tap { 0% { opacity: .95; transform: scale(.35); } 70% { opacity: .7; } 100% { opacity: 0; transform: scale(1.3); } }

/* Cross-fades: a still of the last shot, laid over the new one and faded out, so no frame shows a crop on the move. */
.snap { position: absolute; display: none; pointer-events: none; }
.snap.on { display: block; opacity: 1; }
.snap.go { opacity: 0; transition: opacity var(--fade, .35s) linear; }

/* Confetti (record-demo.mjs's): x, then a ballistic y, then a spin, on three nested layers. */
.fx { position: absolute; inset: 0; z-index: 7; pointer-events: none; }
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

/* The end card: the name, the three pets, the line, the link. */
.card { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; visibility: hidden; background: var(--ground); }
.card.on { visibility: visible; animation: fadein .3s ease both; }
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
@keyframes rise { from { opacity: 0; transform: translateY(16px) scale(.8); } to { opacity: 1; transform: none; } }
.on .logo.big b { animation: letter .7s var(--pop) calc(var(--i) * 50ms) both; }
@keyframes letter { from { opacity: 0; transform: translateY(70px) scale(.3) rotate(-14deg); } 25% { opacity: 1; } to { opacity: 1; transform: none; } }
.pets { display: flex; justify-content: center; gap: ${WIDE ? 10 : 2}px; margin-top: ${WIDE ? 14 : 44}px; }
.pet { width: ${WIDE ? 150 : 176}px; display: flex; flex-direction: column; align-items: center; opacity: 0; }
.pet svg { width: ${WIDE ? 132 : 172}px; height: auto; display: block; }
.pet .nm { margin-top: 4px; font-weight: 900; font-size: ${WIDE ? 22 : 30}px; }
.on .pet { animation: rise .6s var(--pop) calc(.25s + var(--i) * .12s) both; }
.card .tag { margin-top: ${WIDE ? 12 : 40}px; max-width: ${WIDE ? 760 : 500}px; text-align: center; font-weight: 900; font-size: ${WIDE ? 40 : 54}px; line-height: 1.1; text-wrap: balance; opacity: 0; }
.card .tag em { font-style: normal; color: var(--accent); }
.on .tag { animation: rise .6s var(--pop) .55s both; }
.card .link { margin-top: ${WIDE ? 18 : 44}px; padding: ${WIDE ? '14px 30px' : '12px 22px'}; border: 5px solid var(--ink); border-radius: 999px; background: var(--accent); color: #fff; font-weight: 900;
  font-size: ${WIDE ? 36 : 31}px; white-space: nowrap; box-shadow: 0 7px 0 var(--ink); opacity: 0; }
.on .link { animation: rise .6s var(--pop) .75s both; }
.card .small { margin-top: ${WIDE ? 16 : 30}px; font-weight: 900; font-size: ${WIDE ? 32 : 38}px; opacity: 0; }
.on .small { animation: rise .6s var(--pop) .95s both; }
</style></head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="spk" viewBox="-1.25 -1.25 2.5 2.5"><path d="M0 -1.15 C.12 -.4 .4 -.12 1.15 0 C.4 .12 .12 .4 0 1.15 C-.12 .4 -.4 .12 -1.15 0 C-.4 -.12 -.12 -.4 0 -1.15Z"/></symbol></defs></svg>
<div class="stage" id="stage">
<div class="bg">${BLOBS}</div>
<div class="win" id="win"><div class="cam" id="cam"><iframe id="app" src="${appUrl}" title="Chore Pet"></iframe></div></div>
<div class="frame" id="frame" style="left:${WIN.x - BORDER}px;top:${WIN.y - BORDER}px;width:${WIN.w + 2 * BORDER}px;height:${WIN.h + 2 * BORDER}px"></div>
<div class="badge">${logo('small')}</div>
<div class="chip" id="chip"></div>
<div class="tap" id="tap"></div>
<div class="cap" id="cap"></div>
<div class="fx" id="fx"></div>
<img class="snap" id="snap" alt="">
<div class="card" id="outro">
  ${logo('big')}
  <div class="pets" id="pets"></div>
  <div class="tag">Your real chores keep your pet <em>happy.</em></div>
  <div class="link">${URL_TEXT}</div>
  <div class="small">No sign-up. Works offline.</div>
</div>
</div>
<script>
const $ = (id) => document.getElementById(id)
const reflow = (el) => void el.offsetWidth
const words = (text) => {
  let i = 0
  return text.split('\\n').map((line) => line.split(' ').map((w) => {
    const accent = /^\\*/.test(w)
    const clean = w.replace(/\\*/g, '').replace(/[&<]/g, (c) => ({ '&': '&amp;', '<': '&lt;' })[c])
    return '<span class="w' + (accent ? ' a' : '') + '" style="--i:' + (i++) + '">' + clean + '</span>'
  }).join(' ')).join('<br>')
}
// "*word*" (or "*two words*") is the accent; a newline breaks the line.
const accentRuns = (text) => text.replace(/\\*([^*]+)\\*/g, (m, run) => run.split(' ').map((w) => '*' + w + '*').join(' '))
window.say = (text, set) => {
  const el = $('cap')
  el.classList.remove('show', 'hide', 'set')
  if (set) el.classList.add('set')
  if (!text) { el.classList.add('hide'); return }
  el.innerHTML = '<div class="lines">' + words(accentRuns(text)) + '</div>'
  reflow(el)
  el.classList.add('show')
}
window.unsay = () => { $('cap').classList.remove('show'); $('cap').classList.add('hide') }
window.calm = (on) => document.body.classList.toggle('calm', on)
// The camera: a transform on the app, a matte (insets, px) on the window, the outline around what shows.
window.camTo = (tx, ty, s, inset, seconds, cut) => {
  const stage = $('stage')
  stage.classList.toggle('cut', Boolean(cut))
  document.documentElement.style.setProperty('--camms', seconds + 's')
  const [t, r, b, l] = inset
  $('win').scrollTop = 0; $('win').scrollLeft = 0
  $('cam').style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')'
  $('win').style.clipPath = 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round 30px)'
  const f = $('frame')
  f.style.left = (${WIN.x} + l - ${BORDER}) + 'px'
  f.style.top = (${WIN.y} + t - ${BORDER}) + 'px'
  f.style.width = (${WIN.w} - l - r + ${2 * BORDER}) + 'px'
  f.style.height = (${WIN.h} - t - b + ${2 * BORDER}) + 'px'
  if (cut) { reflow(stage); stage.classList.remove('cut') }
}
window.chip = (text, x, y) => { const c = $('chip'); c.classList.remove('show'); if (!text) return; c.textContent = text; c.style.left = x + 'px'; c.style.top = y + 'px'; reflow(c); c.classList.add('show') }
window.tapAt = (x, y) => { const el = $('tap'); el.style.left = x + 'px'; el.style.top = y + 'px'; el.classList.remove('go'); reflow(el); el.classList.add('go') }
window.ringAt = (x, y, w, h, r) => {
  const el = document.createElement('div')
  el.className = 'ring2'
  el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;border-radius:' + r + 'px'
  el.addEventListener('animationend', () => el.remove())
  $('stage').appendChild(el)
  reflow(el)
  el.classList.add('go')
}
window.snapShow = async (src, r, z) => {
  const el = $('snap')
  el.classList.remove('on', 'go')
  el.src = src
  await el.decode()
  el.style.cssText = 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;z-index:' + z
  el.classList.add('on')
}
window.snapFade = (seconds) => {
  const el = $('snap')
  el.style.setProperty('--fade', seconds + 's')
  reflow(el)
  el.classList.add('go')
  el.addEventListener('transitionend', () => el.classList.remove('on', 'go'), { once: true })
}
window.outro = (svgs, names) => {
  $('pets').innerHTML = svgs.map((svg, i) => '<div class="pet" style="--i:' + i + '">' + svg + '<span class="nm">' + names[i] + '</span></div>').join('')
  $('outro').classList.add('on')
}
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
    const size = 9 + rnd() * 7
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
const AUDIO = process.env.AUDIO !== '0'
let cut = 0
let casting = false
const heard = []
const marks = []
const ctx = await browser.newContext({ viewport: { width: STAGE.w * SCALE, height: STAGE.h * SCALE }, hasTouch: true, serviceWorkers: 'block' })
await isolate(ctx)
ctx.setDefaultTimeout(30000 * K)
if (K !== 1) await ctx.addInitScript(slowAnimations, K)
if (AUDIO) {
  await ctx.addInitScript(interceptAudio)
  await ctx.exposeFunction('__sfx', (name, at) => { if (casting) heard.push({ name, t: at / 1000 - cut, late: Date.now() - at }) })
}
await ctx.route(`${app.url}__stage.html`, (route) => route.fulfill({ contentType: 'text/html', body: stageHtml(app.url) }))
const stage = await ctx.newPage()
rmSync(WORK, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })

// The latest Thursday at 10:00 is "today" in the story (as in record-demo.mjs, so the weekly chores play out
// the same whichever day this runs); the sample home is opened two days before it, so it is two days behind.
const today = new Date(); today.setHours(10, 0, 0, 0)
today.setDate(today.getDate() - ((today.getDay() - 4 + 7) % 7))
await stage.clock.install({ time: new Date(today.getTime() - 2 * DAY) })
const errors = []
stage.on('pageerror', (e) => errors.push(e.message))
stage.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await stage.goto(`${app.url}__stage.html`, { waitUntil: 'load' })
const phone = stage.frames().find((f) => f !== stage.mainFrame())
await phone.getByRole('button', { name: 'Try a sample home' }).waitFor()
// The end card's pets are the app's own art, from its landing page.
const pets = await phone.evaluate(() => ({
  svgs: [...document.querySelectorAll('.landing-pet-art svg')].map((s) => s.outerHTML),
  names: [...document.querySelectorAll('.landing-pet-name')].map((n) => n.textContent),
}))
await stage.evaluate(() => document.fonts.load("900 100px 'Nunito'").then(() => document.fonts.ready))
// Off camera, so these are clicks in the page.
await phone.getByRole('button', { name: 'Try a sample home' }).evaluate((b) => b.click())
await phone.getByRole('button', { name: 'Make it mine' }).evaluate((b) => b.click()) // no sample banner over the room
await phone.getByRole('navigation').waitFor()
await stage.clock.fastForward(2 * DAY)
await stage.waitForTimeout(1500)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let driving = false
let driver = null
const drive = () => {
  if (driving) return
  driving = true
  driver = (async () => {
    let last = Date.now()
    let owed = 0
    while (driving) {
      await sleep(10)
      const at = Date.now()
      owed += (at - last) / K
      last = at
      const whole = Math.floor(owed)
      if (whole >= 1) { owed -= whole; await stage.clock.runFor(whole) }
    }
  })()
}
const halt = async () => { driving = false; await driver }
// The clock is driven by hand even at SLOW=1 (then in real time), so halt() can still hold a shot.
const freeze = async () => { await stage.clock.pauseAt((await stage.evaluate(() => Date.now())) + 20); drive() }
const thaw = async () => { await halt(); await stage.clock.resume() }

// Wait (off camera) for Mochi to go over to the sink and say something about it, so the story opens on that.
let objectIds = {}
const readObjects = async () => {
  const snap = await readSnapshot(phone)
  objectIds = Object.fromEntries(Object.values(snap.tables.placed_objects).map((o) => [o.catalogId, o.id]))
}
await readObjects()
{
  const near = () => phone.evaluate((id) => {
    const sink = document.querySelector(`[data-object-id="${id}"]`)?.getBoundingClientRect()
    const pet = [...document.querySelectorAll('[aria-label]')].find((e) => /^Mochi, feeling/.test(e.getAttribute('aria-label')))?.getBoundingClientRect()
    if (!sink || !pet || !document.querySelector('.pet-bubble')) return false
    return Math.hypot(sink.x + sink.width / 2 - (pet.x + pet.width / 2), sink.y + sink.height / 2 - (pet.y + pet.height / 2)) < 75
  }, objectIds.sink)
  for (let i = 0; i < 90 && !(await near()); i++) await stage.waitForTimeout(400)
}
await freeze()
await halt() // the JS clock is held through the opening: Mochi stays by the sink with its line up

const frames = []
const cdp = await ctx.newCDPSession(stage)
let pausedAt = 0
const segments = []
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
  segments.push({ from, to, speed: Math.max(1, (to - from - fixedReal) / Math.max(0.3 * K, seconds * K - fixedPlay)), fixed: false })
}
let shooting = false // a still is being taken for a cross-fade: Chrome may draw a frame or two oddly meanwhile
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  if (shooting) return
  const file = `${FRAMES}/${String(frames.length).padStart(5, '0')}.jpg`
  writeFileSync(file, Buffer.from(data, 'base64'))
  frames.push({ file, ts: metadata.timestamp, t: Math.max(metadata.timestamp - cut, frames.at(-1)?.t ?? 0) })
})
const startCast = async () => { await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1 }); casting = true }
const pauseCast = async () => { casting = false; await cdp.send('Page.stopScreencast'); pausedAt = Date.now() / 1000 }
const resumeCast = async () => { cut += Date.now() / 1000 - pausedAt; await startCast() }
const mark = (name) => marks.push({ name, t: now() })
// A sound of the app's own (scripts/demo-audio.mjs renders it), placed on a stage beat.
const cue = (name) => { if (casting) heard.push({ name, t: now(), late: 0 }) }

// Time is written in seconds of video: `hold(2)` is two seconds on screen.
const hold = (seconds) => stage.waitForTimeout(Math.max(40, seconds * 1000 * K))
const t0 = Date.now()
const videoAt = (t = now()) => (frames.length ? playTime(frames[0].t, t) / K : 0)
const log = (what) => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s  video ${videoAt().toFixed(1).padStart(5)}s  ${what}`)

// Captions: each one stays up for at least (words / 2.5) + 1 seconds; a new one waits until the last has had its time.
const captions = []
let shown = null
const minFor = (text) => text.replace(/\*/g, '').split(/\s+/).filter(Boolean).length / 2.5 + 1
const settleCaption = async () => {
  if (!shown) return
  const left = minFor(shown.text) + 0.15 - (videoAt() - shown.start)
  if (left > 0) await hold(left)
}
const endCaption = () => { if (shown) { captions.push({ ...shown, end: videoAt() }); shown = null } }
const say = async (text, set = false) => {
  await settleCaption()
  endCaption()
  await stage.evaluate(([t, st]) => window.say(t, st), [text, set])
  shown = { text, where: 'caption', start: videoAt() }
}
const unsay = async () => {
  await settleCaption()
  endCaption()
  await stage.evaluate(() => window.unsay())
}

// --- Camera ----------------------------------------------------------------------------------
// Boxes in the app's own CSS px (the iframe's viewport), read live.
const box = (b) => (b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null)
// Missing elements give null at once (no waiting for them to turn up).
const rectOf = async (locator) => ((await locator.count()) ? box(await locator.first().evaluate((e) => e.getBoundingClientRect().toJSON()).catch(() => null)) : null)
/** A box once it has stopped moving (rows slide in, sheets spring up). */
const settledRect = async (locator) => {
  let a = await rectOf(locator)
  for (let i = 0; i < 12; i++) {
    await stage.waitForTimeout(80 * K)
    const b = await rectOf(locator)
    if (a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.h - b.h) < 0.5) return b
    a = b
  }
  return a
}
const union = (...rs) => {
  const list = rs.filter(Boolean)
  const x = Math.min(...list.map((r) => r.x))
  const y = Math.min(...list.map((r) => r.y))
  return { x, y, w: Math.max(...list.map((r) => r.x + r.w)) - x, h: Math.max(...list.map((r) => r.y + r.h)) - y }
}
const grow = (r, dx, dy = dx) => ({ x: r.x - dx, y: r.y - dy, w: r.w + 2 * dx, h: r.h + 2 * dy })
let cam = { tx: 0, ty: 0, s: 1, inset: [0, 0, 0, 0] }
let camMoved = 0
let camSeconds = CAM_S
/**
 * Frame a box of the app in the window: as big as fits (up to `max`), centred. `band` ({x, y, w, h}, app px) is
 * the most the shot may show: the matte trims the window to it, so a header or a list next to the subject is
 * either fully out or, if the band takes it in, fully in. The default band is the whole app.
 */
const FADE = 0.35 // seconds of video a cross-fade between shots takes
/**
 * A change of shot as a cross-fade: a still of the window as it is now is laid over it, `fn` changes what is
 * underneath (the camera, the app), and the still fades out. With `removeTime`, the time `fn` takes is cut from
 * the video (a sheet springing up or sliding away happens unseen), so nothing is ever caught half in the shot.
 * `whole` takes the whole stage (for the one cut in the middle).
 */
const transition = async (fn, { removeTime = false, whole = false, fade = FADE, beforeFade = null } = {}) => {
  const r = whole ? { x: 0, y: 0, w: STAGE.w, h: STAGE.h } : { x: WIN.x - 9, y: WIN.y - 9, w: WIN.w + 18, h: WIN.h + 20 }
  shooting = true
  const shot = await stage.screenshot({ type: 'jpeg', quality: 92, clip: { x: r.x * SCALE, y: r.y * SCALE, width: r.w * SCALE, height: r.h * SCALE } })
  await stage.evaluate(([src, r, z]) => window.snapShow(src, r, z), [`data:image/jpeg;base64,${shot.toString('base64')}`, r, whole ? 11 : 3])
  await stage.waitForTimeout(120 * K)
  shooting = false
  const from = now()
  await fn()
  if (removeTime) segments.push({ from, to: now(), speed: 1e4, fixed: true })
  if (beforeFade) await beforeFade()
  await stage.evaluate((f) => window.snapFade(f), fade)
  camMoved = Date.now()
  camSeconds = fade
}
const frame = async (r, { pad = 8, max = 4, cut: jump = false, band = { x: 0, y: 0, w: APP.w, h: APP.h }, seconds = CAM_S, widened = false, move = false } = {}) => {
  const avoid = [await rectOf(phone.locator('.room-pill'))]
  const s = Math.min(VIEW.w / (r.w + 2 * pad), VIEW.h / (r.h + 2 * pad), max)
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
  let tx = clamp(VIEW.w / 2 - (r.x + r.w / 2) * s, VIEW.w - APP.w * s, 0)
  let ty = clamp(VIEW.h / 2 - (r.y + r.h / 2) * s, VIEW.h - APP.h * s, 0)
  // What of the app would show, and how much of it lies outside the band.
  const vx = -tx / s
  const vy = -ty / s
  const bx0 = Math.max(0, band.x)
  const by0 = Math.max(0, band.y)
  const bx1 = Math.min(APP.w, band.x + band.w)
  const by1 = Math.min(APP.h, band.y + band.h)
  let it = Math.max(0, (by0 - vy) * s)
  let ib = Math.max(0, (vy + VIEW.h / s - by1) * s)
  let il = Math.max(0, (bx0 - vx) * s)
  let ir = Math.max(0, (vx + VIEW.w / s - bx1) * s)
  // Bits of UI that would be cut by the edge of the shot (the room pill) are matted out whole instead: the
  // edge moves in past them, on whichever side loses the least and leaves the subject in view.
  for (const a of avoid) {
    if (!a) continue
    const v = { x0: vx + il / s, y0: vy + it / s, x1: vx + (VIEW.w - ir) / s, y1: vy + (VIEW.h - ib) / s }
    const ax1 = a.x + a.w
    const ay1 = a.y + a.h
    const overlaps = a.x < v.x1 && ax1 > v.x0 && a.y < v.y1 && ay1 > v.y0
    const inside = a.x >= v.x0 && ax1 <= v.x1 && a.y >= v.y0 && ay1 <= v.y1
    if (!overlaps || inside) continue
    const w = v.x1 - v.x0
    const h = v.y1 - v.y0
    const options = [
      ax1 <= r.x + 1 && { lost: (ax1 - v.x0) * h, apply: () => { il = (ax1 + 2 - vx) * s } },
      ay1 <= r.y + 1 && { lost: (ay1 - v.y0) * w, apply: () => { it = (ay1 + 2 - vy) * s } },
      a.x >= r.x + r.w - 1 && { lost: (v.x1 - a.x) * h, apply: () => { ir = (vx + VIEW.w / s - (a.x - 2)) * s } },
      a.y >= r.y + r.h - 1 && { lost: (v.y1 - a.y) * w, apply: () => { ib = (vy + VIEW.h / s - (a.y - 2)) * s } },
    ].filter(Boolean).sort((p, q) => p.lost - q.lost)
    if (options.length) options[0].apply()
    // It can't be matted out without cutting into the subject: take it in, whole, instead.
    else if (!widened) return frame(union(r, grow(a, 3)), { pad, max, cut: jump, band: union(band, grow(a, 3)), seconds, widened: true, move })
  }
  // Centre what is left in the window.
  ty -= (it - ib) / 2; it = ib = (it + ib) / 2
  tx -= (il - ir) / 2; il = ir = (il + ir) / 2
  cam = { tx, ty, s, inset: [it, ir, ib, il] }
  const apply = () => stage.evaluate(([tx, ty, s, inset, sec, c]) => window.camTo(tx, ty, s, inset, sec, c), [tx, ty, s, cam.inset, seconds, !move])
  if (jump || move) {
    camMoved = Date.now()
    camSeconds = jump ? 0 : seconds
    await apply()
  } else await transition(apply)
}
/** Where a point of the app lands on the stage, with the camera at rest. */
const onStage = (x, y) => [WIN.x + cam.tx + x * cam.s, WIN.y + cam.ty + y * cam.s]
/** The part of the app the window shows, with the camera at rest. */
const shownRect = () => {
  const [t, r, b, l] = cam.inset
  return { x: (l - cam.tx) / cam.s, y: (t - cam.ty) / cam.s, w: (VIEW.w - l - r) / cam.s, h: (VIEW.h - t - b) / cam.s }
}
const camSettled = async () => { const left = camMoved + camSeconds * 1000 * K - Date.now(); if (left > 0) await stage.waitForTimeout(left) }

const pet = () => phone.getByRole('button', { name: /^Mochi, feeling/ })
const petRect = () => rectOf(pet())
const bubbleRect = async () => ((await phone.locator('.pet-bubble').count()) ? rectOf(phone.locator('.pet-bubble')) : null)
const bubbleText = async () => ((await phone.locator('.pet-bubble').count()) ? phone.locator('.pet-bubble').first().innerText().catch(() => '') : '')
/** Wait for Mochi's cheer: a new line in its bubble (the chore just done). */
const cheered = async (before) => {
  for (let i = 0; i < 60; i++) {
    const now = await bubbleText()
    if (now && now !== before) return
    await stage.waitForTimeout(50 * K)
  }
}
const roomRect = () => rectOf(phone.locator('.living-room'))
const headerRect = () => rectOf(phone.locator('.home-top'))
const giftRect = async () => union(await settledRect(phone.locator('.gift-title')), await rectOf(phone.locator('.gift-stage')), await rectOf(phone.locator('.gift-actions')))
const mood = async () => (await phone.locator('.home-top').innerText()).match(/Feeling (\w+)/)?.[1] ?? 'meh'
const objectRect = (catalogId) => rectOf(phone.locator(`[data-object-id="${objectIds[catalogId]}"]`))
/** The band of the room: everything between the header and the list. */
const roomBand = async () => {
  const r = await roomRect()
  const head = await rectOf(phone.locator('.home-top'))
  const next = await rectOf(phone.locator('.cl-heading'))
  const y0 = Math.max(r.y - 2, head ? head.y + head.h + 2 : 0)
  const y1 = Math.min(r.y + r.h + 2, next ? next.y - 2 : APP.h)
  const band = { x: 0, y: y0, w: APP.w, h: y1 - y0 }
  // Mochi's speech bubble can reach above the room: it comes in whole.
  const b = await bubbleRect()
  return b ? union(band, grow(b, 3)) : band
}
/** The sink, with the mess that floats over it, and a band that keeps the rest of the kitchen out. */
const sinkShot = async () => {
  const s = await objectRect('sink')
  const r = { x: s.x - 4, y: s.y - 30, w: s.w + 8, h: s.h + 36 }
  const band = grow(r, 16, 10)
  // Mochi's speech bubble, if it hangs over the top, is left out whole: the band starts below it.
  const b = await bubbleRect()
  if (b && b.x < band.x + band.w && b.x + b.w > band.x && b.y < band.y + band.h && b.y + b.h > band.y) {
    const top = b.y + b.h + 3
    // ...unless that would cut into the sink itself: then the bubble comes in whole instead.
    if (band.y + band.h - top >= s.h + 8) {
      band.h -= top - band.y
      band.y = top
    } else {
      const both = union(r, grow(b, 3))
      return { r: both, band: grow(both, 12, 8) }
    }
  }
  return { r, band }
}
/** The sink once it is clean: basin and counter only, so no neighbour's mess above it is in the shot. */
const cleanSinkShot = async () => {
  const s = await objectRect('sink')
  // The basin and tap sit in the upper middle of the sink's box; the stove (clean) overlaps its lower left and the
  // fridge (whose old food may be late) its right, so the shot stops short of the fridge.
  const r = { x: s.x - 12, y: s.y - 6, w: s.w + 9, h: s.h + 2 }
  return { r, band: grow(r, 2, 2) }
}
/** Close on Mochi, with its speech bubble when it is talking. */
const petClose = async (size = 110) => {
  const p = await petRect()
  const square = { x: p.x + p.w / 2 - size / 2, y: p.y + p.h / 2 - size / 2 - 6, w: size, h: size }
  const b = await bubbleRect()
  return b ? union(square, grow(b, 4)) : square
}
const framePet = async (size, opts = {}) => frame(await petClose(size), { pad: 10, max: 3.6, band: await roomBand(), ...opts })

// A tap, with a marker where the finger lands, once the camera is still and the target has stopped moving.
const press = async (locator) => {
  const target = locator.first()
  await target.waitFor({ state: 'visible' })
  // Something outside the shot can't be tapped (or seen): bring it in, with the room above it.
  const r = await rectOf(target)
  const v = shownRect()
  if (r && (r.x < v.x - 1 || r.y < v.y - 1 || r.x + r.w > v.x + v.w + 1 || r.y + r.h > v.y + v.h + 1)) {
    const room = await roomRect()
    // A row in the list comes in at its full width, with the room above it.
    const both = r.y > room.y ? union(room, { x: 16, y: r.y, w: APP.w - 32, h: r.h }) : grow(r, 20)
    await frame(both, { pad: 6, band: grow(both, 6) })
  }
  await camSettled()
  let b = await target.boundingBox()
  for (let i = 0; i < 12; i++) {
    await stage.waitForTimeout(60 * K)
    const again = await target.boundingBox()
    const still = Math.abs(again.x - b.x) < 0.5 && Math.abs(again.y - b.y) < 0.5
    b = again
    if (still) break
  }
  const x = b.x + b.width / 2
  const y = b.y + b.height / 2
  await stage.evaluate(([x, y]) => window.tapAt(x, y), [x / SCALE, y / SCALE])
  // Clicked in the page, where the marker shows: a tap through the zoomed, matted window can miss.
  await target.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })))
}
/** Frame an element, and follow it if the layout moves it while the camera travels (rows and sheets settle). */
const frameEl = async (locator, opts) => {
  let r = await settledRect(locator)
  await frame(r, opts(r))
  for (let i = 0; i < 3; i++) {
    await camSettled()
    const again = await rectOf(locator)
    if (!again || (Math.abs(again.x - r.x) < 1 && Math.abs(again.y - r.y) < 1 && Math.abs(again.h - r.h) < 1)) return
    r = again
    await frame(r, opts(r))
  }
}
const click = (locator) => locator.first().evaluate((b) => b.click())
/** Tap the first Done in the list and wait for that row to fold away, so the next tap finds the next row. */
const doneFirst = async () => {
  const button = phone.getByRole('button', { name: /^Done: / }).first()
  const label = await button.getAttribute('aria-label')
  await press(button)
  await phone.getByRole('button', { name: label, exact: true }).waitFor({ state: 'detached', timeout: 5000 * K }).catch(() => {})
  await hold(0.25)
}
const ring = async (r, radius = 16, padding = 6) => {
  const [x, y] = onStage(r.x - padding, r.y - padding)
  await stage.evaluate(([x, y, w, h, rr]) => window.ringAt(x, y, w, h, rr), [x, y, (r.w + 2 * padding) * cam.s, (r.h + 2 * padding) * cam.s, radius])
}
const celebrate = () => {
  const [t, r, b, l] = cam.inset
  const x0 = WIN.x + l
  const x1 = WIN.x + WIN.w - r
  const yMid = WIN.y + (t + WIN.h - b) / 2
  return stage.evaluate(([x0, x1, y, top]) => {
    window.burst(x0 + 20, y + 60, 20, 1.2, 240)
    window.burst(x1 - 20, y + 60, 20, -1.2, 240)
    window.burst((x0 + x1) / 2, top + 30, 18, 0, 260, 3)
  }, [x0, x1, yMid, WIN.y + t])
}
const skipDay = async () => {
  const was = driving
  await halt()
  await stage.clock.fastForward(DAY)
  if (was) drive()
}
/** The day counter, at the bottom of what the window shows. */
const chip = async (text) => {
  const [, , b] = cam.inset
  await stage.evaluate(([t, x, y]) => window.chip(t, x, y), [text, WIN.x + WIN.w / 2, WIN.y + WIN.h - b - 16])
}
/** Open a gift that is waiting. `quick`: it goes by fast. Otherwise `caption` is said over it, at full speed. */
const giftButton = () => phone.getByRole('button', { name: 'Open it', exact: true })
const giftPanel = () => phone.locator('.gift-panel')
/** The gift sheet springs up unseen; the shot cross-fades to it once it has settled. */
const awaitGift = (timeout = 8000) => transition(async () => {
  drive()
  await giftButton().waitFor({ timeout: timeout * K })
  await settledRect(giftPanel())
  await frame(await giftRect(), { pad: 10, cut: true })
}, { removeTime: true })
/** Close the gift: it slides away unseen, and `next` frames the next shot (with cut: true) underneath. */
const leaveGift = (button, next) => transition(async () => {
  await click(phone.getByRole('button', { name: button }))
  for (let i = 0; i < 40 && (await giftPanel().count()); i++) await stage.waitForTimeout(80 * K)
  await hold(0.2)
  await next()
}, { removeTime: true })
/** Gifts come a moment after their chore, and queue: skip each one until none has come for a while. */
const clearGifts = async () => {
  for (let quiet = 0; quiet < 4;) {
    await stage.waitForTimeout(500 * K)
    if (await giftPanel().count()) { if (await giftButton().count()) await skipGift(); else await click(phone.getByRole('button', { name: /^(Maybe later|Lovely!)$/ })); quiet = 0 } else quiet++
  }
}
/** A gift during the time-lapse: opened and put away, all of it cut from the video (it would only flash by). */
const skipGift = async () => {
  const from = now()
  await click(giftButton())
  await phone.getByRole('button', { name: /^(Maybe later|Lovely!|Put it on)$/ }).first().waitFor()
  await click(phone.getByRole('button', { name: /^(Maybe later|Lovely!)$/ }))
  for (let i = 0; i < 40 && (await giftPanel().count()); i++) await stage.waitForTimeout(80 * K)
  await hold(0.15)
  segments.push({ from, to: now(), speed: 1e4, fixed: true })
}
const reloadPhone = async () => {
  await phone.evaluate(() => location.reload())
  await stage.waitForTimeout(600)
  await phone.getByRole('navigation').waitFor()
  await stage.waitForTimeout(1200)
}
const stopAfter = (scene) => { if (STOP === scene) throw new Error('stop') }

try {
// --- 1. Cold open: the stinky sink, then Mochi beside it -----------------------------------------------
const sink0 = await sinkShot()
await frame(sink0.r, { pad: 4, max: 4.6, band: sink0.band, cut: true })
await stage.evaluate(() => window.calm(true))
await say('Chores are\n*boring.*', true) // fully set from the first frame
await startCast()
log('open')
await hold(2.25)
await framePet(110)
await say('So we gave\nthem a *pet.*')
setTimeout(() => cue('chirp'), 0.6 * 1000 * K)
await hold(3.3)
// The whole kitchen, with the header: the mess, and the health bar and mood ("Feeling meh").
const room0 = await roomRect()
const head0 = await headerRect()
await frame(union(head0, room0), { pad: 4, band: grow(union(head0, room0), 2) })
await say('Late chores show up\nas *mess*.')
await hold(3.3)
stopAfter('open')

// --- 2. Each thing you place brings a chore: a toilet in a new bathroom ----------------------------------
drive()
// The bathroom is added unseen; the shot opens on it with the toilet ready to place.
await transition(async () => {
  await click(phone.getByRole('button', { name: /^Rooms: Kitchen/ }))
  await hold(0.25)
  await click(phone.getByRole('button', { name: 'Add a bathroom' }))
  await phone.locator('.build-room').waitFor()
  await hold(0.4)
  await click(phone.getByRole('button', { name: /^Toilet/ }))
  await hold(0.3)
  const br = await settledRect(phone.locator('.build-room'))
  await frame(br, { pad: 4, band: grow(br, 2), cut: true })
}, { removeTime: true })
await say('Each thing you place\nbrings a *real chore.*')
await hold(0.4)
await click(phone.getByRole('button', { name: 'Place it', exact: true }))
await hold(0.75) // it drops into the room
const brings = phone.locator('.sheet-block').filter({ hasText: 'Chores it brings' })
await transition(async () => {
  await brings.first().waitFor()
  const r = await settledRect(brings)
  await frame(r, { pad: 6, band: grow(r, 4), max: 2.2, cut: true })
}, { removeTime: true })
await ring(await rectOf(phone.locator('.sheet-chores li')), 18, 4)
await hold(1.5)
await settleCaption()
// Back to the kitchen unseen, straight onto the dirty sink.
let sink1 = null
await transition(async () => {
  await click(phone.getByRole('button', { name: 'Close', exact: true }))
  await hold(0.3)
  await click(phone.getByRole('button', { name: 'Finish', exact: true }))
  await hold(0.6)
  await click(phone.getByRole('button', { name: /^Rooms: Bathroom/ }))
  await hold(0.4)
  await click(phone.getByRole('button', { name: /^Show the kitchen/ }))
  await hold(0.8)
  sink1 = await sinkShot()
  await frame(sink1.r, { pad: 4, max: 4.6, band: sink1.band, cut: true })
}, { removeTime: true })
log('build')
stopAfter('build')

// --- 3. Done on the dishes ------------------------------------------------------------------------
await say('Do the real dishes,\nthen tap *Done.*')
await hold(1.4)
await frameEl(phone.locator('.cl-row').filter({ hasText: 'Wash the dishes' }), (r) => ({ pad: 4, band: grow(r, 5) }))
await hold(0.6)
const lineBefore = await bubbleText()
await press(phone.getByRole('button', { name: 'Done: Wash the dishes' }))
await hold(0.45) // the row ticks to "Nice"
// The row folds away and the list moves up unseen; the shot fades to Mochi's cheer.
await transition(async () => {
  await cheered(lineBefore)
  await settledRect(phone.locator('.pet-bubble')) // the bubble finds a spot clear of the furniture
  await halt() // hold the cheer: the gift sheet waits
  await framePet(110, { cut: true })
}, { removeTime: true })
await say('Mochi *cheers!*')
await hold(1.9)
log('done')
stopAfter('done')

// --- 4. A gift drops in: the red beanie; then the same sink, clean -------------------------------------
await awaitGift()
await say('And a *gift*\ndrops in!')
await hold(1.1)
await press(giftButton())
await hold(0.35)
if ((await giftButton().count()) && (await giftButton().isEnabled().catch(() => false))) await press(giftButton())
await hold(0.5)
await celebrate()
await hold(0.4)
await say('A red *beanie!*')
await hold(1.6)
// The sheet slides away unseen and Mochi's cheer line goes; then the sink, basin and counter only.
await leaveGift('Put it on', async () => {
  for (let i = 0; i < 60 && (await phone.locator('.pet-bubble').count()); i++) await stage.waitForTimeout(80 * K)
  await halt()
  const c = await cleanSinkShot()
  await frame(c.r, { pad: 2, max: 8, band: c.band, cut: true })
})
await say('And the sink?\n*Sparkling.*')
await hold(2.4)
log('gift')
stopAfter('gift')

// --- 5. A few days later: the mess creeps back, the health bar falls -------------------------------
drive()
await transition(async () => {
  await phone.getByText(/^Done: /).waitFor({ state: 'hidden', timeout: 9000 * K }).catch(() => {})
  const room1 = await roomRect()
  const head1 = await headerRect()
  await frame(union(head1, room1), { pad: 4, band: grow(union(head1, room1), 2), cut: true })
}, { removeTime: true })
await say('A few days\n*later…*')
let days = 0
for (; days < 4; days++) {
  await skipDay()
  await chip(days === 0 ? '1 day later' : `${days + 1} days later`)
  await hold(0.95)
  const m = await mood()
  if (days >= 2 && (m === 'scruffy' || m === 'poorly' || m === 'sick')) { days++; break }
}
const scruffy = await mood()
await halt()
await stage.evaluate(() => window.chip(''))
await framePet(110)
await say(`Mochi feels\n*${scruffy}.*`)
await hold(2.2)
log(`lapse (${days} days, ${scruffy})`)
stopAfter('lapse')

// --- 6. You catch up: one gift held, the room clean, Mochi happy ----------------------------------
drive()
// The whole "Up next" list, so rows folding away and moving up all stay inside the shot.
const listRect = () => settledRect(phone.locator('.cl-section').first())
const list0 = await listRect()
await frame(list0, { pad: 6, band: grow(list0, 4) })
await say('So you catch up,\none by *one.*')
await hold(0.6)
await doneFirst()
await doneFirst()
await halt() // chore 3 earns the teddy bear: it waits until the shot is ready for it
await awaitGift(6000)
await say('Outfits and decor,\nonly from *real chores.*')
await press(giftButton())
await hold(0.3)
if ((await giftButton().count()) && (await giftButton().isEnabled().catch(() => false))) await press(giftButton())
await hold(1.3)
await settleCaption()
await leaveGift('Maybe later', async () => {
  const r = await listRect()
  await frame(r, { pad: 6, band: grow(r, 4), cut: true })
})
// The rest, time-lapsed. Their gifts (the bow, the lamp) would only flash by, so they are cut out.
await lapse(0.9, async () => {
  for (let i = 0; i < 30; i++) {
    if (await giftButton().count()) await skipGift()
    // The last one is tapped unseen, below: the list shrinking away to "All done" is not shown.
    if ((await phone.getByRole('button', { name: /^Done: / }).count()) <= 1) break
    await doneFirst()
    // A milestone's gift comes a moment after its tap: the wait for it is cut too.
    const from = now()
    await clearGifts()
    segments.push({ from, to: now(), speed: 1e4, fixed: true })
  }
})
await transition(async () => {
  const last = phone.getByRole('button', { name: /^Done: / })
  if (await last.count()) await click(last)
  await clearGifts()
  await phone.getByText(/^Done: /).waitFor({ state: 'hidden', timeout: 9000 * K }).catch(() => {})
  const room2 = await roomRect()
  await frame(room2, { pad: 4, band: await roomBand(), cut: true })
}, { removeTime: true })
const happy = await mood()
await say(`All clean. Mochi is\n*${happy}* again.`)
await hold(1.5)
await halt()
await framePet(120)
await hold(1.7)
log(`caught up (${happy})`)
stopAfter('catchup')

// --- 7. Weeks later: a cosy home (a cross-fade over the one cut), then the end card ------------------------
await unsay()
await transition(async () => {
  await pauseCast()
  await thaw()
  // Off camera: 140 chores on, every reward earned, a furnished living room, and Mochi dressed up.
  await seedMilestone(phone, { choreCount: 140, bestStreak: 24, unlockedItems: ALL_REWARDS })
  await seedPet(phone, { equipped: { head: 'beanie-red', face: 'heart-glasses', neck: 'scarf' } })
  await reloadPhone()
  await click(phone.getByRole('button', { name: /^Rooms: Kitchen/ }))
  await stage.waitForTimeout(600)
  await click(phone.getByRole('button', { name: 'Add a living room', exact: true }))
  await stage.waitForTimeout(900)
  for (const thing of LIVING_ROOM.items) {
    await click(phone.getByRole('button', { name: new RegExp(`^${thing}`) }))
    await stage.waitForTimeout(350)
    await click(phone.getByRole('button', { name: 'Place it', exact: true }))
    await stage.waitForTimeout(350)
    await click(phone.getByRole('button', { name: 'Close', exact: true }))
    await stage.waitForTimeout(250)
  }
  await seedRoom(phone, LIVING_ROOM)
  await reloadPhone()
  const finish = phone.getByRole('button', { name: 'Finish', exact: true })
  if (await finish.count()) await click(finish)
  await click(phone.getByRole('navigation').getByRole('button', { name: /^Home\b/ }))
  await stage.waitForTimeout(2500)
  const room3 = await settledRect(phone.locator('.living-room'))
  await frame(room3, { pad: 4, band: await roomBand(), cut: true })
  await stage.waitForTimeout(500)
  await freeze()
  await resumeCast()
  await hold(0.1)
  // The home can still settle once its clock runs again (the list finds its length): frame it again, unseen.
  const room4 = await settledRect(phone.locator('.living-room'))
  await frame(room4, { pad: 4, band: await roomBand(), cut: true })
  mark('intro-out')
}, { whole: true, fade: 0.45 })
await say('Weeks later: more rooms,\nmore *gifts.*')
await hold(0.9)
await halt()
// Tapped in the wide shot, so its hello lands inside the room; then close on it.
await press(pet()) // a hop and a hello
await hold(0.45)
await framePet(130, { max: 3 })
await hold(1.6)
await unsay()
await stage.evaluate(([svgs, names]) => { window.calm(false); window.outro(svgs, names) }, [pets.svgs, pets.names])
mark('outro-in')
shown = { text: 'Your real chores keep your pet happy.', where: 'end card', start: videoAt() }
await hold(4.3)
endCaption()
log('end')
} catch (e) {
  if (e.message !== 'stop') {
    await stage.screenshot({ path: `${WORK}/failed.png` }).catch(() => {})
    console.error(`Failed; the stage is in ${WORK}/failed.png`)
    throw e
  }
  endCaption()
}

casting = false
await cdp.send('Page.stopScreencast')
await halt()
const end = now()

const rel = (f) => f.slice(`${WORK}/`.length)
const list = frames.map((f, i) => `file '${rel(f.file)}'\nduration ${(playTime(f.t, Math.max(f.t, frames[i + 1]?.t ?? end)) / K).toFixed(5)}`)
writeFileSync(`${WORK}/frames.txt`, `${list.join('\n')}\nfile '${rel(frames.at(-1).file)}'\n`)
mkdirSync(dirname(resolve(OUT)), { recursive: true })
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${WORK}/frames.txt`,
  '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-movflags', '+faststart', OUT])
const base = OUT.replace(/\.mp4$/, '')
writeFileSync(`${base}.captions.json`, JSON.stringify(captions.map((c) => ({ text: c.text.replace(/\n/g, ' '), where: c.where, start: +c.start.toFixed(2), end: +c.end.toFixed(2), shown: +(c.end - c.start).toFixed(2), needs: +minFor(c.text).toFixed(2) })), null, 1))
let soundLines = []
if (AUDIO) {
  const toVideo = (e) => ({ ...e, t: playTime(frames[0].t, Math.max(e.t, frames[0].t)) / K })
  writeFileSync(`${base}.audio-events.json`, JSON.stringify({ events: heard.map(toVideo), marks: marks.map(toVideo) }, null, 1))
  soundLines = await addSound({ browser, appUrl: app.url, events: heard.map(toVideo), marks: marks.map(toVideo), video: OUT, work: `${WORK}/audio`, base })
}
await browser.close()
await app.close()
const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).toString())
if (process.env.KEEP_FRAMES !== '1') rmSync(FRAMES, { recursive: true, force: true })
const short = captions.filter((c) => c.end - c.start < minFor(c.text) - 0.05)
console.log(`wrote ${OUT.startsWith(ROOT) ? OUT.slice(ROOT.length) : OUT} (${FORMAT}, ${seconds.toFixed(1)} s, ${FPS} fps) from ${frames.length} frames`, errors.length ? `with page errors: ${errors.join('; ')}` : '')
if (short.length) console.log(`captions shorter than the bar: ${short.map((c) => `"${c.text}"`).join(', ')}`)
if (soundLines.length) console.log(`sound: ${soundLines.at(-1)}`)
