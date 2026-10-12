// @vitest-environment jsdom
import { Buffer } from 'node:buffer'
import { Resvg } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { batch1 } from './batch1'
import { batch2 } from './batch2'
import { batch3 } from './batch3'
import { counterArt } from './counter'
import { decor } from './decor'
import { diningTableArt } from './diningTable'
import { sinkArt } from './sink'
import { customizeLegacyArt } from './legacyStyles'
import type { FurnitureAppearance } from '../../catalog/customization'

const originals = [sinkArt, counterArt, diningTableArt, ...batch1, ...batch2, ...batch3, ...decor]
const styles = ['classic', 'cottage', 'modern', 'nordic', 'industrial', 'playful'] as const
const stages = ['clean', 'messy1', 'messy2'] as const
const appearance: FurnitureAppearance = { style: 'cottage', finish: 'sage', fabric: 'rose', pattern: 'checks', details: true }
const svg = (art: (typeof originals)[number], stage: (typeof stages)[number], look?: FurnitureAppearance) =>
  renderToStaticMarkup(<svg>{customizeLegacyArt(art, stage, look)}</svg>)
const raster = (art: (typeof originals)[number], stage: (typeof stages)[number], look: FurnitureAppearance, bounds = art.bounds) => {
  const b = art.bounds
  const drawing = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={b.width} height={b.height} viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}>
    {customizeLegacyArt(art, stage, look)}
  </svg>)
  const pixels = new Resvg(drawing, { font: { loadSystemFonts: false } }).render().pixels
  if (bounds === b) return pixels
  // Render at the object's full bounds before cropping; tiny SVG viewBoxes can make resvg panic.
  return Buffer.concat(Array.from({ length: bounds.height }, (_, y) => {
    const start = ((bounds.y + y - b.y) * b.width + bounds.x - b.x) * 4
    return pixels.subarray(start, start + bounds.width * 4)
  }))
}

