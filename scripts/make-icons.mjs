// Generates the app icons: public/favicon.svg plus PNG exports in public/icons.
// Run with `npm run icons`. The art is sakura Mochi's happy face and body, copied
// by hand from src/character/species/mochi.tsx and src/character/parts.tsx
// (static SVG, no React), with a heavier outline and fewer pleats so it reads at 48px.
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
const PET = '#FFCFDA' // sakura, Mochi's own colour (SPECIES_COLOUR)
const SHADE = '#F3B7C7' // bodyShade(PET) from src/art/color.ts
const BLUSH = '#F28FA0'
const WHITE = '#FFFFFF'

const BODY = 'M32 150 C32 104 62 72 100 72 C138 72 168 104 168 150 C168 172 140 181 100 181 C60 181 32 172 32 150 Z'
const KNOT = 'M89 78 C88 67 94 60 100 60 C106 60 112 67 111 78 Z'

// The pet fills x 25..175, y 52..193 of its 200x200 box.
const PET_CENTER = { x: 100, y: 124 }

function eye(x) {
  return `<ellipse cx="${x}" cy="124" rx="8.5" ry="10.5" fill="${INK}"/>
      <circle cx="${x + 2.9}" cy="119.8" r="3.3" fill="${WHITE}"/>
      <circle cx="${x - 2.8}" cy="128" r="1.5" fill="${WHITE}"/>`
}

function pet() {
  return `
  <defs><clipPath id="body"><path d="${BODY}"/></clipPath></defs>
  <g stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="100" cy="186" rx="62" ry="7" fill="${INK}" opacity="0.15" stroke="none"/>
    <ellipse cx="74" cy="178" rx="15" ry="9" fill="${PET}"/>
    <ellipse cx="126" cy="178" rx="15" ry="9" fill="${PET}"/>
    <ellipse cx="37" cy="152" rx="10" ry="13" fill="${PET}" transform="rotate(-10 37 152)"/>
    <ellipse cx="163" cy="152" rx="10" ry="13" fill="${PET}" transform="rotate(10 163 152)"/>
    <path d="${KNOT}" fill="${PET}"/>
    <path d="M100 60 C100 55 104 53 106 55" fill="none" stroke-width="4.5"/>
    <g clip-path="url(#body)" stroke="none">
      <path d="${BODY}" fill="${SHADE}"/>
      <path d="${BODY}" fill="${PET}" transform="translate(-6 -9)"/>
      <ellipse cx="64" cy="104" rx="9" ry="5.5" fill="${WHITE}" opacity="0.7" transform="rotate(-38 64 104)"/>
    </g>
    <path d="${BODY}" fill="none"/>
    <g fill="none" stroke-width="4" opacity="0.25">
      <path d="M91 77 Q82 83 78 93"/>
      <path d="M109 77 Q118 83 122 93"/>
    </g>
    <g fill="${BLUSH}" stroke="none" opacity="0.9">
      <ellipse cx="60" cy="140" rx="10.5" ry="6"/>
      <ellipse cx="140" cy="140" rx="10.5" ry="6"/>
    </g>
    <g stroke="none">
      ${eye(80)}
      ${eye(120)}
    </g>
    <path d="M91.5 136 q8.5 12 17 0 Z" fill="${INK}" stroke-width="4"/>
    <path d="M95.5 141.6 q4.5 -3.6 9 0 q-4.5 2.2 -9 0 Z" fill="${BLUSH}" stroke="none"/>
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
