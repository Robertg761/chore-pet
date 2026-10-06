import type { CatalogEntry } from '../catalog/types'
import { OBJECT_ART } from '../room/objects'

/** A small picture of a catalog object, or a soft placeholder until its art lands. */
export function ObjectThumb({ entry, className }: { entry: CatalogEntry; className?: string }) {
  const art = OBJECT_ART[entry.id]
  if (!art) {
    return (
      <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <rect x="6" y="6" width="36" height="36" rx="10" fill="#e4dcf7" stroke="#2b1e2f" strokeWidth="3" />
      </svg>
    )
  }
  const { x, y, width, height } = art.bounds
  return (
    <svg className={className} viewBox={`${x} ${y} ${width} ${height}`} aria-hidden="true" focusable="false">
      {art.render('clean')}
    </svg>
  )
}