describe('legacy furniture appearances', () => {
  it('preserves every original drawing when appearance is omitted', () => {
    for (const art of originals) for (const stage of stages) {
      expect(svg(art, stage)).toBe(renderToStaticMarkup(<svg>{art.render(stage)}</svg>))
    }
  })

  it('renders every style and mess stage for every legacy object', () => {
    for (const art of originals) for (const style of styles) for (const stage of stages) {
      const drawing = svg(art, stage, { ...appearance, style })
      expect(drawing).toContain('<')
      expect(drawing).not.toMatch(/NaN|undefined|<image/)
      expect(drawing).toContain('#2B1E2F')
    }
  })

  it('gives the major furniture distinct geometry for each non-classic style', () => {
    for (const id of ['bed', 'couch', 'table', 'dining-table', 'bookshelf', 'lamp', 'rug', 'bean-bag']) {
      const art = originals.find((entry) => entry.catalogId === id)!
      const geometry = styles.map((style) => svg(art, 'clean', { ...appearance, style, pattern: 'plain' })
        .replace(/(?:fill|stroke|data-furniture-style)="[^"]*"/g, '')
        .replace(/id="[^"]*"/g, ''))
      expect(new Set(geometry).size, id).toBe(styles.length)
    }
  })

  it('keeps clean, messy and very messy drawings distinct with details disabled', () => {
    for (const art of originals) {
      const drawings = stages.map((stage) => svg(art, stage, { ...appearance, details: false }))
      expect(new Set(drawings).size, art.catalogId).toBe(3)
    }
  })

  it('visibly applies every offered finish, accent, pattern and detail control', () => {
    for (const art of originals) for (const style of styles) {
      const base = { ...appearance, style, finish: 'natural' as const, fabric: 'blue' as const, pattern: 'plain' as const, details: true }
      const pixels = raster(art, 'clean', base)
      expect.soft(raster(art, 'clean', { ...base, finish: 'walnut' }).equals(pixels), `${art.catalogId}/${style}/finish`).toBe(false)
      expect.soft(raster(art, 'clean', { ...base, fabric: 'rose' }).equals(pixels), `${art.catalogId}/${style}/fabric`).toBe(false)
      expect.soft(raster(art, 'clean', { ...base, pattern: 'checks' }).equals(pixels), `${art.catalogId}/${style}/pattern`).toBe(false)
      expect.soft(raster(art, 'clean', { ...base, details: false }).equals(pixels), `${art.catalogId}/${style}/details`).toBe(false)
    }
  })

  it('keeps the overflowing recycling bin material and pattern visible', () => {
    const art = originals.find((entry) => entry.catalogId === 'recycling')!
    const binFace = { x: -14, y: -8, width: 28, height: 22 }
    for (const style of styles) {
      const base = { ...appearance, style, pattern: 'plain' as const }
      const pixels = raster(art, 'messy2', base, binFace)
      expect(raster(art, 'messy2', { ...base, finish: 'charcoal' }, binFace).equals(pixels), `${style}/finish`).toBe(false)
      expect(raster(art, 'messy2', { ...base, pattern: 'checks' }, binFace).equals(pixels), `${style}/pattern`).toBe(false)
    }
  })

  it('keeps fallen couch cushions in the selected fabric', () => {
    const art = originals.find((entry) => entry.catalogId === 'couch')!
    for (const style of styles) expect(svg(art, 'messy2', { ...appearance, style })).not.toContain('fill="#6F95F0"')
  })

  it('keeps the open fridge door in the selected finish', () => {
    const art = originals.find((entry) => entry.catalogId === 'fridge')!
    expect(svg(art, 'messy2', { ...appearance, finish: 'charcoal' })).not.toContain('fill="#FFF6E6"')
  })

  it('preserves appliance glass highlights and chrome fixtures when changing the finish', () => {
    for (const id of ['stove', 'washer', 'shower', 'toilet']) for (const stage of stages) {
      const art = originals.find((entry) => entry.catalogId === id)!
      const original = new DOMParser().parseFromString(svg(art, stage), 'image/svg+xml')
      const paths = [...original.querySelectorAll('path[stroke="#FFFFFF"]')]
      if (id === 'stove' || id === 'shower') paths.push(original.querySelector('path[stroke="#C9D3E6"]')!)
      for (const style of styles) {
        const styled = new DOMParser().parseFromString(svg(art, stage, { ...appearance, style, finish: 'charcoal' }), 'image/svg+xml')
        for (const path of paths) {
          const matching = [...styled.querySelectorAll('path')].find((candidate) => candidate.getAttribute('d') === path.getAttribute('d') && candidate.getAttribute('stroke-width') === path.getAttribute('stroke-width'))!
          expect(matching.getAttribute('stroke'), `${id}/${style}/${stage}/highlight`).toBe(path.getAttribute('stroke'))
        }
        if (id === 'washer') expect(styled.querySelector('circle[r="10.5"]')!.getAttribute('fill'), `${style}/${stage}/washer ring`).toBe('#C9D3E6')
        if (id === 'toilet') {
          const button = original.querySelector('polygon[fill="#C9D3E6"]')!
          const matching = [...styled.querySelectorAll('polygon')].find((candidate) => candidate.getAttribute('points') === button.getAttribute('points'))!
          expect(matching.getAttribute('fill'), `${style}/${stage}/flush button`).toBe('#C9D3E6')
          const lid = original.querySelectorAll('polygon[fill="#FFFFFF"]')[2]
          const styledLid = [...styled.querySelectorAll('polygon')].find((candidate) => candidate.getAttribute('points') === lid.getAttribute('points'))!
          expect(styledLid.getAttribute('fill'), `${style}/${stage}/tank lid finish`).not.toBe('#FFFFFF')
        }
      }
    }
  })

  it('keeps fish-tank accents on the stand apron, leaving open stands empty', () => {
    const art = originals.find((entry) => entry.catalogId === 'fish-tank')!
    const opening = { x: 7, y: 12, width: 9, height: 8 }
    for (const style of ['classic', 'nordic', 'industrial'] as const) for (const stage of stages) {
      const base = { ...appearance, style, fabric: 'blue' as const, pattern: 'plain' as const, details: false }
      expect(raster(art, stage, base, opening).equals(raster(art, stage, { ...base, fabric: 'rose' }, opening)), `${style}/${stage}/opening`).toBe(true)
      expect(raster(art, stage, base).equals(raster(art, stage, { ...base, fabric: 'rose' })), `${style}/${stage}/accent`).toBe(false)
    }
  })

  it('keeps modern bean-bag mess on its shorter surface', () => {
    const art = originals.find((entry) => entry.catalogId === 'bean-bag')!
    for (const stage of ['messy1', 'messy2'] as const) {
      // The modern bag has no back lobe in this band; dust or web pixels here would float.
      const pixels = raster(art, stage, { ...appearance, style: 'modern', details: false }, { x: -24, y: -13, width: 26, height: 7 })
      expect(pixels.some((value, i) => i % 4 === 3 && value > 8), stage).toBe(false)
    }
  })

  it('tilts wall frame construction with the original picture and clock', () => {
    for (const [id, construction, body] of [
      ['poster', 'rect[width="23"]', 'rect[width="30"]'],
      ['wall-clock', 'rect[width="28"]', 'circle[r="13.4"][fill="none"]'],
    ]) for (const stage of ['messy1', 'messy2'] as const) {
      const art = originals.find((entry) => entry.catalogId === id)!
      const doc = new DOMParser().parseFromString(svg(art, stage, { ...appearance, style: 'modern' }), 'image/svg+xml')
      const frame = doc.querySelector(construction)!
      const picture = doc.querySelector(body)!
      const rotation = picture.closest('[transform^="rotate("]')
      expect(rotation, `${id}/${stage}/rotation`).not.toBeNull()
      expect(frame.closest('[transform^="rotate("]') === rotation, `${id}/${stage}/frame`).toBe(true)
    }
  })

  it('keeps pixels inside each object bound with original and styled appearances in every mess stage', () => {
    const outside: string[] = []
    for (const art of originals) for (const style of [undefined, ...styles]) for (const stage of stages) {
      const b = art.bounds
      const width = Math.ceil(b.width + 40)
      const height = Math.ceil(b.height + 40)
      const drawing = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`${b.x - 20} ${b.y - 20} ${width} ${height}`}>
        {customizeLegacyArt(art, stage, style ? { ...appearance, style } : undefined)}
      </svg>)
      const pixels = new Resvg(drawing, { font: { loadSystemFonts: false } }).render().pixels
      let escaped = false
      for (let y = 0; y < height && !escaped; y++) for (let x = 0; x < width; x++) {
        if (x >= 19 && x <= width - 19 && y >= 19 && y <= height - 19) continue
        if (pixels[(y * width + x) * 4 + 3] > 8) { escaped = true; break }
      }
      if (escaped) outside.push(`${art.catalogId}/${style ?? 'original'}/${stage}`)
    }
    expect(outside).toEqual([])
  }, 15000)

  it('uses unique SVG pattern ids when two copies share an appearance', () => {
    const art = originals.find((entry) => entry.catalogId === 'bed')!
    const bag = originals.find((entry) => entry.catalogId === 'bean-bag')!
    const drawing = renderToStaticMarkup(<svg>{customizeLegacyArt(art, 'clean', appearance)}{customizeLegacyArt(art, 'clean', appearance)}{customizeLegacyArt(bag, 'clean', appearance)}{customizeLegacyArt(bag, 'clean', appearance)}</svg>)
    const ids = [...drawing.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(1)
    expect(new Set(ids).size).toBe(ids.length)
    for (const [, id] of drawing.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(id)
  })
})
