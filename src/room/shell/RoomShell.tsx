import { memo, type ReactNode, type Ref, type SVGProps } from 'react'
import { PALETTE, ROOM_STROKE } from '../../art/palette'
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
// as a cosy diorama. Nothing here is interactive; the room renderer draws
// objects and the pet on top.

const { ink, cream, creamDark, floorWood, sky, white } = PALETTE

type P3 = [number, number, number?]

/** Point on the left wall plane: u along ty (0 back, N front), z up. */
const L = (u: number, z: number): P3 => [0, u, z]
/** Point on the right wall plane: u along tx. */
const R = (u: number, z: number): P3 => [u, 0, z]

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

function slab(floor: FloorStyle) {
  const front: P3[] = [[0, N, 0], [N, N, 0]]
  const right: P3[] = [[N, N, 0], [N, 0, 0]]
  return (
    <g>
      <polygon points={`${slabPoints(front, 0)} ${slabPoints([...front].reverse(), SLAB_DEPTH)}`} fill={floor.edgeLeft} />
      <polygon points={`${slabPoints(right, 0)} ${slabPoints([...right].reverse(), SLAB_DEPTH)}`} fill={floor.edgeRight} />
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

function floorLayer(floor: FloorStyle) {
  const diamond = roomPoints([0, 0], [N, 0], [N, N], [0, N])
  const pattern = floor.pattern === 'planks' ? planks() : floor.pattern === 'checker' ? checker(floor) : rug(floor)
  const s = 0.38 // wall shadow width in tiles
  return (
    <g>
      {slab(floor)}
      <polygon points={diamond} fill={floor.top} stroke="none" />
      {pattern}
      <polygon points={diamond} fill="none" />
      {/* soft shadow along the wall bases */}
      <polygon points={roomPoints([0, 0], [N, 0], [N, s], [s, s], [s, N], [0, N])} fill={ink} fillOpacity={0.15} stroke="none" />
    </g>
  )
}

// ---- walls -----------------------------------------------------------------

function stripes(wall: WallStyle, plane: (u: number, z: number) => P3) {
  if (!wall.stripes) return null
  return (
    <g>
      {range(N)
        .filter((k) => k % 2 === 0)
        .map((k) => (
          <polygon key={k} points={roomPoints(plane(k + 0.5, 10), plane(k + 1, 10), plane(k + 1, H), plane(k + 0.5, H))} fill={white} fillOpacity={0.3} stroke="none" />
        ))}
    </g>
  )
}

function baseboard(plane: (u: number, z: number) => P3) {
  return <polygon points={roomPoints(plane(0, 0), plane(N, 0), plane(N, 9), plane(0, 9))} fill={cream} strokeWidth={DETAIL_INK} />
}

function walls(wall: WallStyle) {
  return (
    <g>
      {/* wall faces */}
      <polygon points={roomPoints(R(0, 0), R(N, 0), R(N, H), R(0, H))} fill={wall.right} />
      <polygon points={roomPoints(L(N, 0), L(0, 0), L(0, H), L(N, H))} fill={wall.left} />
      {stripes(wall, R)}
      {stripes(wall, L)}
      {baseboard(R)}
      {baseboard(L)}
      {windowLayer()}
      {/* end caps, then the wall top (one outline so the corner is clean) */}
      <polygon points={roomPoints([0, N, H], [-T, N, H], [-T, N, 0], [0, N, 0])} fill={creamDark} />
      <polygon points={roomPoints([N, 0, H], [N, -T, H], [N, -T, 0], [N, 0, 0])} fill={cream} />
      <polygon points={roomPoints([-T, N, H], [-T, -T, H], [N, -T, H], [N, 0, H], [0, 0, H], [0, N, H])} fill={cream} />
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
const Floor = memo(function Floor({ style }: { style: string }) {
  return floorLayer(floorStyleOf(style))
})
const Walls = memo(function Walls({ style }: { style: string }) {
  return walls(wallStyleOf(style))
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
}

export function RoomShell({ floorStyle = 'wood', wallStyle = 'peach', children, width, className, svgRef, svgProps, summary }: RoomShellProps) {
  const floor = floorStyleOf(floorStyle)
  const wall = wallStyleOf(wallStyle)
  const { x, y, width: w, height: h } = ROOM_VIEWBOX
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      width={width}
      height={width === undefined ? undefined : (width * h) / w}
      className={className}
      role="img"
      aria-label={`Room with ${floor.label.toLowerCase()} floor and ${wall.label.toLowerCase()} walls.${summary ? ` ${summary}` : ''}`}
      {...svgProps}
      ref={svgRef}
    >
      <g stroke={ink} strokeLinejoin="round" strokeLinecap="round">
        <g strokeWidth={ROOM_INK}>
          <Floor style={floor.id} />
          <Walls style={wall.id} />
        </g>
        {/* Objects are drawn at 64 px tiles and scaled down, so they keep the full room stroke. */}
        <g strokeWidth={ROOM_STROKE}>{children}</g>
      </g>
    </svg>
  )
}

export default RoomShell
