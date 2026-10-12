// @vitest-environment jsdom
import { Resvg } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PALETTE } from '../art/palette'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { sampleMotion } from '../character/motion'
import { Room } from './Room'
import { PET_STROKE_SCALE } from './shell/geometry'

// Compare real painted output, excluding translucent shadows and antialiased
// silhouette edges. A floor invitation must never paint across an opaque pet.
for (const species of ['mochi', 'bun', 'sprout'] as const) {
  for (const facing of [1, -1] as const) {
    for (const tile of [{ tx: 6, ty: 5 }, { tx: 5, ty: 6 }]) {
      it(`keeps the selected floor outline behind dressed ${species}, facing ${facing}, at ${tile.tx},${tile.ty}`, () => {
        const frame = sampleMotion({ species, mood: 'happy', action: 'dust', elapsedMs: 650, durationMs: 1400, distance: 0, reducedMotion: false })
        const art = <g data-selection-art=""><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault}
          strokeScale={PET_STROKE_SCALE} frame={frame}
          equipped={{ head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }} /></g>
        const props = { room: { floorStyle: 'wood', wallStyle: 'cream' } as const,
          objects: [{ id: 'shelf', roomId: 'room', catalogId: 'bookshelf', tileX: 5, tileY: 5, rotation: 0 as const }],
          stages: { shelf: 'messy1' } as const, width: 780, selectionMode: 'preview' as const, pet: { tile, facing, art } }
        const withNS = (svg: string) => /<svg\b[^>]*xmlns=/.test(svg) ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
        const plain = withNS(renderToStaticMarkup(<Room {...props} />))
        const selected = withNS(renderToStaticMarkup(<Room {...props} selectedId="shelf" />))
        const document = new DOMParser().parseFromString(plain, 'image/svg+xml')
        const root = document.documentElement
        const mask = root.cloneNode(false) as Element
        const pet = root.querySelector('[data-selection-art]')!.parentElement!.parentElement!.cloneNode(true) as Element
        pet.querySelector('[data-character-ground]')?.remove()
        pet.querySelector('[data-character-accents]')?.remove()
        mask.append(pet)
        const original = new Resvg(plain).render()
        const marked = new Resvg(selected).render()
        const silhouette = new Resvg(mask.outerHTML).render()
        expect([marked.width, marked.height, silhouette.width, silhouette.height]).toEqual([original.width, original.height, original.width, original.height])
        // Cache the native pixel getters once; never copy a buffer per pixel.
        const originalPixels = original.pixels, markedPixels = marked.pixels, maskPixels = silhouette.pixels
        let opaque = 0, overpainted = 0
        for (let y = 1; y < original.height - 1; y++) for (let x = 1; x < original.width - 1; x++) {
          let inside = true
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (maskPixels[((y + dy) * original.width + x + dx) * 4 + 3] !== 255) inside = false
          }
          if (!inside) continue
          opaque++
          const i = (y * original.width + x) * 4
          if ([0, 1, 2].some(c => Math.abs(originalPixels[i + c] - markedPixels[i + c]) > 1)) overpainted++
        }
        expect(opaque).toBeGreaterThan(3000)
        expect(overpainted, `${overpainted} of ${opaque} opaque interior pixels covered by the selection`).toBe(0)
      })
    }
  }
}
