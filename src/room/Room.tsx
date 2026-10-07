import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref, type SVGProps } from 'react'
import { PALETTE, ROOM_STROKE } from '../art/palette'
import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import type { NeglectLevel } from '../domain/neglect'
import type { MessStage, PlacedObject, Room as RoomRow } from '../domain/types'
import { planCues, type CueInput } from './cuePlan'
import { depthOrder, footprintOf, type Footprint, type Placement, type Sortable } from './grid'
import { NeglectCue } from './neglect'
import { OBJECT_ART, cleanTop } from './objects'
import { neglectSummary } from './roomSummary'
import { RoomShell } from './shell/RoomShell'
import './Room.css'
import { OBJECT_SCALE, PET_SCALE, ROOM_INK, TILE_SCALE, petTransform, roomPoint, roomPoints } from './shell/geometry'

// The room: shell, floor highlights, then every object and the pet drawn back
// to front, then neglect cues and the build selection on top. Pure rendering;
// build mode (src/room/BuildRoom.tsx) adds input.
//
// It re-renders whenever the pet changes what it is doing, so everything that
// doesn't move is memoised: the shell's floor and walls, each object's art
// (PlacedArt) and each cue (NeglectCue).

const { ink, accent, white, cream, creamDark } = PALETTE

export { PET_SCALE } from './shell/geometry'

const FITS = '#5DBB63'
const BLOCKED = PALETTE.warmRed

export interface Ghost {
  entry: CatalogEntry
  placement: Placement
  ok: boolean
}

export interface RoomPet {
  /** The tile it stands on (fractional while walking). */
  tile: { tx: number; ty: number }
  /** Its art in a 200x200 box, e.g. <CharacterArt strokeScale={PET_STROKE_SCALE} />. */
  art: ReactNode
  /** -1 mirrors it to face left. */
  facing?: 1 | -1
  label?: string
  /** Makes the pet a button (with a 44 px hit area and a focus ring). */
  onTap?: () => void
  /**
   * The pet's positioned <g>. The living room moves the pet by writing its
   * `transform` (petTransform() in ./shell/geometry) every frame, without
   * re-rendering the room.
   */
  nodeRef?: Ref<SVGGElement>
}

export interface RoomProps {
  room: Pick<RoomRow, 'floorStyle' | 'wallStyle'>
  objects: PlacedObject[]
  /** Mess stage per placed object id; clean when missing. */
  stages?: Record<string, MessStage>
  /** Neglect level per placed object id (src/domain/neglect.ts): a cue floats above each late object. */
  neglect?: Record<string, NeglectLevel>
  /** Days late per placed object id (objectOverdue() in ./cuePlan): breaks ties when choosing which cues show in full. */
  overdue?: Record<string, number>
  selectedId?: string | null
  /** A new or moving object's preview: drawn see-through with a green or red footprint. */
  ghost?: Ghost | null
  /** Hide this placed object (it is being dragged, the ghost stands in for it). */
  hiddenId?: string | null
  pet?: RoomPet | null
  /** Effects drawn on top of everything, in room coordinates (sparkles). */
  overlay?: ReactNode
  width?: number
  className?: string
  svgRef?: Ref<SVGSVGElement>
  svgProps?: SVGProps<SVGSVGElement>
}

type Item = Sortable & { draw: () => ReactNode }

/** Object art placed on its tiles, mirrored for odd rotations. Memoised: it only changes when moved or its mess changes. */
const PlacedArt = memo(function PlacedArt({ entry, placement, stage }: { entry: CatalogEntry; placement: Placement; stage: MessStage }) {
  const corner = roomPoint(placement.tileX, placement.tileY)
  const flip = placement.rotation % 2 === 1 ? -1 : 1
  const art = OBJECT_ART[entry.id]
  return (
    <g transform={`translate(${corner.x} ${corner.y}) scale(${flip * OBJECT_SCALE} ${OBJECT_SCALE})`}>
      {art ? art.render(stage) : placeholder(entry)}
    </g>
  )
})

/** The top-centre of an object's clean art in room coordinates, where its neglect cue sits. */
function objectTop(entry: CatalogEntry, p: Placement) {
  const corner = roomPoint(p.tileX, p.tileY)
  const flip = p.rotation % 2 === 1 ? -1 : 1
  const art = OBJECT_ART[entry.id]
  const b = art?.bounds ?? { x: -32, y: -40, width: 64, height: 56 }
  const top = art ? cleanTop(art) : -26
  return { x: corner.x + flip * OBJECT_SCALE * (b.x + b.width / 2), y: corner.y + OBJECT_SCALE * top }
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

const footprintCorners = (f: Footprint) => roomPoints([f.tx, f.ty], [f.tx + f.w, f.ty], [f.tx + f.w, f.ty + f.d], [f.tx, f.ty + f.d])

function footprintPolygon(f: Footprint, fill: string, opacity: number, dashed = false) {
  return (
    <polygon
      points={footprintCorners(f)}
      fill={fill}
      fillOpacity={opacity}
      stroke={fill}
      strokeWidth={2.5}
      strokeDasharray={dashed ? '6 5' : undefined}
    />
  )
}

/** The selected object: an accent outline round its footprint and a bobbing chevron over it, drawn over everything. */
function Selection({ footprint, top }: { footprint: Footprint; top: { x: number; y: number } }) {
  return (
    <g className="room-selection" style={{ pointerEvents: 'none' }} aria-hidden="true">
      <polygon points={footprintCorners(footprint)} fill="none" stroke={white} strokeWidth={5} strokeOpacity={0.7} />
      <polygon points={footprintCorners(footprint)} fill="none" stroke={accent} strokeWidth={3} strokeDasharray="7 5" />
      <g transform={`translate(${top.x} ${top.y - 6})`}>
        <g className="room-chevron">
          <polygon points="-8,-12 0,-5 8,-12 8,-6 0,1 -8,-6" fill={accent} stroke={ink} strokeWidth={ROOM_INK * 0.9} />
        </g>
      </g>
    </g>
  )
}

/** How long a just-placed object plays its drop (Room.css). */
const DROP_MS = 700

/**
 * Objects that have just arrived in this room (placed since it was first drawn), for a
 * moment: they drop into place. Ones already there when the room appears never do.
 */
function useJustPlaced(objects: PlacedObject[]): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set())
  const ids = objects.map((o) => o.id).join(' ')
  useEffect(() => {
    const now = new Set(ids ? ids.split(' ') : [])
    const before = seen.current
    seen.current = now
    if (!before) return
    const added = [...now].filter((id) => !before.has(id))
    if (!added.length) return
    setFresh(new Set(added))
    const timer = window.setTimeout(() => setFresh(new Set()), DROP_MS)
    return () => window.clearTimeout(timer)
  }, [ids])
  return fresh
}

