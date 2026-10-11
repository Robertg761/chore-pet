import { memo, type ReactNode, type Ref, type SVGProps } from 'react'
import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { RoomDoor, RoomSide } from '../connections'
import {
  ROOM_INK,
  ROOM_TILES as N,
  ROOM_VIEWBOX,
  SLAB_DEPTH,
  WALL_HEIGHT as H,
  WALL_THICKNESS as T,
  roomPoint,
  roomPoints,
  WINDOW,
} from './geometry'
import { floorStyleOf, wallStyleOf, type FloorStyle, type FloorStyleId, type WallStyle, type WallStyleId } from './styles'

// The room shell: back walls, floor and a window, in reference room
// coordinates (docs/ART.md, "Isometric room"). Walls stand on the two back
// edges of the floor diamond; the floor sits on a thin slab so the room reads
// as a cosy diorama. Adjacent rooms share a wall with a real opening; doorway
// controls sit above the room's objects so they remain easy to reach.

const { ink, cream, creamDark, floorWood, sky, white } = PALETTE

type P3 = [number, number, number?]

/** Point on the left wall plane: u along ty (0 back, N front), z up. */
const L = (u: number, z: number): P3 => [0, u, z]
/** Point on the right wall plane: u along tx. */
const R = (u: number, z: number): P3 => [u, 0, z]
const EMPTY_DOORS: readonly RoomDoor[] = []
const PARTITION_HEIGHT = 88
const DOOR_HEIGHT = 72
type WallPlane = (u: number, z: number) => P3
type Span = [number, number]

/** Solid runs along a wall, excluding every doorway. */
function solidSpans(doors: readonly RoomDoor[]): Span[] {
  const spans: Span[] = []
  let start = 0
  for (const door of [...doors].sort((a, b) => a.start - b.start)) {
    const end = Math.max(0, Math.min(N, door.start))
    if (end > start) spans.push([start, end])
    start = Math.max(start, Math.min(N, door.end))
  }
  if (start < N) spans.push([start, N])
  return spans
}

function wallQuad(plane: WallPlane, start: number, end: number, bottom: number, top: number) {
  return roomPoints(plane(start, bottom), plane(end, bottom), plane(end, top), plane(start, top))
}

function doorPlane(side: RoomSide): WallPlane {
  if (side === 'west') return L
  if (side === 'north') return R
  if (side === 'east') return (u, z) => [N, u, z]
  return (u, z) => [u, N, z]
}

/** Offset a wall point toward the room interior. */
function insetPoint(side: RoomSide, u: number, distance: number, z = 0): P3 {
  if (side === 'west') return [distance, u, z]
  if (side === 'north') return [u, distance, z]
  if (side === 'east') return [N - distance, u, z]
  return [u, N - distance, z]
}

/** Shift a room-space polygon straight down by dy px (for the floor slab). */
function slabPoints(corners: P3[], dy: number) {
  return corners
    .map(([tx, ty, z]) => {
      const p = roomPoint(tx, ty, z ?? 0)
      return `${p.x},${p.y + dy}`
    })
    .join(' ')
}

