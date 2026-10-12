import { Resvg } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { furnitureArt } from './index'
import type { FurnitureAppearance } from '../../../catalog/customization'

const expected = [
  'armchair', 'dining-chair', 'bench', 'ottoman', 'coffee-table', 'side-table',
  'desk', 'nightstand', 'dresser', 'wardrobe', 'tv-stand', 'shoe-rack',
  'bathtub', 'bathroom-vanity', 'laundry-hamper', 'mirror', 'wall-shelf', 'pet-bed',
]
const styles = ['classic', 'cottage', 'modern', 'nordic', 'industrial', 'playful'] as const
const render = (id: string, appearance: FurnitureAppearance = {}, stage: 'clean' | 'messy1' | 'messy2' = 'clean') => {
  const art = furnitureArt.find((item) => item.catalogId === id)!
  return renderToStaticMarkup(<svg>{art.render(stage, appearance)}</svg>)
}

const pixels = (id: string, appearance: FurnitureAppearance = {}, stage: 'clean' | 'messy1' | 'messy2' = 'clean', padding = 0) => {
  const art = furnitureArt.find((item) => item.catalogId === id)!
  const b = art.bounds
  const width = b.width + padding * 2
  const height = b.height + padding * 2
  const svg = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={width * 2} height={height * 2} viewBox={`${b.x - padding} ${b.y - padding} ${width} ${height}`}>{art.render(stage, appearance)}</svg>)
  return new Resvg(svg, { font: { loadSystemFonts: false } }).render()
}

describe('expanded furniture art', () => {
  it('draws every new furniture type', () => {
    expect(furnitureArt.map((art) => art.catalogId).sort()).toEqual([...expected].sort())
  })

  it.each(expected)('%s has six different constructions and renders every mess stage', (id) => {
    const variants = styles.map((style) => render(id, { style }))
    expect(new Set(variants).size).toBe(styles.length)
    for (const style of styles) {
      for (const stage of ['clean', 'messy1', 'messy2'] as const) {
        const svg = render(id, { style }, stage)
        expect(svg).not.toMatch(/NaN|undefined|Infinity/)
        expect(svg).toMatch(/<(?:path|polygon|ellipse|rect)/)
      }
    }
    expect(render(id, {}, 'messy1')).not.toBe(render(id))
    expect(render(id, {}, 'messy2')).not.toBe(render(id, {}, 'messy1'))
  })

  it.each(styles)('%s keeps every appearance control visible with extras off', (style) => {
    const unchanged: string[] = []
    for (const id of expected) {
      const simple = { style, details: false } as const
      const original = pixels(id, simple).pixels
      for (const change of [{ finish: 'walnut' }, { fabric: 'rose' }, { pattern: 'stripes' }] as const) {
        if (pixels(id, { ...simple, ...change }).pixels.equals(original)) unchanged.push(`${id}: ${JSON.stringify(change)}`)
      }
      if (pixels(id, { style, details: true }).pixels.equals(original)) unchanged.push(`${id}: details`)
    }
    expect(unchanged).toEqual([])
  })

  it.each(styles)('%s keeps mirror patterns and mess inside its silhouette', (style) => {
    const clean = pixels('mirror', { style, details: false }).pixels
    for (const pattern of ['plain', 'stripes', 'checks', 'dots'] as const) {
      for (const stage of ['clean', 'messy1', 'messy2'] as const) {
        const changed = pixels('mirror', { style, pattern, details: false }, stage).pixels
        let outside = 0
        for (let i = 3; i < clean.length; i += 4) {
          if (clean[i] < 10 && changed[i] > 50) outside++
        }
        expect(outside, `${pattern} ${stage} draws outside the mirror`).toBe(0)
      }
    }
  })

  it.each(styles)('%s keeps every stage and optional decoration within declared bounds', (style) => {
    for (const id of expected) for (const stage of ['clean', 'messy1', 'messy2'] as const) for (const details of [false, true]) {
      const art = furnitureArt.find((item) => item.catalogId === id)!
      const image = pixels(id, { style, pattern: 'stripes', details }, stage, 20)
      const { width, height } = image
      const raster = image.pixels
      const outside: number[] = []
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (x >= 40 && x < 40 + art.bounds.width * 2 && y >= 40 && y < 40 + art.bounds.height * 2) continue
        if (raster[(y * width + x) * 4 + 3] > 20) outside.push(x, y)
      }
      expect(outside, `${id} ${stage} details=${details}`).toEqual([])
    }
  })

  it('keeps mirror clipping independent when different styles share an SVG', () => {
    const art = furnitureArt.find((item) => item.catalogId === 'mirror')!
    const svg = renderToStaticMarkup(<svg>{styles.map((style) => <g key={style}>{art.render('messy2', { style, pattern: 'checks' })}</g>)}</svg>)
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    const references = [...svg.matchAll(/url\(#([^)]*)\)/g)].map((match) => match[1])
    expect(references.every((id) => ids.includes(id))).toBe(true)
  })

  it('changes fabric pattern on seats and finish on timber without replacing the furniture', () => {
    expect(render('armchair', { pattern: 'checks' })).not.toBe(render('armchair', { pattern: 'plain' }))
    expect(render('desk', { finish: 'walnut' })).not.toBe(render('desk', { finish: 'birch' }))
    expect(render('dresser', { details: true })).not.toBe(render('dresser', { details: false }))
  })
})