/** Room-px size of the pet's invisible hit area (at least 44 css px on a phone). */
const PET_HIT = 64

// Stable defaults, so memoised work isn't redone on every render.
const NO_STAGES: Record<string, MessStage> = {}
const NO_NEGLECT: Record<string, NeglectLevel> = {}

export function Room({ room, objects, stages = NO_STAGES, neglect = NO_NEGLECT, overdue, selectedId, ghost, hiddenId, pet, overlay, width, className, svgRef, svgProps }: RoomProps) {
  const items: Item[] = []
  const justPlaced = useJustPlaced(objects)

  for (const o of objects) {
    const entry = catalogEntry(o.catalogId)
    if (!entry || o.id === hiddenId) continue
    items.push({
      id: o.id,
      footprint: footprintOf(o, entry),
      layer: entry.layer,
      draw: () => (
        <g key={o.id} data-object-id={o.id} className={justPlaced.has(o.id) ? 'room-obj-drop' : undefined} style={{ cursor: 'pointer' }}>
          <PlacedArt entry={entry} placement={o} stage={stages[o.id] ?? 'clean'} />
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
          <PlacedArt entry={ghost.entry} placement={ghost.placement} stage="clean" />
        </g>
      ),
    })
  }

  if (pet) {
    const hit = PET_HIT / PET_SCALE
    items.push({
      id: '__pet',
      // Sorted as the tile it is mostly on, so it slips behind and in front of things as it walks.
      footprint: { tx: Math.round(pet.tile.tx), ty: Math.round(pet.tile.ty), w: 1, d: 1 },
      layer: 'solid',
      draw: () => (
        <g
          key="__pet"
          ref={pet.nodeRef}
          transform={petTransform(pet.tile)}
          className={pet.onTap ? 'room-pet' : undefined}
          style={{ pointerEvents: pet.onTap ? 'auto' : 'none', cursor: pet.onTap ? 'pointer' : undefined }}
          {...(pet.onTap && {
            role: 'button',
            tabIndex: 0,
            'aria-label': pet.label ?? 'Your pet',
            onClick: pet.onTap,
            onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                pet.onTap?.()
              }
            },
          })}
        >
          {pet.onTap && (
            <>
              {/* Shown on keyboard focus only (LivingRoom.css). */}
              <ellipse className="room-pet-ring" cx={100} cy={180} rx={78} ry={30} fill={accent} fillOpacity={0.22} stroke={accent} strokeWidth={3 / PET_SCALE} />
              {/* A bigger, invisible target than the art itself. */}
              <rect x={100 - hit / 2} y={190 - hit} width={hit} height={hit} fill="transparent" stroke="none" />
            </>
          )}
          <g transform={pet.facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}>{pet.art}</g>
        </g>
      ),
    })
  }

  const selected = objects.find((o) => o.id === selectedId && o.id !== hiddenId)
  const selectedEntry = selected && catalogEntry(selected.catalogId)

  // Which cues show, at what level, and which move (./cuePlan): stable while the pet walks.
  const cues = useMemo(() => {
    const inputs: CueInput[] = []
    for (const o of objects) {
      const level = neglect[o.id]
      const entry = level && o.id !== hiddenId ? catalogEntry(o.catalogId) : undefined
      if (!level || !entry) continue
      inputs.push({ id: o.id, kind: entry.mess, level, overdue: overdue?.[o.id] ?? 0, anchor: objectTop(entry, o) })
    }
    return planCues(inputs)
  }, [objects, neglect, overdue, hiddenId])

  const summary = useMemo(() => neglectSummary(objects, neglect), [objects, neglect])

  return (
    <RoomShell
      floorStyle={room.floorStyle}
      wallStyle={room.wallStyle}
      width={width}
      className={className}
      svgRef={svgRef}
      summary={summary}
      svgProps={pet?.onTap ? { role: 'group', ...svgProps } : svgProps}
    >
      {selected && selectedEntry && footprintPolygon(footprintOf(selected, selectedEntry), accent, 0.3)}
      {ghost && footprintPolygon(footprintOf(ghost.placement, ghost.entry), ghost.ok ? FITS : BLOCKED, 0.4, true)}
      {depthOrder(items).map((i) => i.draw())}
      {cues.map((c) => (
        <g key={`neglect-${c.id}`} transform={`translate(${c.x} ${c.y}) scale(${TILE_SCALE})`} stroke="none" style={{ pointerEvents: 'none' }}>
          <NeglectCue kind={c.kind} level={c.level} still={!c.animate} />
        </g>
      ))}
      {selected && selectedEntry && <Selection footprint={footprintOf(selected, selectedEntry)} top={objectTop(selectedEntry, selected)} />}
      {overlay}
    </RoomShell>
  )
}