function Line({ a, b, stroke = ink, opacity = 0.15, width = 1.2 }: { a: P3; b: P3; stroke?: string; opacity?: number; width?: number }) {
  const p = roomPoint(a[0], a[1], a[2] ?? 0)
  const q = roomPoint(b[0], b[1], b[2] ?? 0)
  return <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={stroke} strokeOpacity={opacity} strokeWidth={width} />
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Thinner inner lines (baseboard, window panes): 2 px at the reference room, shrunk with the tiles. */
const DETAIL_INK = (2 * ROOM_INK) / 3

// ---- floor -----------------------------------------------------------------

function slab(floor: FloorStyle, doors: readonly RoomDoor[]) {
  const front: P3[] = [[0, N, 0], [N, N, 0]]
  const right: P3[] = [[N, N, 0], [N, 0, 0]]
  return (
    <g>
      {!doors.some((door) => door.side === 'south') && <polygon points={`${slabPoints(front, 0)} ${slabPoints([...front].reverse(), SLAB_DEPTH)}`} fill={floor.edgeLeft} />}
      {!doors.some((door) => door.side === 'east') && <polygon points={`${slabPoints(right, 0)} ${slabPoints([...right].reverse(), SLAB_DEPTH)}`} fill={floor.edgeRight} />}
    </g>
  )
}

function planks() {
  const rows = range(N * 2) // planks half a tile wide, running along tx
  return (
    <g>
      {rows.map((j) =>
        j % 2 === 1 ? (
          <polygon key={j} points={roomPoints([0, j / 2], [N, j / 2], [N, j / 2 + 0.5], [0, j / 2 + 0.5])} fill={ink} fillOpacity={0.06} stroke="none" />
        ) : null,
      )}
      <g strokeLinecap="round">
        {rows.slice(1).map((j) => (
          <Line key={'s' + j} a={[0, j / 2]} b={[N, j / 2]} />
        ))}
        {/* staggered butt joints, 3 tiles apart, always on a tile line */}
        {rows.flatMap((j) =>
          [0, 3, 6]
            .map((k) => k + ((j * 2) % 3))
            .filter((tx) => tx > 0 && tx < N)
            .map((tx) => <Line key={`j${j}-${tx}`} a={[tx, j / 2]} b={[tx, j / 2 + 0.5]} />),
        )}
      </g>
    </g>
  )
}

function seams(opacity: number) {
  return (
    <g strokeLinecap="round">
      {range(N - 1).map((i) => (
        <Line key={'a' + i} a={[i + 1, 0]} b={[i + 1, N]} opacity={opacity} />
      ))}
      {range(N - 1).map((i) => (
        <Line key={'b' + i} a={[0, i + 1]} b={[N, i + 1]} opacity={opacity} />
      ))}
    </g>
  )
}

function checker(floor: FloorStyle) {
  return (
    <g>
      {range(N).flatMap((i) =>
        range(N).map((j) =>
          (i + j) % 2 === 1 ? (
            <polygon key={`${i}-${j}`} points={roomPoints([i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1])} fill={floor.alt} stroke="none" />
          ) : null,
        ),
      )}
      {seams(0.16)}
    </g>
  )
}

/** Small half-tile squares in two close tones, like bathroom mosaic. */
function mosaic(floor: FloorStyle) {
  const n = N * 2
  const h = 0.5
  return (
    <g>
      {range(n).flatMap((i) =>
        range(n).map((j) =>
          (i + j) % 2 === 1 ? (
            <polygon key={`${i}-${j}`} points={roomPoints([i * h, j * h], [(i + 1) * h, j * h], [(i + 1) * h, (j + 1) * h], [i * h, (j + 1) * h])} fill={floor.alt} stroke="none" />
          ) : null,
        ),
      )}
      <g strokeLinecap="round">
        {range(n - 1).map((i) => (
          <Line key={'a' + i} a={[(i + 1) * h, 0]} b={[(i + 1) * h, N]} opacity={0.08} width={0.8} />
        ))}
        {range(n - 1).map((i) => (
          <Line key={'b' + i} a={[0, (i + 1) * h]} b={[N, (i + 1) * h]} opacity={0.08} width={0.8} />
        ))}
      </g>
      {seams(0.12)}
    </g>
  )
}

function rug(floor: FloorStyle) {
  const ring = (inset: number) => roomPoints([inset, inset], [N - inset, inset], [N - inset, N - inset], [inset, N - inset])
  return (
    <g>
      {seams(0.07)}
      <polygon points={ring(0.55)} fill="none" stroke={floor.alt} strokeWidth={5} />
      <polygon points={ring(1)} fill="none" stroke={white} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 5" />
    </g>
  )
}

function floorLayer(floor: FloorStyle, doors: readonly RoomDoor[]) {
  const diamond = roomPoints([0, 0], [N, 0], [N, N], [0, N])
  const pattern = floor.pattern === 'planks' ? planks() : floor.pattern === 'checker' ? checker(floor) : floor.pattern === 'mosaic' ? mosaic(floor) : rug(floor)
  const s = 0.38 // wall shadow width in tiles
  return (
    <g>
      {slab(floor, doors)}
      <polygon points={diamond} fill={floor.top} stroke="none" />
      {pattern}
      <polygon points={diamond} fill="none" />
      {/* soft shadow along the wall bases */}
      {(['west', 'north'] as const).flatMap((side) => solidSpans(doors.filter((door) => door.side === side)).map(([start, end]) => (
        <polygon key={`${side}-${start}`} points={roomPoints(insetPoint(side, start, 0), insetPoint(side, end, 0), insetPoint(side, end, s), insetPoint(side, start, s))} fill={ink} fillOpacity={0.15} stroke="none" />
      )))}
    </g>
  )
}

// ---- walls -----------------------------------------------------------------

function stripes(wall: WallStyle, plane: WallPlane, spans: Span[], height: number, hasDoors: boolean) {
  if (!wall.stripes) return null
  return (
    <g>
      {range(N)
        .filter((k) => k % 2 === 0)
        .flatMap((k) => [
          ...spans.map(([start, end]) => [Math.max(start, k + 0.5), Math.min(end, k + 1)] as Span)
            .filter(([start, end]) => start < end)
            .map(([start, end]) => <polygon key={`${k}-${start}`} points={wallQuad(plane, start, end, 10, hasDoors ? DOOR_HEIGHT : height)} fill={white} fillOpacity={0.3} stroke="none" />),
          hasDoors && <polygon key={`${k}-lintel`} points={wallQuad(plane, k + 0.5, k + 1, DOOR_HEIGHT, height)} fill={white} fillOpacity={0.3} stroke="none" />,
        ])}
    </g>
  )
}

function wallFace(wall: WallStyle, side: 'west' | 'north', doors: readonly RoomDoor[]) {
  const plane = side === 'west' ? L : R
  const height = doors.length ? PARTITION_HEIGHT : H
  const spans = solidSpans(doors)
  const colour = side === 'west' ? wall.left : wall.right
  const outside = (u: number, z: number) => insetPoint(side, u, -T, z)
  return (
    <g>
      {spans.map(([start, end]) => <polygon key={start} points={wallQuad(plane, start, end, 0, height)} fill={colour} />)}
      {doors.map((door) => <polygon key={door.toRoomId} points={wallQuad(plane, door.start, door.end, DOOR_HEIGHT, height)} fill={colour} />)}
      {stripes(wall, plane, spans, height, doors.length > 0)}
      {spans.map(([start, end]) => <polygon key={`base-${start}`} points={wallQuad(plane, start, end, 0, 9)} fill={cream} strokeWidth={DETAIL_INK} />)}
      {side === 'west' && doors.length === 0 && windowLayer()}
      <polygon points={roomPoints(plane(N, height), outside(N, height), outside(N, 0), plane(N, 0))} fill={side === 'west' ? creamDark : cream} />
      <polygon points={roomPoints(outside(0, height), outside(N, height), plane(N, height), plane(0, height))} fill={cream} />
    </g>
  )
}

function walls(wall: WallStyle, doors: readonly RoomDoor[]) {
  return <g>{wallFace(wall, 'north', doors.filter((door) => door.side === 'north'))}{wallFace(wall, 'west', doors.filter((door) => door.side === 'west'))}</g>
}

// ---- doors -----------------------------------------------------------------

function DoorArt({ door }: { door: RoomDoor }) {
  const { side, start, end } = door
  const plane = doorPlane(side)
  const ownsWall = side === 'west' || side === 'north'
  const frameWidth = 0.15
  const leafHeight = DOOR_HEIGHT - 6
  const leafWidth = end - start - 0.12
  const leaf = (u: number, z: number) => insetPoint(side, start + u * 0.22, u * 0.84, z)
  const handle = roomPoint(...leaf(leafWidth * 0.83, leafHeight * 0.47))
  return (
    <g aria-hidden="true" pointerEvents="none">
      <polygon points={roomPoints(insetPoint(side, start, ownsWall ? -T : 0, 1), insetPoint(side, end, ownsWall ? -T : 0, 1), insetPoint(side, end, 0.33, 1), insetPoint(side, start, 0.33, 1))} fill={creamDark} strokeWidth={1.3} />
      {ownsWall && <>
        {/* The wall faces stop at the doorway. These are its thickness and trim. */}
        <polygon points={roomPoints(plane(start, 0), insetPoint(side, start, -T), insetPoint(side, start, -T, DOOR_HEIGHT), plane(start, DOOR_HEIGHT))} fill={creamDark} strokeWidth={DETAIL_INK} />
        <polygon points={roomPoints(plane(end, 0), insetPoint(side, end, -T), insetPoint(side, end, -T, DOOR_HEIGHT), plane(end, DOOR_HEIGHT))} fill={creamDark} strokeWidth={DETAIL_INK} />
        <polygon points={wallQuad(plane, start - frameWidth, start, 0, DOOR_HEIGHT + 4)} fill={cream} strokeWidth={DETAIL_INK} />
        <polygon points={wallQuad(plane, end, end + frameWidth, 0, DOOR_HEIGHT + 4)} fill={cream} strokeWidth={DETAIL_INK} />
        <polygon points={wallQuad(plane, start - frameWidth, end + frameWidth, DOOR_HEIGHT, DOOR_HEIGHT + 5)} fill={cream} strokeWidth={DETAIL_INK} />
        {/* An open leaf swings into the room, leaving the aperture transparent. */}
        <polygon points={roomPoints(leaf(0, 2), leaf(leafWidth, 2), leaf(leafWidth, leafHeight), leaf(0, leafHeight))} fill={floorWood} strokeWidth={DETAIL_INK} />
        <polygon points={roomPoints(leaf(0.13, 9), leaf(leafWidth - 0.13, 9), leaf(leafWidth - 0.13, leafHeight - 8), leaf(0.13, leafHeight - 8))} fill={creamDark} strokeWidth={1} />
        <circle cx={handle.x} cy={handle.y} r={2.1} fill={PALETTE.petDefault} strokeWidth={1} />
      </>}
    </g>
  )
}

function DoorControl({ door, onDoor, doorLabel, interactionScale = 1 }: { door: RoomDoor; onDoor: (toRoomId: string) => void; doorLabel?: (id: string) => string; interactionScale?: number }) {
  const { side, start, end, blocked, toRoomId } = door
  const plane = doorPlane(side)
  const label = `Door to ${doorLabel?.(toRoomId) ?? 'next room'}${blocked ? ', blocked by furniture' : ''}`
  const badge = roomPoint(...plane((start + end) / 2, 25))
  const outline = wallQuad(plane, start - 0.09, end + 0.09, 1, DOOR_HEIGHT + 2)
  const scale = Number.isFinite(interactionScale) && interactionScale > 0 ? interactionScale : 1
  const hitSize = 44 / scale
  const badgeScale = Math.max(1, 1 / scale)
  const hitBox = { x: badge.x - hitSize / 2, y: badge.y - hitSize / 2, width: hitSize, height: hitSize, rx: 10 / scale }
  return (
    <g
      className="room-door"
      data-door-to={toRoomId}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={blocked || undefined}
      pointerEvents="visiblePainted"
      style={{ cursor: blocked ? 'not-allowed' : 'pointer', outline: 'none' }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); if (!blocked) onDoor(toRoomId) }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        if (!blocked) onDoor(toRoomId)
      }}
    >
      <title>{label}</title>
      <polygon points={outline} fill="transparent" stroke="none" />
      <rect className="room-door-hit" {...hitBox} fill="transparent" stroke="none" />
      <rect className="room-door-focus" {...hitBox} fill="none" stroke={PALETTE.accent} strokeWidth={2 / scale} pointerEvents="none" />
      <g className="room-door-badge" transform={`translate(${badge.x} ${badge.y}) scale(${badgeScale})`} pointerEvents="none">
        <circle r={9} fill={cream} stroke={blocked ? PALETTE.warmRed : PALETTE.woodDark} strokeWidth={1.5} />
        {blocked
          ? <path d="M-3 -3 l6 6 m0 -6 l-6 6" fill="none" stroke={PALETTE.warmRed} strokeWidth={1.7} />
          : <path d="M-3.5 0 h7 m-3 -3 l3 3 -3 3" fill="none" stroke={PALETTE.woodDark} strokeWidth={1.7} />}
      </g>
    </g>
  )
}

