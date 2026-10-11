// Renders the screenshot showcase (the earlier cover): three phones and the pets, into demo/showcase/
// (OUT=docs/media to overwrite the published pictures). The published cover and card are now drawn by
// scripts/cover.mjs (npm run cover): the before/after kitchen.
//   chore-pet-showcase.png   1600 x 900
//   chore-pet-card.png       1200 x 630 (a social card)
//
//   npm run build
//   npm run showcase            (CHROME=/path/to/chrome if Playwright has no browser of its own)
//
// Everything on the pictures comes from the app itself: phone screenshots of the production
// build (a cosy home, the wardrobe, the reward tiers) and Mochi, Bun and Sprout drawn by the
// app's own SVG art, in tier-two outfits, grabbed from the wardrobe preview with a clear
// background. They are laid out on a real HTML page (the app's lavender ground, ink outlines and
// Nunito from public/fonts) and rendered at 2x, then scaled to the exact sizes above.
// No external images, stock art or emoji. Working files go to demo/showcase/ (not committed).
// ffmpeg (on the PATH) does the final scale down.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { ALL_REWARDS, isolate, launchBrowser, ROOT, seedMilestone, seedPet, seedRoom, serveApp, LIVING_ROOM } from './media-common.mjs'

const WORK = `${ROOT}demo/showcase`
const OUT = process.env.OUT ? new URL(process.env.OUT, `file://${ROOT}`).pathname : `${ROOT}demo/showcase`
const PHONE = { width: 390, height: 844 }
const DAY = 24 * 60 * 60 * 1000
rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })
mkdirSync(OUT, { recursive: true })

const app = await serveApp()
const browser = await launchBrowser()

/** A phone with a fresh sample home, on a fake clock at 10:00 so days can pass. */
async function samplePhone({ scale = 3, reducedMotion = 'reduce' } = {}) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: scale, hasTouch: true, reducedMotion, serviceWorkers: 'block' })
  await isolate(ctx)
  const page = await ctx.newPage()
  // The latest Thursday, as in record-demo.mjs, so the sample home looks the same whichever day this runs.
  const start = new Date(); start.setHours(10, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() - 4 + 7) % 7))
  await page.clock.install({ time: start })
  await page.goto(app.url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Try a sample home' }).tap()
  await page.getByRole('navigation').waitFor()
  await page.getByRole('button', { name: 'Make it mine' }).tap() // keep it: no sample banner
  await page.waitForTimeout(800)
  return { ctx, page }
}
const reload = async (page) => {
  await page.evaluate(() => location.reload())
  await page.waitForTimeout(500)
  await page.getByRole('navigation').waitFor()
  await page.waitForTimeout(900)
}
const tab = async (page, name) => {
  // Anchored, as in record-demo.mjs: the Rewards tab's full name says "more chores".
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(`^${name}\\b`) }).first().tap()
  await page.waitForTimeout(700)
}
/** Tap every Done that is showing, one at a time (each folds away). `keep` leaves that many for later. */
async function doAll(page, keep = 0) {
  for (let i = 0; i < 40; i++) {
    const done = page.getByRole('button', { name: /^Done: / })
    if ((await done.count()) <= keep) return
    await done.first().tap()
    await page.waitForTimeout(450)
  }
}

/** Days of real habits: each one passes on the fake clock and everything due gets done, so the streak is real. */
async function keepUp(page, days) {
  for (let day = 0; day < days; day++) {
    await page.clock.fastForward(DAY)
    await page.waitForTimeout(700)
    await doAll(page)
  }
}

// --- 1. A cosy home: a furnished living room, a week of chores kept up -------------------------
async function homeShot() {
  const { ctx, page } = await samplePhone()
  // A long-time player: every reward earned, so the whole catalogue of decor is in the tray.
  await seedMilestone(page, { choreCount: 210, bestStreak: 31, unlockedItems: ALL_REWARDS })
  await seedPet(page, { equipped: { head: 'crown', face: 'heart-glasses' } })
  await reload(page)
  await doAll(page) // the kitchen's two late chores

  await page.getByRole('button', { name: /^Rooms: Kitchen/ }).tap()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Add a living room', exact: true }).tap()
  await page.waitForTimeout(900)
  for (const thing of LIVING_ROOM.items) {
    await page.getByRole('button', { name: new RegExp(`^${thing}`) }).first().tap()
    await page.waitForTimeout(350)
    await page.getByRole('button', { name: 'Place it', exact: true }).tap()
    await page.waitForTimeout(350)
    await page.getByRole('button', { name: 'Close', exact: true }).first().tap()
    await page.waitForTimeout(250)
  }
  // The room's own layout, so nothing is bunched into the back corner.
  await seedRoom(page, LIVING_ROOM)
  await reload(page)
  const finish = page.getByRole('button', { name: 'Finish', exact: true })
  if (await finish.count()) await finish.tap()
  await page.waitForTimeout(700)

  await keepUp(page, 6)
  await page.clock.fastForward(DAY)
  await page.waitForTimeout(900)
  await doAll(page, 2) // leave a couple for today, not late
  // Let the Undo note and the pet's chat bubble go, so nothing covers the room or the list.
  await page.waitForTimeout(7000)
  await page.screenshot({ path: `${WORK}/home.png` })
  await ctx.close()
}

