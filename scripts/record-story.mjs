// Records the story cut of the demo video (docs/SPEC.md: in-app screen recording only): a tiny story about
// one pet, Mochi, told with the room and the pet huge on screen. About 85 s, 1080 x 1920, 60 fps, with sound.
//
//   npm run build
//   npm run demo:story           (CHROME=/path/to/chrome if Playwright has no browser of its own)
//
// Writes demo/chore-pet-story.mp4 (OUT=path.mp4 to write elsewhere). The story, in order:
//   - big kinetic type over a soft background: "Chores are boring." / "So we gave them a pet." and Mochi drops in;
//   - an iris opens on Mochi's real kitchen, two days behind: the dishes stink, flies buzz, Mochi feels meh;
//   - every thing in the home brings a real chore; tap Done on the dishes: the sink sparkles, Mochi cheers;
//   - a gift drops in: the red beanie, and Mochi wears it;
//   - "A few days later": the days tick by on camera, the mess creeps back and Mochi gets scruffy;
//   - so you do the dishes, then the rest: Mochi is happy again;
//   - "Weeks later": a cosy home and a dressed-up Mochi, the line "Your real chores keep your pet happy." and the link.
//
// Why portrait: the room is wider than tall, so in a square or a portrait frame it is limited by the width
// and comes out the same size (about 1000 px wide). Portrait keeps that and adds room for big captions above
// it and the chore list below it, so a tap on Done and the sink it cleans fit in one shot.
//
// How it works (the plumbing is record-demo.mjs's, kept the same so both recorders behave alike):
// - The built app runs untouched in an iframe on a "stage" page. The iframe sits inside a big rounded window
//   and a camera (one CSS transform) frames any part of it: the whole room, the sink, Mochi's face, the chore
//   row, the gift. Framings are worked out from the live layout (the pet's and the objects' boxes), so they
//   follow wherever Mochi happens to stand. Everything decorative (captions, cards, the whip, confetti, the
//   tap marker) lives on the stage. Rendered at 2x.
// - Slow motion: the page runs SLOW (4) times slower than real time and ffmpeg divides the timestamps, so the
//   60 fps video has real motion in every frame. Days pass with Playwright's fake clock.
// - Holds: while the camera sits on a reaction, the page's JS clock can be held still for a moment (the pet
//   keeps breathing and blinking, its CSS animations run on). That keeps Mochi where the camera is looking,
//   and gives the cheer time to land before the app's gift sheet slides up.
// - Two cuts, both behind an opaque card: the start (the sample home is opened two days earlier, so the
//   kitchen is properly behind), and "Weeks later" (the home is moved on to 140 chores and every reward,
//   a living room is furnished, and Mochi dressed, with scripts/media-common.mjs's seeding helpers).
// - Every caption stays up for at least (words / 2.5) + 1 seconds of video; the recorder waits if a scene is
//   quicker. The captions and their times are written to <out>.captions.json.
// Set AUDIO=0 for a silent video, FPS=30 for a lighter file, STOP=title|mess|done|gift|lapse|catchup to stop
// after that scene (for iterating), KEEP_FRAMES=1 to keep the frames, URL=... to use a running server.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { addSound, interceptAudio } from './demo-audio.mjs'
import { ALL_REWARDS, isolate, launchBrowser, readSnapshot, ROOT, seedMilestone, seedPet, seedRoom, serveApp } from './media-common.mjs'

const FPS = Number(process.env.FPS ?? 60)
const K = Number(process.env.SLOW ?? 4)
const DAY = 24 * 60 * 60 * 1000
const OUT = process.env.OUT ?? `${ROOT}demo/chore-pet-story.mp4`
const WORK = `${ROOT}demo/story`
const FRAMES = `${WORK}/frames`
const STOP = process.env.STOP ?? ''

// The stage (CSS px, drawn at 2x: the video is 1080 x 1920), the window onto the app inside it, and the app.
const STAGE = { w: 540, h: 960 }
const SCALE = 2
const WIN = { x: 14, y: 262, w: 512, h: 664, border: 5 }
const VIEW = { w: WIN.w - 2 * WIN.border, h: WIN.h - 2 * WIN.border }
const APP = { w: 390, h: 820 }

// A damped spring as a CSS linear() easing, so pops overshoot and settle (as in record-demo.mjs).
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
const CAM = spring(0.86, 9, 1)
const CAM_S = 1.0 // seconds a camera move takes

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

const sparkAt = (x, y, size, fill, delay) =>
  `<svg class="sp tw" viewBox="-1.25 -1.25 2.5 2.5" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;--f:${fill};--dl:${delay}s" aria-hidden="true"><use href="#spk"/></svg>`
const BLOBS = [
  ['#ffcfda', -150, -110, 26, 70, 50],
  ['#9ed8f5', 250, 170, 31, -80, 60],
  ['#ffd65c', -170, 620, 28, 90, -50],
].map(([c, x, y, d, mx, my]) => `<div class="blob" style="left:${x}px;top:${y}px;--c:${c};--d:${d}s;--mx:${mx}px;--my:${my}px"></div>`).join('')
const FLOATERS = [
  [28, 120, 22, '#ffd65c', 0], [500, 150, 26, '#ffffff', 0.7], [24, 950, 20, '#f28fa0', 1.3], [510, 948, 22, '#ffd65c', 0.4],
].map(([x, y, s, f, d]) => sparkAt(x, y, s, f, d)).join('')
const LETTER_COLOURS = ['#f28fa0', '#ffd65c', '#8ccb5e', '#9ed8f5', '#ffcfda', '', '#e86a4a', '#ffd65c', '#6f95f0']
const logo = () => {
  const letters = (word, from) => [...word].map((ch, i) => `<b style="--c:${LETTER_COLOURS[from + i]};--i:${from + i}">${ch}</b>`).join('')
  return `<div class="logo"><span class="word">${letters('Chore', 0)}</span><span class="word">${letters('Pet', 6)}</span></div>`
}