export interface RoomDoorControlsProps {
  doors: readonly RoomDoor[]
  onDoor: (toRoomId: string) => void
  doorLabel?: (roomId: string) => string
  interactionScale?: number
}

/** Reused in a world overlay so neighboring room art cannot intercept door taps. */
export function RoomDoorControls({ doors, onDoor, doorLabel, interactionScale }: RoomDoorControlsProps) {
  return (
    <g stroke={ink} strokeLinejoin="round" strokeLinecap="round">
      <style>{`.room-door-focus{opacity:0}.room-door:focus-visible .room-door-focus{opacity:1}.room-door:hover .room-door-badge circle{fill:${white}}`}</style>
      {doors.map((door) => <DoorControl key={`${door.side}-${door.toRoomId}`} door={door} onDoor={onDoor} doorLabel={doorLabel} interactionScale={interactionScale} />)}
    </g>
  )
}

// ---- window ----------------------------------------------------------------

const WIN = WINDOW

function windowLayer() {
  const { u0, u1, z0, z1 } = WIN
  const uMid = (u0 + u1) / 2
  const zMid = (z0 + z1) / 2
  const du = 0.09 // frame width along the wall, in tiles
  const dz = 5 // frame width in px
  const gu = 0.03
  const gz = 1.5 // half the mullion
  const panes: [number, number, number, number][] = [
    [u0 + du, uMid - gu, zMid + gz, z1 - dz],
    [uMid + gu, u1 - du, zMid + gz, z1 - dz],
    [u0 + du, uMid - gu, z0 + dz, zMid - gz],
    [uMid + gu, u1 - du, z0 + dz, zMid - gz],
  ]
  const quad = (a: number, b: number, c: number, d: number) => roomPoints(L(a, c), L(b, c), L(b, d), L(a, d))
  const s = 0.2 // sill depth in tiles
  const sill0 = u0 - 0.15
  const sill1 = u1 + 0.15
  return (
    <g>
      <polygon points={quad(u0, u1, z0, z1)} fill={floorWood} />
      {panes.map(([a, b, c, d], i) => (
        <g key={i}>
          <polygon points={quad(a, b, c, d)} fill={sky} strokeWidth={DETAIL_INK} />
          <polygon
            points={roomPoints(L(a + 0.08, d - 4), L(a + 0.2, d - 4), L(a + 0.08, d - 14), L(a + 0.04, d - 14))}
            fill={white}
            fillOpacity={0.6}
            stroke="none"
          />
        </g>
      ))}
      {/* sill: top, front (faces right-front), left end (faces left-front) */}
      <polygon points={roomPoints([0, sill1, z0], [s, sill1, z0], [s, sill1, z0 - 6], [0, sill1, z0 - 6])} fill={creamDark} />
      <polygon points={roomPoints([s, sill0, z0], [s, sill1, z0], [s, sill1, z0 - 6], [s, sill0, z0 - 6])} fill={creamDark} />
      <polygon points={roomPoints([0, sill0, z0], [s, sill0, z0], [s, sill1, z0], [0, sill1, z0])} fill={cream} />
    </g>
  )
}

