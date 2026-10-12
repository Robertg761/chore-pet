import { useLayoutEffect, useRef, useState } from 'react'
import type { CatalogEntry } from '../catalog/types'
import { OBJECT_ART, cleanTop } from '../room/objects'
import type { ObjectArt } from '../room/objects/types'
import type { FurnitureAppearance } from '../catalog/customization'

// A catalog picture cropped to the clean drawing. An object's `bounds` leave
// headroom for its messiest stage, which made thumbnails small and uneven, so
// the first time each object is drawn its clean art is measured (getBBox) and
// the crop is remembered. Until then (and where there is no layout, as in
// tests) it crops from the art's `cueY` to the bottom of its bounds.

type Box = { x: number; y: number; width: number; height: number }

/** Room around the measured art, in art units: outlines are not in getBBox, plus a little air. */
const PAD = 4

const measured = new Map<string, Box>()

function estimate(art: ObjectArt): Box {
  const { x, y, width, height } = art.bounds
  const top = Math.max(y, cleanTop(art) - PAD)
  return { x, y: top, width, height: y + height - top }
}

/** A small picture of a catalog object, or a soft placeholder until its art lands. */
export function ObjectThumb({ entry, className, appearance }: { entry: CatalogEntry; className?: string; appearance?: FurnitureAppearance }) {
  const art = OBJECT_ART[entry.id]
  const cacheKey = `${entry.id}:${JSON.stringify(appearance ?? null)}`
  const artRef = useRef<SVGGElement>(null)
  // Bumped once the art is measured, to redraw with the tighter crop.
  const [, setMeasuredFor] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!art || measured.has(cacheKey)) return
    let b: DOMRect | undefined
    try {
      b = artRef.current?.getBBox()
    } catch {
      return // no layout (tests, a hidden tree): keep the estimate
    }
    if (!b || !b.width || !b.height) return
    const fit = { x: b.x - PAD, y: b.y - PAD, width: b.width + PAD * 2, height: b.height + PAD * 2 }
    // Bound the cache even after a long customization session.
    if (measured.size >= 400) measured.delete(measured.keys().next().value!)
    measured.set(cacheKey, fit)
    setMeasuredFor(cacheKey)
  }, [art, cacheKey])

  if (!art) {
    return (
      <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <rect x="6" y="6" width="36" height="36" rx="10" fill="#e4dcf7" stroke="#2b1e2f" strokeWidth="3" />
      </svg>
    )
  }
  const { x, y, width, height } = measured.get(cacheKey) ?? estimate(art)
  return (
    <svg className={className} viewBox={`${x} ${y} ${width} ${height}`} aria-hidden="true" focusable="false">
      <g ref={artRef}>{art.render('clean', appearance)}</g>
    </svg>
  )
}