const stageHtml = (appUrl) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Chore Pet story</title>
<style>
@font-face { font-family: 'Nunito'; font-weight: 400 900; src: url('${appUrl}fonts/nunito-latin.woff2') format('woff2'); }
:root { --ink: #2b1e2f; --ground: #efe9ff; --accent: #6f5cf0; --sun: #ffd65c; --pop: ${POP}; --cam: ${CAM}; }
html, body { margin: 0; width: ${STAGE.w * SCALE}px; height: ${STAGE.h * SCALE}px; overflow: hidden; background: var(--ground); font-family: 'Nunito', system-ui, sans-serif; }
.stage { position: relative; width: ${STAGE.w}px; height: ${STAGE.h}px; transform: scale(${SCALE}); transform-origin: 0 0; overflow: hidden; color: var(--ink); }
.bg { position: absolute; inset: 0; overflow: hidden; }
.blob { position: absolute; width: 380px; height: 380px; border-radius: 50%; opacity: .8;
  background: radial-gradient(circle, var(--c) 0%, var(--c) 38%, rgba(255, 255, 255, 0) 70%); animation: drift var(--d) ease-in-out infinite alternate; }
@keyframes drift { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(var(--mx), var(--my), 0) scale(1.1); } }
/* While the app is on screen the background holds still, so the screencast spends its frames on the app. */
.calm .blob, .calm .bg .tw { animation-play-state: paused; }
.sp { position: absolute; display: block; fill: var(--f, #ffd65c); stroke: var(--ink); stroke-width: .2; stroke-linejoin: round; }
.tw { margin: -12px 0 0 -12px; animation: twinkle 2.6s ease-in-out var(--dl, 0s) infinite both; }
@keyframes twinkle { 0%, 100% { transform: translateY(6px) scale(.15) rotate(0deg); opacity: 0; } 50% { transform: translateY(-10px) scale(1) rotate(50deg); opacity: 1; } }

/* Kinetic captions: big words that pop in one after another. "*word*" is the accent. */
.cap { position: absolute; left: 18px; right: 18px; top: 34px; height: 214px; z-index: 5; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.cap .lines { font-weight: 900; font-size: 47px; line-height: 1.08; letter-spacing: -.5px; text-wrap: balance; }
.w { display: inline-block; opacity: 0; transform-origin: 50% 80%; }
.show .w { animation: wpop .6s var(--pop) calc(var(--i) * 95ms) both; }
@keyframes wpop { from { opacity: 0; transform: translateY(28px) scale(.45) rotate(-7deg); } 30% { opacity: 1; } to { opacity: 1; transform: none; } }
.a { color: var(--accent); }
.cap.hide .lines, .title.hide .lines { opacity: 0; transform: translateY(-14px) scale(.9); transition: opacity .2s ease, transform .2s ease; }

/* The title: the same words, bigger, in the middle of the stage. */
.title { position: absolute; left: 0; right: 0; top: 120px; height: 360px; z-index: 6; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.title .lines { font-weight: 900; font-size: 82px; line-height: 1.02; letter-spacing: -2px; }
.mochi { position: absolute; left: 150px; top: 520px; width: 240px; z-index: 6; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.mochi .drop { opacity: 0; transform-origin: 50% 100%; }
.mochi .bob { transform-origin: 50% 100%; line-height: 0; }
.mochi svg { width: 230px; height: auto; display: block; }
.mochi .shadow { position: absolute; left: 50px; right: 50px; top: 206px; height: 26px; border-radius: 50%; background: rgba(43, 30, 47, .15); opacity: 0; }
.mochi .nm { margin-top: 12px; padding: 6px 26px; border: 4px solid var(--ink); border-radius: 999px; background: #fff; box-shadow: 0 5px 0 var(--ink); font-weight: 900; font-size: 34px; opacity: 0; }
.mochi.on .drop { animation: drop 1.05s linear both; }
.mochi.on .bob { animation: bob 1.5s ease-in-out 1.1s infinite; }
.mochi.on .shadow { animation: fadein .3s ease .1s both; }
.mochi.on .nm { animation: rise .55s var(--pop) .75s both; }
.mochi.gone { opacity: 0; transform: scale(.55); transition: opacity .45s ease, transform .6s cubic-bezier(.6, 0, .3, 1); }
@keyframes drop {
  0% { opacity: 0; transform: translateY(-560px) scale(.82, 1.25); }
  .01% { opacity: 1; transform: translateY(-560px) scale(.82, 1.25); animation-timing-function: cubic-bezier(.55, 0, 1, .65); }
  38% { opacity: 1; transform: translateY(0) scale(.86, 1.2); animation-timing-function: ease-out; }
  48% { opacity: 1; transform: translateY(0) scale(1.28, .7); animation-timing-function: cubic-bezier(.2, .7, .4, 1); }
  66% { opacity: 1; transform: translateY(-56px) scale(.93, 1.09); animation-timing-function: cubic-bezier(.55, 0, 1, .65); }
  82% { opacity: 1; transform: translateY(0) scale(1.1, .9); animation-timing-function: ease-out; }
  100% { opacity: 1; transform: none; } }
@keyframes bob { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-10px) scale(.97, 1.04); } }
@keyframes rise { from { opacity: 0; transform: translateY(16px) scale(.8); } to { opacity: 1; transform: none; } }
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

/* The window onto the app, and the camera inside it. It opens as an iris. */
.win { position: absolute; left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; box-sizing: border-box; z-index: 2;
  border: ${WIN.border}px solid var(--ink); border-radius: 38px; overflow: hidden; background: var(--ground); clip-path: circle(0px at var(--ix, 50%) var(--iy, 50%)); }
.win.open { clip-path: circle(${Math.ceil(Math.hypot(WIN.w, WIN.h))}px at var(--ix, 50%) var(--iy, 50%)); transition: clip-path 1s cubic-bezier(.55, 0, .25, 1); }
.win.done { clip-path: none; }
.cam { position: absolute; left: 0; top: 0; width: ${APP.w}px; height: ${APP.h}px; transform-origin: 0 0; transition: transform ${CAM_S}s var(--cam); }
.cam.cut { transition: none; }
iframe { display: block; width: ${APP.w}px; height: ${APP.h}px; border: 0; }
.chip { position: absolute; left: 50%; top: ${WIN.y + WIN.h - 96}px; z-index: 4; padding: 8px 24px; border: 4px solid var(--ink); border-radius: 999px; background: #fff; box-shadow: 0 5px 0 var(--ink);
  font-weight: 900; font-size: 32px; white-space: nowrap; transform: translateX(-50%); opacity: 0; pointer-events: none; }
.chip.show { opacity: 1; animation: chip .5s var(--pop) both; }
@keyframes chip { from { transform: translateX(-50%) scale(.5); } to { transform: translateX(-50%); } }
.url { position: absolute; left: 50%; top: ${WIN.y + WIN.h - 34}px; z-index: 4; padding: 12px 28px; border: 4px solid var(--ink); border-radius: 999px; background: var(--accent); color: #fff;
  box-shadow: 0 6px 0 var(--ink); font-weight: 900; font-size: 27px; white-space: nowrap; transform: translateX(-50%); opacity: 0; pointer-events: none; }
.url.show { opacity: 1; animation: chip .6s var(--pop) both; }

/* Highlight ring and tap marker. */
.ring2 { position: absolute; z-index: 3; box-sizing: border-box; border: 7px solid var(--accent); border-radius: 20px; pointer-events: none; opacity: 0; background: rgba(111, 92, 240, .12); box-shadow: 0 0 0 4px #fff; }
.ring2.go { animation: ring2 2.4s cubic-bezier(.2, .9, .3, 1) both; }
@keyframes ring2 { 0% { opacity: 0; transform: scale(1.35); } 18% { opacity: 1; transform: scale(1); } 80% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
.tap { position: absolute; z-index: 3; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: rgba(111, 92, 240, .28); border: 4px solid var(--accent); }
.tap.go { animation: tap .6s cubic-bezier(.22, 1, .36, 1); }
@keyframes tap { 0% { opacity: .95; transform: scale(.35); } 70% { opacity: .7; } 100% { opacity: 0; transform: scale(1.3); } }

/* The whip: a card that sweeps across, holding a line, and hides each cut. */
.whip { position: absolute; left: -40px; right: -40px; top: 0; bottom: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: var(--accent);
  transform: translateX(120%) skewX(-12deg); pointer-events: none; }
.whip.in { transform: none; transition: transform .45s cubic-bezier(.2, .9, .3, 1); }
.whip.out { transform: translateX(-120%) skewX(-12deg); transition: transform .45s cubic-bezier(.6, 0, .9, .5); }
.whip .lines { color: #fff; font-weight: 900; font-size: 80px; line-height: 1.04; letter-spacing: -1.5px; text-align: center; padding: 0 60px; }
.whip .sp { --f: var(--sun); }

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

/* The end card. */
.card { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; visibility: hidden; background: var(--ground); }
.card.on { visibility: visible; animation: fadein .35s ease both; }
.logo { display: flex; flex-direction: row; gap: 20px; font-weight: 900; font-size: 92px; line-height: .98; letter-spacing: -1px; }
.word { display: flex; }
.word:last-child { transform: rotate(-3deg); }
.logo b { display: inline-block; font-weight: 900; color: var(--c, #fff); opacity: 0; transform-origin: 50% 90%;
  -webkit-text-stroke: 13px var(--ink); paint-order: stroke fill; text-shadow: 0 8px 0 rgba(43, 30, 47, .22); }
.on .logo b { animation: letter .7s var(--pop) calc(var(--i) * 55ms) both; }
@keyframes letter { from { opacity: 0; transform: translateY(70px) scale(.3) rotate(-14deg); } 25% { opacity: 1; } to { opacity: 1; transform: none; } }
.card .pet { margin-top: 26px; line-height: 0; opacity: 0; }
.card .pet svg { width: 300px; height: auto; }
.on .pet { animation: rise .7s var(--pop) .35s both; }
.card .tag { margin-top: 18px; max-width: 470px; text-align: center; font-weight: 900; font-size: 40px; line-height: 1.12; text-wrap: balance; opacity: 0; }
.card .tag em { font-style: normal; color: var(--accent); }
.on .tag { animation: rise .6s var(--pop) .6s both; }
.card .link { margin-top: 30px; padding: 14px 30px; border: 4px solid var(--ink); border-radius: 999px; background: var(--accent); color: #fff; font-weight: 900; font-size: 30px;
  box-shadow: 0 6px 0 var(--ink); opacity: 0; }
.on .link { animation: rise .6s var(--pop) .8s both; }
.card .sp { z-index: 1; }
</style></head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="spk" viewBox="-1.25 -1.25 2.5 2.5"><path d="M0 -1.15 C.12 -.4 .4 -.12 1.15 0 C.4 .12 .12 .4 0 1.15 C-.12 .4 -.4 .12 -1.15 0 C-.4 -.12 -.12 -.4 0 -1.15Z"/></symbol></defs></svg>
<div class="stage" id="stage">
<div class="bg">${BLOBS}${FLOATERS}</div>
<div class="win" id="win"><div class="cam" id="cam"><iframe id="app" src="${appUrl}" title="Chore Pet"></iframe></div></div>
<div class="chip" id="chip"></div>
<div class="url" id="url">robertg761.github.io/chore-pet</div>
<div class="tap" id="tap"></div>
<div class="cap" id="cap"></div>
<div class="title" id="title"></div>
<div class="mochi" id="mochi"><div class="shadow"></div><div class="drop"><div class="bob" id="mochiArt"></div></div><span class="nm">Mochi</span></div>
<div class="fx" id="fx"></div>
<div class="whip" id="whip">${sparkAt(90, 250, 36, '#ffd65c', 0.1)}${sparkAt(520, 300, 28, '#ffffff', 0.8)}${sparkAt(130, 720, 26, '#ffffff', 1.4)}${sparkAt(470, 690, 34, '#ffd65c', 0.5)}<div class="lines" id="whipText"></div></div>
<div class="card" id="outro">
  ${sparkAt(60, 190, 34, '#ffd65c', 0.1)}${sparkAt(480, 230, 28, '#ffffff', 0.9)}${sparkAt(40, 700, 26, '#f28fa0', 1.5)}${sparkAt(500, 760, 32, '#ffd65c', 0.5)}${sparkAt(130, 850, 22, '#9ed8f5', 1.2)}
  ${logo()}
  <div class="pet" id="outroPet"></div>
  <div class="tag">Your real chores keep your pet <em>happy.</em></div>
  <div class="link">robertg761.github.io/chore-pet</div>
</div>
</div>
<script>
const $ = (id) => document.getElementById(id)
const reflow = (el) => void el.offsetWidth
const words = (text) => {
  let i = 0
  return text.split('\\n').map((line) => line.split(' ').map((w) => {
    const accent = /^\\*.*\\*[.,!?…]*$/.test(w) || /^\\*/.test(w)
    const clean = w.replace(/\\*/g, '').replace(/[&<]/g, (c) => ({ '&': '&amp;', '<': '&lt;' })[c])
    return '<span class="w' + (accent ? ' a' : '') + '" style="--i:' + (i++) + '">' + clean + '</span>'
  }).join(' ')).join('<br>')
}
// "*word*" (or "*two words*") is the accent; a newline breaks the line.
const accentRuns = (text) => text.replace(/\\*([^*]+)\\*/g, (m, run) => run.split(' ').map((w) => '*' + w + '*').join(' '))
window.say = (id, text) => {
  const el = $(id)
  el.classList.remove('show', 'hide')
  if (!text) { el.classList.add('hide'); return }
  el.innerHTML = '<div class="lines">' + words(accentRuns(text)) + '</div>'
  reflow(el)
  el.classList.add('show')
}
window.unsay = (id) => { $(id).classList.remove('show'); $(id).classList.add('hide') }
window.setMochi = (svg) => { $('mochiArt').innerHTML = svg }
window.mochi = (state) => { const m = $('mochi'); if (state === 'gone') { m.classList.add('gone'); return } m.classList.remove('on', 'gone'); reflow(m); m.classList.add('on') }
window.calm = (on) => document.body.classList.toggle('calm', on)
window.camTo = (tx, ty, s, cut) => {
  const cam = $('cam')
  cam.classList.toggle('cut', Boolean(cut))
  cam.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')'
  if (cut) { reflow(cam); cam.classList.remove('cut') }
}
window.iris = (x, y) => { const w = $('win'); w.style.setProperty('--ix', x + 'px'); w.style.setProperty('--iy', y + 'px'); w.classList.add('open') }
window.irisDone = () => $('win').classList.add('done')
window.chip = (text) => { const c = $('chip'); c.classList.remove('show'); if (!text) return; c.textContent = text; reflow(c); c.classList.add('show') }
window.url = (on) => { const u = $('url'); u.classList.remove('show'); if (on) { reflow(u); u.classList.add('show') } }
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
window.whip = (state, text) => {
  const el = $('whip')
  if (state === 'in') { $('whipText').innerHTML = words(accentRuns(text)); el.classList.remove('out', 'in', 'show'); reflow(el); el.classList.add('in', 'show') }
  else { el.classList.remove('in'); el.classList.add('out') }
}
window.outro = (svg) => { if (svg) $('outroPet').innerHTML = svg; $('outro').classList.add('on') }
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
// The title's Mochi is the app's own art, from its landing page.
const mochiSvg = await phone.locator('.landing-pet-art svg').first().evaluate((s) => s.outerHTML)
await stage.evaluate((svg) => window.setMochi(svg), mochiSvg)
await stage.evaluate(() => document.fonts.load("900 100px 'Nunito'").then(() => document.fonts.ready))
// The window is still closed (an iris of size 0 takes no taps), so these are clicked in the page.
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
const freeze = async () => { if (K === 1) return; await stage.clock.pauseAt((await stage.evaluate(() => Date.now())) + 20); drive() }
const thaw = async () => { if (K === 1) return; await halt(); await stage.clock.resume() }

// Wait (off camera) for Mochi to go over to the sink and say something about it, so the story opens on that.
{
  const snap = await readSnapshot(phone)
  const sinkId = Object.values(snap.tables.placed_objects).find((o) => o.catalogId === 'sink').id
  const near = () => phone.evaluate((id) => {
    const sink = document.querySelector(`[data-object-id="${id}"]`)?.getBoundingClientRect()
    const pet = [...document.querySelectorAll('[aria-label]')].find((e) => /^Mochi, feeling/.test(e.getAttribute('aria-label')))?.getBoundingClientRect()
    if (!sink || !pet || !document.querySelector('.pet-bubble')) return false
    return Math.hypot(sink.x + sink.width / 2 - (pet.x + pet.width / 2), sink.y + sink.height / 2 - (pet.y + pet.height / 2)) < 75
  }, sinkId)
  for (let i = 0; i < 90 && !(await near()); i++) await stage.waitForTimeout(400)
}
await freeze()
await halt() // the JS clock is held through the title: Mochi stays by the sink with its line up

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
  segments.push({ from, to, speed: Math.max(1, (to - from - fixedReal) / Math.max(0.5 * K, seconds * K - fixedPlay)), fixed: false })
}
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  const file = `${FRAMES}/${String(frames.length).padStart(5, '0')}.jpg`
  writeFileSync(file, Buffer.from(data, 'base64'))
  frames.push({ file, ts: metadata.timestamp, t: Math.max(metadata.timestamp - cut, frames.at(-1)?.t ?? 0) })
})
const startCast = async () => { await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1 }); casting = true }
const pauseCast = async () => { casting = false; await cdp.send('Page.stopScreencast'); pausedAt = Date.now() / 1000 }
const resumeCast = async () => { cut += Date.now() / 1000 - pausedAt; await startCast() }
const mark = (name) => marks.push({ name, t: now() })
// A sound of the app's own (scripts/demo-audio.mjs renders it), placed on a stage beat such as a title word.
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
const endCaption = () => { if (shown) { captions.push({ ...shown, end: videoAt(), at: undefined }); shown = null } }
const say = async (text, where = 'cap') => {
  await settleCaption()
  endCaption()
  await stage.evaluate(([id, t]) => window.say(id, t), [where, text])
  shown = { text, where, start: videoAt() }
}
const unsay = async (where = 'cap') => {
  await settleCaption()
  endCaption()
  await stage.evaluate((id) => window.unsay(id), where)
}

// --- Camera ----------------------------------------------------------------------------------
// Boxes in the app's own CSS px (the iframe's viewport), read live.
const box = (b) => (b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null)
const rectOf = async (locator) => box(await locator.first().evaluate((e) => e.getBoundingClientRect().toJSON()).catch(() => null))
const union = (...rs) => {
  const list = rs.filter(Boolean)
  const x = Math.min(...list.map((r) => r.x))
  const y = Math.min(...list.map((r) => r.y))
  return { x, y, w: Math.max(...list.map((r) => r.x + r.w)) - x, h: Math.max(...list.map((r) => r.y + r.h)) - y }
}
const grow = (r, dx, dy = dx) => ({ x: r.x - dx, y: r.y - dy, w: r.w + 2 * dx, h: r.h + 2 * dy })
let cam = { tx: 0, ty: 0, s: 1 }
let camMoved = 0
/** Frame a box of the app in the window: as big as fits (up to `max`), centred, never past the app's edges. */
const frame = async (r, { pad = 8, max = 4, cut: jump = false, bias = 0.5 } = {}) => {
  const s = Math.min(VIEW.w / (r.w + 2 * pad), VIEW.h / (r.h + 2 * pad), max)
  const cx = r.x + r.w / 2
  const cy = r.y + r.h * bias
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
  const tx = clamp(VIEW.w / 2 - cx * s, VIEW.w - APP.w * s, 0)
  const ty = clamp(VIEW.h / 2 - cy * s, VIEW.h - APP.h * s, 0)
  cam = { tx, ty, s }
  camMoved = Date.now()
  await stage.evaluate(([tx, ty, s, c]) => window.camTo(tx, ty, s, c), [tx, ty, s, jump])
}
/** Where a point of the app lands on the stage, with the camera at rest. */
const onStage = (x, y) => [WIN.x + WIN.border + cam.tx + x * cam.s, WIN.y + WIN.border + cam.ty + y * cam.s]
const camSettled = async () => { const left = camMoved + CAM_S * 1000 * K - Date.now(); if (left > 0) await stage.waitForTimeout(left) }

const giftRect = async () => union(await rectOf(phone.locator('.gift-title')), await rectOf(phone.locator('.gift-stage')), await rectOf(phone.locator('.gift-actions')))
const pet = () => phone.getByRole('button', { name: /^Mochi, feeling/ })
const petRect = () => rectOf(pet())
const bubbleRect = async () => ((await phone.locator('.pet-bubble').count()) ? rectOf(phone.locator('.pet-bubble')) : null)
const roomRect = () => rectOf(phone.locator('.living-room'))
/** The room, trimmed at the sides: the window is taller than the room is, so this fills it. */
const wideRect = async (trim = 0.11) => { const r = await roomRect(); return { x: r.x + r.w * trim, y: r.y, w: r.w * (1 - 2 * trim), h: r.h } }
const rowRect = (i = 0) => rectOf(phone.locator('.cl-row').nth(i))
const mood = async () => (await phone.locator('.home-top').innerText()).match(/Feeling (\w+)/)?.[1] ?? 'meh'
let objectIds = {}
const readObjects = async () => {
  const snap = await readSnapshot(phone)
  objectIds = Object.fromEntries(Object.values(snap.tables.placed_objects).map((o) => [o.catalogId, o.id]))
}
const objectRect = (catalogId) => rectOf(phone.locator(`[data-object-id="${objectIds[catalogId]}"]`))
/** The kitchen's busy corner (sink, stove, fridge, bin) with Mochi, and the mess floating over it. */
const cornerRect = async () => {
  const r = union(await objectRect('sink'), await objectRect('trash'), await objectRect('fridge'), await objectRect('stove'), await petRect())
  const b = await bubbleRect()
  return union({ x: r.x - 6, y: r.y - 22, w: r.w + 12, h: r.h + 28 }, b && grow(b, 4))
}
/** Close on Mochi, with its speech bubble when it is talking. */
const petClose = async (size = 120, withLine = true) => {
  const p = await petRect()
  const square = { x: p.x + p.w / 2 - size / 2, y: p.y + p.h / 2 - size / 2 - 6, w: size, h: size }
  const b = withLine && (await bubbleRect())
  return b ? union(square, grow(b, 4)) : square
}

// A tap, with a marker where the finger lands, once the camera is still and the target has stopped moving.
const press = async (locator) => {
  const target = locator.first()
  await target.waitFor({ state: 'visible' })
  // Something outside the window can't be tapped (or seen): bring it into the shot, with the room above it.
  const r = await rectOf(target)
  const view = { x: -cam.tx / cam.s, y: -cam.ty / cam.s, w: VIEW.w / cam.s, h: VIEW.h / cam.s }
  if (r && (r.x < view.x || r.y < view.y || r.x + r.w > view.x + view.w || r.y + r.h > view.y + view.h)) {
    const room = await roomRect()
    await frame(r.y > room.y ? union(room, r) : grow(r, 20), { pad: 6 })
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
  await stage.touchscreen.tap(x, y)
}
const ring = async (r, radius = 16, padding = 6) => {
  const [x, y] = onStage(r.x - padding, r.y - padding)
  await stage.evaluate(([x, y, w, h, rr]) => window.ringAt(x, y, w, h, rr), [x, y, (r.w + 2 * padding) * cam.s, (r.h + 2 * padding) * cam.s, radius])
}
const celebrate = () => stage.evaluate(() => {
  window.burst(60, 560, 20, 1.2, 240)
  window.burst(480, 560, 20, -1.2, 240)
  window.burst(270, 330, 18, 0, 260, 3)
})
const skipDay = async () => {
  const was = driving
  await halt()
  await stage.clock.fastForward(DAY)
  if (was) drive()
}
// Gifts that come while catching up: seen, and put away for later (Mochi keeps the beanie).
const putAwayGifts = async () => {
  for (let i = 0; i < 5; i++) {
    const gift = phone.getByRole('button', { name: 'Open it', exact: true })
    if (!(await gift.count())) return
    const from = now()
    await frame(await giftRect(), { pad: 10 })
    await press(gift)
    await hold(0.3)
    if ((await gift.count()) && (await gift.isEnabled().catch(() => false))) await press(gift)
    await hold(1.1)
    await press(phone.getByRole('button', { name: /^(Maybe later|Lovely!)$/ }))
    await hold(0.4)
    segments.push({ from, to: now(), speed: 3.5, fixed: true })
  }
}
const reloadPhone = async () => {
  await phone.evaluate(() => location.reload())
  await stage.waitForTimeout(600)
  await phone.getByRole('navigation').waitFor()
  await stage.waitForTimeout(1200)
}
const stopAfter = (scene) => { if (STOP === scene) throw new Error('stop') }
let outroPet = null

await readObjects()
try {
// --- Title: the problem, in big type -------------------------------------------------------------
// The window starts on the whole room, closed; it opens later as an iris.
await frame(await wideRect(), { cut: true })
await startCast()
log('title')
await hold(0.4)
await say('Chores are\n*boring.*', 'title')
for (const at of [0, 0.19, 0.38]) setTimeout(() => cue('click'), at * 1000 * K)
await hold(2.9)
await unsay('title')
await hold(0.3)
await say('So we gave\nthem a *pet.*', 'title')
for (const at of [0, 0.19, 0.38, 0.57, 0.76]) setTimeout(() => cue('click'), at * 1000 * K)
await hold(0.9)
await stage.evaluate(() => window.mochi('on'))
setTimeout(() => cue('chirp'), 0.5 * 1000 * K)
await hold(3.3)
stopAfter('title')

// --- 1. Mochi's kitchen is a mess ------------------------------------------------------------------
// The iris opens from where Mochi stands in the room.
const p0 = await petRect()
const [ix, iy] = onStage(p0.x + p0.w / 2, p0.y + p0.h / 2)
await unsay('title')
await stage.evaluate(([x, y]) => { window.mochi('gone'); window.iris(x, y) }, [ix - WIN.x, iy - WIN.y])
mark('intro-out')
await hold(0.5)
await say("Mochi's kitchen\nis a *mess.*")
await hold(0.6)
await stage.evaluate(() => { window.irisDone(); window.calm(true) })
await hold(2.6)
log('mess')
await frame(await cornerRect(), { pad: 4, max: 3.2 })
await say('The dishes *stink.*\nFlies buzz.')
await hold(3.4)
const feeling = await mood()
await frame(await petClose(100, false), { pad: 4, max: 4 }) // its face, big: the line was in the last shot
await say(`And Mochi feels\n*${feeling}.*`)
await hold(3.1)
stopAfter('mess')

// --- 2. Every thing brings a chore; tap Done --------------------------------------------------------
drive()
await frame(union(await roomRect(), await rowRect(0)), { pad: 6 })
await say('Each thing in the home\nbrings a *real chore.*')
await hold(1.2)
await ring(grow(await objectRect('sink'), 2, 4), 18)
await hold(1.3)
await ring(await rowRect(0), 22, 3)
await hold(2.2)
await say('So you wash the dishes,\nthen tap *Done.*')
await hold(2.1)
await press(phone.getByRole('button', { name: 'Done: Wash the dishes' }))
await hold(0.5)
await halt() // hold the cheer: the gift sheet waits
await frame(await cornerRect(), { pad: 4, max: 3 })
await say('*Sparkling!*\nMochi cheers.')
await hold(3.0)
log('done')
stopAfter('done')

// --- 3. A gift drops in: the red beanie ------------------------------------------------------------
drive()
// The gift sheet is on its way: the camera goes to where it will be, so it slides up into the shot.
await frame({ x: 16, y: 120, w: APP.w - 32, h: 560 }, { pad: 4 })
const gift = phone.getByRole('button', { name: 'Open it', exact: true })
await gift.waitFor()
await hold(0.5)
await frame(await giftRect(), { pad: 10 })
await say('And a *gift*\ndrops in!')
await hold(1.6)
await press(gift)
await hold(0.35)
if ((await gift.count()) && (await gift.isEnabled().catch(() => false))) await press(gift)
await hold(0.5)
await celebrate()
await hold(1.0)
await say('A red *beanie!*')
outroPet = await phone.locator('.gift-art').evaluate((s) => s.outerHTML).catch(() => null)
await hold(2.5)
await press(phone.getByRole('button', { name: 'Put it on' }))
await hold(0.4)
await say('Mochi *loves* it.')
await halt() // Mochi stays where the camera finds it; the hop and the hello still play
await frame(await petClose(110), { pad: 4, max: 3.6 })
await camSettled()
await press(pet()) // a hop and a hello
await hold(0.35)
await frame(await petClose(110), { pad: 4, max: 3.6 })
await hold(2.5)
log('gift')
stopAfter('gift')

// --- 4. A few days later: the mess creeps back ------------------------------------------------------
await unsay()
await stage.evaluate(() => { window.calm(false); window.whip('in', 'A few days later…') })
mark('phone-out')
await hold(0.5)
shown = { text: 'A few days later…', where: 'whip', start: videoAt() - 0.4 }
drive()
// Let the Undo note go before the window shows the list again.
await lapse(0.2, () => phone.getByText(/^Done: /).waitFor({ state: 'hidden', timeout: 9000 * K }).catch(() => {}))
await frame(await wideRect(), { cut: true })
await hold(2.4)
await settleCaption()
endCaption()
await stage.evaluate(() => { window.whip('out'); window.calm(true) })
mark('intro-out')
await hold(0.3)
await say('The mess\ncreeps *back.*')
let days = 0
for (; days < 4; days++) {
  await skipDay()
  await stage.evaluate((d) => window.chip(d === 1 ? '1 day later' : `${d} days later`), days + 1)
  await hold(1.5)
  const m = await mood()
  if (days >= 2 && (m === 'scruffy' || m === 'poorly' || m === 'sick')) { days++; break }
}
await hold(0.6)
const scruffy = await mood()
await halt()
await frame(await petClose(), { pad: 4, max: 3.6 })
await say(`Mochi feels\n*${scruffy}.*`)
await stage.evaluate(() => window.chip(''))
await hold(3.0)
log(`lapse (${days} days, ${scruffy})`)
stopAfter('lapse')

// --- 5. So you do the dishes, and the rest: happy again ---------------------------------------------
drive()
await frame(union(await roomRect(), await rowRect(0)), { pad: 6 })
await say('So you catch up,\none chore at a *time.*')
await hold(1.2)
// The first one at full speed, with its cheer held a moment; then the rest, sped up.
await press(phone.getByRole('button', { name: /^Done: / }))
await hold(0.5)
await halt()
await frame(await cornerRect(), { pad: 4, max: 3 })
await hold(2.2)
drive()
await putAwayGifts()
await frame(union(await roomRect(), await rowRect(0), await rowRect(1)), { pad: 6 })
await hold(0.4)
await lapse(4.5, async () => {
  for (let i = 0; i < 30; i++) {
    await putAwayGifts()
    const done = phone.getByRole('button', { name: /^Done: / })
    if (!(await done.count())) break
    await press(done)
    await hold(0.8)
  }
  await hold(1.6) // a milestone's gift arrives a moment after the tap
  await putAwayGifts()
})
const happy = await mood()
await halt()
await frame(await petClose(), { pad: 4, max: 3.6 })
await say(`Mochi is *${happy}*\nagain.`)
await hold(3.2)
log(`caught up (${happy})`)
stopAfter('catchup')

// --- 6. Weeks later: a cosy home, the line, the link -----------------------------------------------
await unsay()
await stage.evaluate(() => { window.calm(false); window.whip('in', 'Weeks later…') })
mark('phone-out')
await hold(0.6)
shown = { text: 'Weeks later…', where: 'whip', start: videoAt() - 0.4 }
await pauseCast()
await thaw()
// Off camera: 140 chores on, every reward earned, a furnished living room, and Mochi dressed up.
await seedMilestone(phone, { choreCount: 140, bestStreak: 24, unlockedItems: ALL_REWARDS })
await seedPet(phone, { equipped: { head: 'beanie-red', face: 'heart-glasses', neck: 'scarf' } })
await reloadPhone()
// The camera is zoomed in on the window, so these taps are clicks in the page.
await phone.getByRole('button', { name: /^Rooms: Kitchen/ }).evaluate((b) => b.click())
await stage.waitForTimeout(600)
await phone.getByRole('button', { name: 'Add a living room', exact: true }).evaluate((b) => b.click())
await stage.waitForTimeout(900)
for (const thing of ['Floor rug', 'Couch', 'Potted plant', 'Fish tank', 'Bookshelf', 'Wall clock', 'Bean bag', 'Lamp', 'Teddy bear', 'Poster']) {
  await phone.getByRole('button', { name: new RegExp(`^${thing}`) }).first().evaluate((b) => b.click())
  await stage.waitForTimeout(350)
  await phone.getByRole('button', { name: 'Place it', exact: true }).evaluate((b) => b.click())
  await stage.waitForTimeout(350)
  await phone.getByRole('button', { name: 'Close', exact: true }).first().evaluate((b) => b.click())
  await stage.waitForTimeout(250)
}
await seedRoom(phone, {
  type: 'living',
  wallStyle: 'sky',
  floorStyle: 'seaside',
  layout: [
    ['plant', 0, 0, 0], ['wall-clock', 0, 1, 0], ['lamp', 0, 2, 0], ['couch', 0, 3, 0], ['fish-tank', 0, 5, 0], ['teddy', 1, 3, 0],
    ['bookshelf', 2, 0, 1], ['poster', 4, 0, 1], ['rug', 3, 3, 0], ['bean-bag', 6, 2, 0],
  ],
})
await reloadPhone()
const finish = phone.getByRole('button', { name: 'Finish', exact: true })
if (await finish.count()) await finish.evaluate((b) => b.click())
await phone.getByRole('navigation').getByRole('button', { name: /^Home\b/ }).evaluate((b) => b.click())
await stage.waitForTimeout(2500)
await frame(await wideRect(), { cut: true })
await stage.waitForTimeout(500)
await freeze()
await resumeCast()
await hold(1.6)
await settleCaption()
endCaption()
await stage.evaluate(() => window.whip('out'))
mark('intro-out')
await hold(0.3)
await say('Keep going, and\nthe *gifts* pile up.')
await hold(1.4)
await halt()
await frame(await petClose(130), { pad: 4, max: 3 })
await camSettled()
await press(pet()) // a hop and a hello
await hold(0.35)
await frame(await petClose(130), { pad: 4, max: 3 })
await hold(2.7)
drive()
await frame(await wideRect(0.07))
await say('Your real chores keep\nyour pet *happy.*')
await hold(0.8)
await stage.evaluate(() => window.url(true))
await hold(4.6)
await unsay()
await stage.evaluate((svg) => { window.calm(false); window.outro(svg) }, outroPet)
mark('outro-in')
shown = { text: 'Your real chores keep your pet happy. robertg761.github.io/chore-pet', where: 'outro', start: videoAt() }
await hold(4.6)
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
mkdirSync(new URL('.', `file://${OUT}`).pathname, { recursive: true })
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
console.log(`wrote ${OUT.startsWith(ROOT) ? OUT.slice(ROOT.length) : OUT} (${seconds.toFixed(1)} s, ${FPS} fps) from ${frames.length} frames`, errors.length ? `with page errors: ${errors.join('; ')}` : '')
if (short.length) console.log(`captions shorter than the bar: ${short.map((c) => `"${c.text}"`).join(', ')}`)
if (soundLines.length) console.log(`sound: ${soundLines.at(-1)}`)