// ---- the shell -------------------------------------------------------------

// The floor and walls only change with the room's style, so they are memoised:
// the pet's walk and the objects re-render on top without redrawing the shell.
const Floor = memo(function Floor({ style, doors }: { style: string; doors: readonly RoomDoor[] }) {
  return floorLayer(floorStyleOf(style), doors)
})
const Walls = memo(function Walls({ style, doors }: { style: string; doors: readonly RoomDoor[] }) {
  return walls(wallStyleOf(style), doors)
})

export interface RoomShellProps {
  floorStyle?: FloorStyleId | string
  wallStyle?: WallStyleId | string
  /** Drawn between the room and the closing tag, in room coordinates (objects, pet). */
  children?: ReactNode
  width?: number
  className?: string
  /** For mapping pointer positions into room coordinates. */
  svgRef?: Ref<SVGSVGElement>
  /** Extra attributes for the <svg> (pointer handlers, aria). */
  svgProps?: SVGProps<SVGSVGElement>
  /** Said after the floor and walls in the accessible name (e.g. what is messy). */
  summary?: string
  /** Each shared edge is owned by the room with a west or north doorway. */
  doors?: readonly RoomDoor[]
  onDoor?: (toRoomId: string) => void
  doorLabel?: (roomId: string) => string
  /** Only the focused room exposes doorway controls in the tab order. */
  focused?: boolean
  /** Room-to-screen scale, keeping doorway targets usable in the home overview. */
  interactionScale?: number
}

