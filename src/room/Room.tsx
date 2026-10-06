import type { ReactNode, Ref, SVGProps } from 'react'
import { PALETTE, ROOM_STROKE } from '../art/palette'
import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import type { MessStage, PlacedObject, Room as RoomRow } from '../domain/types'
import { depthOrder, footprintOf, type Footprint, type Placement, type Sortable } from './grid'
import { OBJECT_ART } from './objects'
import { RoomShell } from './shell/RoomShell'
import { OBJECT_SCALE, roomPoint, roomPoints } from './shell/geometry'

// The room: shell, floor highlights, then every object and the pet drawn back
// to front. Pure rendering; build mode (src/room/BuildRoom.tsx) adds input.

const { ink, accent, white, cream, creamDark } = PALETTE

/** How big the pet's 200x200 art is drawn in the room (about one tile wide). */
export const PET_SCALE = 0.44

const FITS = '#5DBB63'
const BLOCKED = PALETTE.warmRed

export interface Ghost {
  entry: CatalogEntry
  placement: Placement
  ok: boolean
}

export interface RoomProps {
  room: Pick<RoomRow, 'floorStyle' | 'wallStyle'>
  objects: PlacedObject[]
  /** Mess stage per placed object id; clean when missing. */
  stages?: Record<string, MessStage>
  selectedId?: string | null
  /** A new or moving object's preview: drawn see-through with a green or red footprint. */
  ghost?: Ghost | null
  /** Hide this placed object (it is being dragged, the ghost stands in for it). */
  hiddenId?: string | null
  /** The pet's art in its 200x200 box (e.g. <CharacterArt />) and the tile it stands on. */
  pet?: { tile: { tx: number; ty: number }; art: ReactNode } | null
  width?: number
  className?: string
  svgRef?: Ref<SVGSVGElement>
  svgProps?: SVGProps<SVGSVGElement>
}

type Item = Sortable & { draw: () => ReactNode }

/** Object art placed on its tiles, mirrored for odd rotations. */
function objectArt(entry: CatalogEntry, p: Placement, stage: MessStage) {
  const corner = roomPoint(p.tileX, p.tileY)
  const flip = p.rotation % 2 === 1 ? -1 : 1
  const art = OBJECT_ART[entry.id]
  return (
    <g transform={`translate(${corner.x} ${corner.y}) scale(${flip * OBJECT_SCALE} ${OBJECT_SCALE})`}>
      {art ? art.render(stage) : placeholder(entry)}
    </g>
  )
}

/** A plain box for objects whose art hasn't landed yet, in art units (64 px tiles). */
function placeholder(entry: CatalogEntry) {
  const { w, d } = entry.footprint
  const h = entry.layer === 'flat' ? 3 : 26
  const pt = (tx: number, ty: number, z: number) => `${(tx - ty) * 32},${(tx + ty) * 16 - z}`
  return (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round">
      <polygon points={[pt(0, d, h), pt(w, d, h), pt(w, d, 0), pt(0, d, 0)].join(' ')} fill={creamDark} />
      <polygon points={[pt(w, 0, h), pt(w, d, h), pt(w, d, 0), pt(w, 0, 0)].join(' ')} fill={cream} />
      <polygon points={[pt(0, 0, h), pt(w, 0, h), pt(w, d, h), pt(0, d, h)].join(' ')} fill={white} />
    </g>
  )
}

function footprintPolygon(f: Footprint, fill: string, opacity: number, dashed = false) {
  return (
    <polygon
      points={roomPoints([f.tx, f.ty], [f.tx + f.w, f.ty], [f.tx + f.w, f.ty + f.d], [f.tx, f.ty + f.d])}
      fill={fill}
      fillOpacity={opacity}
      stroke={fill}
      strokeWidth={2.5}
      strokeDasharray={dashed ? '6 5' : undefined}
    />
  )
}

export function Room({ room, objects, stages = {}, selectedId, ghost, hiddenId, pet, width, className, svgRef, svgProps }: RoomProps) {
  const items: Item[] = []

  for (const o of objects) {
    const entry = catalogEntry(o.catalogId)
    if (!entry || o.id === hiddenId) continue
    items.push({
      id: o.id,
      footprint: footprintOf(o, entry),
      layer: entry.layer,
      draw: () => (
        <g key={o.id} data-object-id={o.id} style={{ cursor: 'pointer' }}>
          {objectArt(entry, o, stages[o.id] ?? 'clean')}
        </g>
      ),
    })
  }

  if (ghost) {
    items.push({
      id: '__ghost',
      footprint: footprintOf(ghost.placement, ghost.entry),
      layer: ghost.entry.layer,
      draw: () => (
        <g key="__ghost" opacity={0.78} style={{ pointerEvents: 'none' }}>
          {objectArt(ghost.entry, ghost.placement, 'clean')}
        </g>
      ),
    })
  }

  if (pet) {
    const feet = roomPoint(pet.tile.tx + 0.5, pet.tile.ty + 0.5)
    items.push({
      id: '__pet',
      footprint: { tx: pet.tile.tx, ty: pet.tile.ty, w: 1, d: 1 },
      layer: 'solid',
      draw: () => (
        <g key="__pet" transform={`translate(${feet.x - 100 * PET_SCALE} ${feet.y - 182 * PET_SCALE}) scale(${PET_SCALE})`} style={{ pointerEvents: 'none' }}>
          {pet.art}
        </g>
      ),
    })
  }

  const selected = objects.find((o) => o.id === selectedId && o.id !== hiddenId)
  const selectedEntry = selected && catalogEntry(selected.catalogId)

  return (
    <RoomShell floorStyle={room.floorStyle} wallStyle={room.wallStyle} width={width} className={className} svgRef={svgRef} svgProps={svgProps}>
      {selected && selectedEntry && footprintPolygon(footprintOf(selected, selectedEntry), accent, 0.3)}
      {ghost && footprintPolygon(footprintOf(ghost.placement, ghost.entry), ghost.ok ? FITS : BLOCKED, 0.4, true)}
      {depthOrder(items).map((i) => i.draw())}
    </RoomShell>
  )
}