// --- 2. The reward tiers and the wardrobe, in tier-two outfits -----------------------------------
// The wardrobe preview with nothing behind the pet, so only the app's own pet art is left.
const CLEAR_BACKGROUND = 'html, body, body *:not(svg):not(svg *) { background: none !important; border-color: transparent !important; box-shadow: none !important; }'
const SPECIES = {
  mochi: { bodyColour: '#FFCFDA', equipped: { head: 'chef-hat', face: 'heart-glasses', outfit: 'apron' } },
  bun: { bodyColour: '#FFFFFF', equipped: { head: 'crown', neck: 'bandana', outfit: 'knit-sweater' } },
  sprout: { bodyColour: '#FFD65C', equipped: { face: 'heart-glasses', neck: 'bandana', outfit: 'overalls' } },
}
async function rewardsAndWardrobe() {
  const { ctx, page } = await samplePhone()
  // About 100 chores in: the first tier and the start of the second are earned, so both tiers show,
  // with locked gifts still ahead. A few real days on top give a live streak.
  await seedMilestone(page, { choreCount: 80, bestStreak: 6, unlockedItems: ALL_REWARDS.slice(0, 20) })
  await seedPet(page, { species: 'mochi', bodyColour: SPECIES.mochi.bodyColour, equipped: { head: 'chef-hat', face: 'heart-glasses' } })
  await reload(page)
  await doAll(page)
  await keepUp(page, 5)
  await page.waitForTimeout(6500) // the Undo note goes
  await tab(page, 'Rewards')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${WORK}/rewards.png` })
  await tab(page, 'Wardrobe')
  await page.screenshot({ path: `${WORK}/wardrobe.png` })

  // Each pet in its own outfit, cheering, on a clear background.
  await page.getByRole('button', { name: 'Cheer', exact: true }).tap()
  await page.addStyleTag({ content: CLEAR_BACKGROUND })
  for (const [species, look] of Object.entries(SPECIES)) {
    await seedPet(page, { species, ...look })
    await reload(page)
    await tab(page, 'Wardrobe')
    await page.getByRole('button', { name: 'Cheer', exact: true }).tap()
    await page.addStyleTag({ content: CLEAR_BACKGROUND })
    await page.waitForTimeout(500)
    await page.locator('.wd-preview').screenshot({ path: `${WORK}/pet-${species}.png`, omitBackground: true })
  }
  await ctx.close()
}

await homeShot()
await rewardsAndWardrobe()
await browser.close()
await app.close()

// --- 3. The pictures: a real page, laid out and rendered at 2x --------------------------------
const STYLE = `
@font-face { font-family: 'Nunito'; font-weight: 400 900; src: url('../../public/fonts/nunito-latin.woff2') format('woff2'); }
:root { --ink: #2b1e2f; --ink-soft: #4a3e58; --ground: #efe9ff; --accent: #6f5cf0; --card: #fff; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--ground); color: var(--ink); font-family: 'Nunito', system-ui, sans-serif; overflow: hidden; position: relative; }
.blob { position: absolute; border-radius: 50%; background: #e2d9fb; }
.spark { position: absolute; }
h1 { margin: 0; font-weight: 900; letter-spacing: -0.02em; line-height: 0.95; }
.tag { margin: 0; font-weight: 700; color: var(--ink-soft); line-height: 1.3; text-wrap: balance; }
.phone { position: absolute; background: var(--ink); border-radius: var(--r); padding: var(--b); box-shadow: 0 var(--lift) 0 rgba(43, 30, 47, .16); }
/* A status-bar strip above the screenshot, so the screen's title doesn't sit against the bezel. */
.phone .screen { height: 100%; box-sizing: border-box; padding-top: var(--s); border-radius: calc(var(--r) - var(--b)); background: var(--ground); overflow: hidden; }
.phone img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.chip { position: absolute; padding: 7px 16px; background: var(--card); border: 3px solid var(--ink); border-radius: 999px; box-shadow: 0 3px 0 var(--ink);
  font-weight: 800; white-space: nowrap; transform: translateX(-50%); }
.pet { position: absolute; display: flex; flex-direction: column; align-items: center; }
.pet .tile { background: var(--card); border: 4px solid var(--ink); border-radius: 28px; box-shadow: 0 6px 0 var(--ink); display: grid; place-items: center; }
.pet img { display: block; width: 92%; height: 92%; object-fit: contain; }
.pet .name { margin-top: 14px; padding: 4px 18px; font-weight: 800; color: #fff; background: var(--accent); border: 3px solid var(--ink); border-radius: 999px; }
`
const sparkle = (x, y, size, colour = '#ffd65c') => `<svg class="spark" style="left:${x}px;top:${y}px" width="${size}" height="${size}" viewBox="0 0 40 40"><path d="M20 3 C22 14 26 18 37 20 C26 22 22 26 20 37 C18 26 14 22 3 20 C14 18 18 14 20 3Z" fill="${colour}" stroke="#2b1e2f" stroke-width="3" stroke-linejoin="round"/></svg>`
// A phone showing a screenshot: h is the screen's height, the bezel goes around it.
const phone = ({ img, x, y, h, label, fs }) => {
  const w = Math.round((h * 390) / 844)
  const b = Math.round(h / 70)
  const r = Math.round(h / 13)
  const inset = Math.round(h / 32)
  const outer = { w: w + 2 * b, h: h + inset + 2 * b }
  return `<div class="phone" style="left:${x}px;top:${y}px;width:${outer.w}px;height:${outer.h}px;--b:${b}px;--r:${r}px;--s:${inset}px;--lift:${Math.round(h / 60)}px"><div class="screen"><img src="${img}" alt=""></div></div>
  <div class="chip" style="left:${x + outer.w / 2}px;top:${y + outer.h + 20}px;font-size:${fs}px">${label}</div>`
}
const petTile = ({ species, name, x, y, size, fs }) =>
  `<div class="pet" style="left:${x}px;top:${y}px"><div class="tile" style="width:${size}px;height:${size}px"><img src="pet-${species}.png" alt=""></div><div class="name" style="font-size:${fs}px">${name}</div></div>`

const TAGLINE = 'A tiny pet that lives in a home you build. Do real chores, keep it happy.'
const pages = {
  // 1600 x 900
  showcase: {
    size: { width: 1600, height: 900 },
    html: `
<div class="blob" style="left:-160px;top:-200px;width:620px;height:620px"></div>
<div class="blob" style="left:1180px;top:520px;width:640px;height:640px"></div>
${sparkle(540, 70, 46)}${sparkle(1560, 56, 34, '#fff')}${sparkle(604, 508, 36, '#fff')}
<h1 style="position:absolute;left:88px;top:112px;font-size:148px">Chore<br>Pet</h1>
<p class="tag" style="position:absolute;left:92px;top:420px;width:480px;font-size:31px">${TAGLINE}</p>
${petTile({ species: 'mochi', name: 'Mochi', x: 92, y: 556, size: 158, fs: 22 })}
${petTile({ species: 'bun', name: 'Bun', x: 270, y: 556, size: 158, fs: 22 })}
${petTile({ species: 'sprout', name: 'Sprout', x: 448, y: 556, size: 158, fs: 22 })}
${phone({ img: 'home.png', x: 645, y: 170, h: 600, label: 'Build your home', fs: 22 })}
${phone({ img: 'wardrobe.png', x: 950, y: 96, h: 600, label: 'Wear what you earn', fs: 22 })}
${phone({ img: 'rewards.png', x: 1255, y: 170, h: 600, label: 'Earn real rewards', fs: 22 })}`,
  },
  // 1200 x 630
  card: {
    size: { width: 1200, height: 630 },
    html: `
<div class="blob" style="left:-140px;top:-190px;width:480px;height:480px"></div>
<div class="blob" style="left:900px;top:380px;width:520px;height:520px"></div>
${sparkle(470, 52, 36)}${sparkle(868, 22, 28, '#fff')}
<h1 style="position:absolute;left:64px;top:62px;font-size:112px">Chore Pet</h1>
<p class="tag" style="position:absolute;left:68px;top:196px;width:470px;font-size:27px">${TAGLINE}</p>
${petTile({ species: 'mochi', name: 'Mochi', x: 68, y: 340, size: 130, fs: 19 })}
${petTile({ species: 'bun', name: 'Bun', x: 222, y: 340, size: 130, fs: 19 })}
${petTile({ species: 'sprout', name: 'Sprout', x: 376, y: 340, size: 130, fs: 19 })}
${phone({ img: 'home.png', x: 650, y: 54, h: 470, label: 'Build a home', fs: 18 })}
${phone({ img: 'wardrobe.png', x: 925, y: 26, h: 470, label: 'Dress up', fs: 18 })}`,
  },
}

const stage = await (await launchBrowser()).newContext({ deviceScaleFactor: 2 })
for (const [name, { size, html }] of Object.entries(pages)) {
  writeFileSync(`${WORK}/${name}.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chore Pet</title><style>${STYLE}</style></head><body style="width:${size.width}px;height:${size.height}px">${html}</body></html>`)
  const page = await stage.newPage()
  await page.setViewportSize(size)
  await page.goto(`file://${WORK}/${name}.html`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${WORK}/${name}@2x.png` })
  await page.close()
  const file = name === 'card' ? 'chore-pet-card.png' : 'chore-pet-showcase.png'
  // Rendered at 2x, then scaled to the exact size: crisp edges, and a file small enough for a README.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${WORK}/${name}@2x.png`, '-vf', `scale=${size.width}:${size.height}:flags=lanczos`, `${OUT}/${file}`])
  console.log(`wrote docs/media/${file}`)
}
await stage.browser().close()