export function RoomShell({ floorStyle = 'wood', wallStyle = 'peach', children, width, className, svgRef, svgProps, summary, doors = EMPTY_DOORS, onDoor, doorLabel, focused = true, interactionScale }: RoomShellProps) {
  const floor = floorStyleOf(floorStyle)
  const wall = wallStyleOf(wallStyle)
  const { x, y, width: w, height: h } = ROOM_VIEWBOX
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      width={width}
      height={width === undefined ? undefined : (width * h) / w}
      className={className}
      role={onDoor && focused && doors.length > 0 ? 'group' : 'img'}
      aria-label={`Room with ${floor.label.toLowerCase()} floor and ${wall.label.toLowerCase()} walls.${summary ? ` ${summary}` : ''}`}
      {...svgProps}
      ref={svgRef}
    >
      <g stroke={ink} strokeLinejoin="round" strokeLinecap="round">
        <g strokeWidth={ROOM_INK}>
          <Floor style={floor.id} doors={doors} />
          <Walls style={wall.id} doors={doors} />
          {doors.map((door) => <DoorArt key={`${door.side}-${door.toRoomId}`} door={door} />)}
        </g>
        {/* Objects are drawn at 64 px tiles and scaled down, so they keep the full room stroke. */}
        <g strokeWidth={ROOM_STROKE}>{children}</g>
        {focused && onDoor && <RoomDoorControls doors={doors} onDoor={onDoor} doorLabel={doorLabel} interactionScale={interactionScale} />}
      </g>
    </svg>
  )
}

export default RoomShell
