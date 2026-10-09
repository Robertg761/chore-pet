// Renders cover picture B (before / after) from the app's own dev page at /?cover=b:
//   cover.png  1600 x 900
//   card.png   1200 x 630 (social share card)
//   thumbs.png the cover at 1600, 400 and 320 wide, side by side (to check it reads small)
//
//   npm run build
//   node scripts/cover.mjs [outDir]     (CHROME=/path/to/chrome if Playwright has no browser of its own)
//
// The page draws everything with the app's components (Room, CharacterArt, effects shapes) and
// Nunito. It is shot at 2x and scaled to the exact size with ffmpeg (Lanczos).
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { isolate, launchBrowser, ROOT, serveApp } from './media-common.mjs'

const OUT = process.argv[2] ?? `${ROOT}demo/cover`
mkdirSync(OUT, { recursive: true })

const app = await serveApp()
const browser = await launchBrowser()

async function shoot(query, width, height, file) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await isolate(ctx)
  const page = await ctx.newPage()
  await page.goto(`${app.url}?${query}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  const raw = `${OUT}/${file}.2x.png`
  await page.screenshot({ path: raw, clip: { x: 0, y: 0, width, height } })
  await ctx.close()
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args])
  ff(['-i', raw, '-vf', `scale=${width}:${height}:flags=lanczos`, `${OUT}/${file}.png`])
}

try {
  await shoot('cover=b', 1600, 900, 'cover')
  await shoot('cover=b&card', 1200, 630, 'card')
} finally {
  await browser.close()
  await app.close()
}

// The contact sheet: full size, 400 and 320 wide, on a light grey like a build-card grid.
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', `${OUT}/cover.png`,
  '-filter_complex',
  '[0]split=3[a][b][c];[b]scale=400:225:flags=lanczos,pad=440:900:20:20:color=0xF2F0F5[b2];' +
    '[c]scale=320:180:flags=lanczos,pad=360:900:20:20:color=0xF2F0F5[c2];[a]pad=1640:900:20:0:color=0xF2F0F5[a2];[a2][b2][c2]hstack=3',
  `${OUT}/thumbs.png`,
])
console.log(`Wrote ${OUT}/cover.png, card.png, thumbs.png`)
