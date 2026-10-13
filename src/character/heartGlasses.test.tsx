import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { expect, it } from 'vitest'
import { glasses, heartGlasses } from './items/extras'
import { StrokeScaleContext } from './strokeScale'

// A wearable frame and its side arms should form one connected painted shape.
// Inspect rendered alpha rather than asserting a particular path or coordinate.
function paintedComponents(renderItem: typeof glasses, scale: number) {
  const svg = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={600} height={240} viewBox="-75 -30 150 60">
    <StrokeScaleContext.Provider value={scale}>{renderItem({ species: 'mochi' })}</StrokeScaleContext.Provider>
  </svg>)
  const { pixels, width, height } = new Resvg(svg, { font: { loadSystemFonts: false } }).render()
  const seen = new Uint8Array(width * height), sizes: number[] = []
  for (let index = 0; index < seen.length; index++) {
    if (seen[index] || pixels[index * 4 + 3] <= 16) continue
    const pending = [index]; seen[index] = 1; let count = 0
    while (pending.length) {
      const at = pending.pop()!, x = at % width, y = Math.floor(at / width); count++
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const neighbor = ny * width + nx
        if (!seen[neighbor] && pixels[neighbor * 4 + 3] > 16) { seen[neighbor] = 1; pending.push(neighbor) }
      }
    }
    sizes.push(count)
  }
  return sizes.sort((a, b) => b - a)
}

it.each([1, 1.6])('keeps round-glasses side arms attached at stroke scale %s', scale => {
  expect(paintedComponents(glasses, scale)).toHaveLength(1)
})
it.each([1, 1.6])('keeps heart-glasses side arms attached at stroke scale %s', scale => {
  expect(paintedComponents(heartGlasses, scale)).toHaveLength(1)
})
