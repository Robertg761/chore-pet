// Generates the app icons: public/favicon.svg plus PNG exports in public/icons.
// Run with `npm run icons`. The art is Mochi's happy face and body, copied by
// hand from src/character/species/mochi.tsx and src/character/parts.tsx (static
// SVG, no React), with a heavier outline and no tiny details so it reads at 48px.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const iconsDir = join(publicDir, 'icons')

// Palette tokens (src/art/palette.ts)
const INK = '#2B1E2F'
const GROUND = '#EFE9FF'
const PET = '#FFD65C'
const BLUSH = '#F28FA0'
const WHITE = '#FFFFFF'

const BODY = 'M32 150 C32 104 62 72 100 72 C138 72 168 104 168 150 C168 172 140 181 100 181 C60 181 32 172 32 150 Z'
const PINCH = 'M88 80 C88 64 96 54 108 56 C114 58 114 66 106 68 C102 70 104 76 110 80 Z'

// The pet fills x 25..175, y 54..193 of its 200x200 box.
const PET_CENTER = { x: 100, y: 124 }

function pet() {
  return `
  <g stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="100" cy="186" rx="62" ry="7" fill="${INK}" opacity="0.15" stroke="none"/>
    <ellipse cx="74" cy="178" rx="15" ry="9" fill="${PET}"/>
    <ellipse cx="126" cy="178" rx="15" ry="9" fill="${PET}"/>
    <ellipse cx="36" cy="142" rx="11" ry="14" fill="${PET}" transform="rotate(-20 36 142)"/>
    <ellipse cx="164" cy="142" rx="11" ry="14" fill="${PET}" transform="rotate(20 164 142)"/>
    <path d="${PINCH}" fill="${PET}"/>
    <path d="${BODY}" fill="${PET}"/>
    <g fill="${BLUSH}" stroke="none" opacity="0.85">
      <ellipse cx="60" cy="140" rx="10" ry="6"/>
      <ellipse cx="140" cy="140" rx="10" ry="6"/>
    </g>
    <g stroke="none">
      <ellipse cx="82" cy="124" rx="8.5" ry="10.5" fill="${INK}"/>
      <ellipse cx="118" cy="124" rx="8.5" ry="10.5" fill="${INK}"/>
      <circle cx="85" cy="120" r="3.2" fill="${WHITE}"/>
      <circle cx="121" cy="120" r="3.2" fill="${WHITE}"/>
    </g>
    <path d="M90 136 q10 14 20 0 Z" fill="${INK}" stroke-width="4"/>
  </g>`
}

/** 512x512 icon. `scale` sizes the pet; `radius` rounds the background corners. */
function iconSvg({ scale, radius = 0 }) {
  const { x, y } = PET_CENTER
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${radius}" fill="${GROUND}"/>
  <g transform="translate(256 256) scale(${scale}) translate(${-x} ${-y})">${pet()}
  </g>
</svg>
`
}

// "any" icons use most of the canvas. Maskable icons keep the whole pet inside
// the central 80% safe zone (a circle of radius 205 px; the pet's half diagonal
// is about 100 units, so scale 1.9 leaves a little room to spare).
const ANY_SCALE = 2.3
const MASKABLE_SCALE = 1.9

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

mkdirSync(iconsDir, { recursive: true })

const any = iconSvg({ scale: ANY_SCALE })
const maskable = iconSvg({ scale: MASKABLE_SCALE })

writeFileSync(join(publicDir, 'favicon.svg'), iconSvg({ scale: ANY_SCALE, radius: 112 }))
writeFileSync(join(iconsDir, 'icon-192.png'), png(any, 192))
writeFileSync(join(iconsDir, 'icon-512.png'), png(any, 512))
writeFileSync(join(iconsDir, 'icon-maskable-512.png'), png(maskable, 512))
writeFileSync(join(iconsDir, 'apple-touch-icon-180.png'), png(any, 180))

console.log('Wrote public/favicon.svg and public/icons/*.png')
