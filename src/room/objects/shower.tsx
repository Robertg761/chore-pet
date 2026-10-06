import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { smudge } from './mess'
import { poly, slab, softBox } from './shapes3'
import type { ObjectArt } from './types'

// 2x2 wall shower. At rotation 0 the cream tiled panel stands against the left
// wall (tx = 0); the tray sits on the floor and two see-through glass screens
// close the right-front (tx = 2) and left-front (ty = 2) sides. The glass is
// kept very light so the pet stays visible behind it.

const { ink, cream, creamDark, white, steel, steelDark, sky, dirt, blush, petDefault, warmRed, fabricBlue } = PALETTE

const TRAY = 6 // tray height
const PANEL_T = 0.16 // back panel thickness along tx
const PANEL = 98 // back panel height
const GLASS = 90 // top of the glass screens
const GLASS_OPACITY = 0.26

/** Pipe-style line: ink underlay with a steel core, like the sink's faucet. */
function pipe(d: string, width = 6) {
  return (
    <g fill="none">
      <path d={d} stroke={ink} strokeWidth={width + 3} />
      <path d={d} stroke={steel} strokeWidth={width} />
    </g>
  )
}

function line(a: { x: number; y: number }, b: { x: number; y: number }) {
  return `M${a.x} ${a.y} L${b.x} ${b.y}`
}

function tray() {
  const c = iso(1, 1, TRAY)
  return (
    <g>
      {softBox({ x0: 0, x1: 2, y0: 0, y1: 2, z0: 0, z1: TRAY, top: white, left: steelDark, right: steel, r: 5 })}
      <polygon points={slab(0.16, 1.84, 0.16, 1.84, TRAY)} fill={cream} strokeWidth={2} />
      <ellipse cx={c.x} cy={c.y} rx={6} ry={3} fill={steelDark} strokeWidth={2} />
      <path d={`M${c.x - 3} ${c.y} h6 M${c.x - 1.5} ${c.y - 1.2} h3 M${c.x - 1.5} ${c.y + 1.2} h3`} strokeWidth={1} />
    </g>
  )
}

function backPanel() {
  const z0 = TRAY
  const tiles = []
  for (let i = 1; i < 8; i++) {
    const ty = i * 0.25
    tiles.push(<path key={'v' + i} d={line(iso(PANEL_T, ty, z0 + 3), iso(PANEL_T, ty, PANEL - 3))} />)
  }
  for (let j = 1; j < 7; j++) {
    const z = z0 + j * ((PANEL - z0) / 7)
    tiles.push(<path key={'h' + j} d={line(iso(PANEL_T, 0.06, z), iso(PANEL_T, 1.94, z))} />)
  }
  return (
    <g>
      {softBox({ x0: 0, x1: PANEL_T, y0: 0, y1: 2, z0, z1: PANEL, top: white, left: creamDark, right: cream, r: 2 })}
      <g fill="none" stroke={creamDark} strokeWidth={1.2}>
        {tiles}
      </g>
    </g>
  )
}

function fixtures() {
  const x = PANEL_T + 0.04
  const base = iso(x, 1, 40)
  const bend = iso(x, 1, 88)
  const head = iso(0.62, 1, 86)
  const tap = iso(x + 0.1, 1, 48)
  const arm = `M${base.x} ${base.y} L${bend.x} ${bend.y - 4} Q${bend.x} ${bend.y - 12} ${bend.x + 8} ${bend.y - 10} L${head.x} ${head.y - 4}`
  return (
    <g>
      {pipe(arm, 4)}
      {/* the head: a tilted disc with spray holes */}
      <g strokeWidth={2}>
        <path d={`M${head.x - 3} ${head.y - 2} h6 l5 7 h-16 Z`} fill={steelDark} />
        <ellipse cx={head.x} cy={head.y + 5} rx={9} ry={4.5} fill={steel} />
        <circle cx={head.x - 3} cy={head.y + 5} r={0.8} fill={ink} stroke="none" />
        <circle cx={head.x + 1} cy={head.y + 6} r={0.8} fill={ink} stroke="none" />
        <circle cx={head.x + 4} cy={head.y + 4.6} r={0.8} fill={ink} stroke="none" />
      </g>
      {/* tap handle */}
      <ellipse cx={tap.x} cy={tap.y} rx={5} ry={3} fill={steel} strokeWidth={2} />
      <circle cx={tap.x} cy={tap.y - 1} r={1.6} fill={ink} stroke="none" />
    </g>
  )
}

/** Two glass screens, a steel frame and a few shine lines. */
function glass(steam = 0) {
  const right = [iso(2, 0, TRAY), iso(2, 2, TRAY), iso(2, 2, GLASS), iso(2, 0, GLASS)]
  const left = [iso(PANEL_T, 2, TRAY), iso(2, 2, TRAY), iso(2, 2, GLASS), iso(PANEL_T, 2, GLASS)]
  const shine = (a: [number, number, number], b: [number, number, number]) => {
    const p = iso(...a)
    const q = iso(...b)
    return <path d={line(p, q)} />
  }
  return (
    <g>
      <polygon points={poly(...left)} fill={sky} fillOpacity={GLASS_OPACITY} stroke="none" />
      <polygon points={poly(...right)} fill={sky} fillOpacity={GLASS_OPACITY} stroke="none" />
      {steam > 0 && (
        <g fill={white} fillOpacity={steam} stroke="none">
          <polygon points={poly(...left)} />
          <polygon points={poly(...right)} />
        </g>
      )}
      <g fill="none" stroke={white} strokeWidth={3} opacity={0.85}>
        {shine([2, 0.3, 74], [2, 0.75, 38])}
        {shine([2, 0.9, 80], [2, 1.15, 60])}
        {shine([0.6, 2, 78], [1.0, 2, 46])}
      </g>
      {/* frame: top rail and three posts */}
      {pipe(`M${iso(0.1, 2, GLASS).x} ${iso(0.1, 2, GLASS).y} L${iso(2, 2, GLASS).x} ${iso(2, 2, GLASS).y} L${iso(2, 0, GLASS).x} ${iso(2, 0, GLASS).y}`, 3)}
      {pipe(line(iso(2, 2, TRAY), iso(2, 2, GLASS)), 3)}
      {pipe(line(iso(2, 0, TRAY), iso(2, 0, GLASS)), 3)}
      {pipe(line(iso(0.1, 2, TRAY), iso(0.1, 2, GLASS)), 3)}
      {/* door handle */}
      {pipe(line(iso(2, 1.55, 40), iso(2, 1.55, 58)), 2.5)}
    </g>
  )
}

/** A little shampoo bottle, upright at (x, y) on its base, rotated by `rot`. */
function bottle(x: number, y: number, rot: number, colour: string, key?: string) {
  return (
    <g key={key} transform={`rotate(${rot} ${x} ${y})`} strokeWidth={2}>
      <path d={`M${x - 4} ${y - 9} q0 -2 2 -3 h4 q2 1 2 3 V${y - 1} q0 2 -2 2 h-4 q-2 0 -2 -2 Z`} fill={colour} />
      <rect x={x - 2.5} y={y - 16} width={5} height={4.5} rx={1.5} fill={white} />
      <rect x={x - 2.2} y={y - 6} width={4.4} height={3.6} rx={1} fill={white} stroke="none" opacity={0.85} />
    </g>
  )
}

/** A water spot on the glass. */
function spot(x: number, y: number, r: number, key: string | number) {
  return (
    <g key={key}>
      <ellipse cx={x} cy={y} rx={r * 0.8} ry={r} fill={white} fillOpacity={0.7} strokeWidth={1.3} opacity={0.9} />
      <ellipse cx={x - r * 0.25} cy={y - r * 0.35} rx={r * 0.2} ry={r * 0.3} fill={white} stroke="none" />
    </g>
  )
}

function duck(x: number, y: number) {
  return (
    <g strokeWidth={2}>
      <ellipse cx={x} cy={y - 3} rx={8} ry={5.5} fill={petDefault} />
      <path d={`M${x - 5} ${y - 6} q5 3 9 0`} fill="none" stroke={ink} strokeWidth={1} opacity={0.25} />
      <circle cx={x + 4} cy={y - 10} r={4.6} fill={petDefault} />
      <path d={`M${x + 8} ${y - 11} q4 0 4 2 q-2 2 -5 0 Z`} fill={warmRed} strokeWidth={1.5} />
      <circle cx={x + 5.2} cy={y - 11} r={1} fill={ink} stroke="none" />
      <ellipse cx={x + 2.5} cy={y - 8.6} rx={1.4} ry={0.8} fill={blush} stroke="none" opacity={0.8} />
    </g>
  )
}

/** Mess standing in the tray: drawn under the glass tint. */
function inside1() {
  const t = iso(1.35, 0.9, TRAY)
  return (
    <g>
      {/* spilled shampoo and its bottle */}
      <ellipse cx={t.x + 6} cy={t.y + 3} rx={11} ry={5} fill={blush} strokeWidth={2} />
      <ellipse cx={t.x + 3} cy={t.y + 2} rx={3} ry={1.2} fill={white} stroke="none" opacity={0.7} />
      {bottle(t.x - 4, t.y + 7, 80, fabricBlue, 'b')}
      {smudge(iso(0.7, 1.6, TRAY).x, iso(0.7, 1.6, TRAY).y, 4)}
    </g>
  )
}

/** Mess on the glass itself: drawn over it. */
function glass1() {
  const spots = [
    [2, 0.35, 70, 3],
    [2, 0.6, 56, 2.2],
    [2, 1.3, 78, 2.6],
    [2, 1.65, 66, 3.2],
    [2, 1.05, 48, 2],
  ] as const
  return (
    <g>
      {spots.map(([tx, ty, z, r], i) => spot(iso(tx, ty, z).x, iso(tx, ty, z).y, r, i))}
      {spot(iso(1.3, 2, 62).x, iso(1.3, 2, 62).y, 2.6, 'l')}
    </g>
  )
}

function inside2() {
  const c = iso(1, 1, TRAY)
  const d = iso(1.55, 0.55, TRAY)
  return (
    <g>
      {/* ring of grime on the tray */}
      <ellipse cx={c.x} cy={c.y} rx={30} ry={15} fill="none" stroke={dirt} strokeWidth={5} opacity={0.45} />
      {smudge(iso(0.5, 0.5, TRAY).x, iso(0.5, 0.5, TRAY).y, 5)}
      {duck(d.x, d.y + 3)}
      {bottle(iso(0.55, 1.5, TRAY).x, iso(0.55, 1.5, TRAY).y + 5, 78, fabricBlue, 'a')}
      {bottle(iso(1.2, 1.7, TRAY).x, iso(1.2, 1.7, TRAY).y + 4, -70, warmRed, 'b')}
      <ellipse cx={iso(0.75, 1.3, TRAY).x} cy={iso(0.75, 1.3, TRAY).y + 3} rx={9} ry={4} fill={blush} strokeWidth={2} opacity={0.9} />
    </g>
  )
}

function glass2() {
  const f = iso(2, 1.1, 66)
  return (
    <g>
      {/* finger smiley wiped in the steam, and smudges */}
      <g fill="none" stroke={ink} strokeLinecap="round" opacity={0.35} strokeWidth={2.5}>
        <path d={`M${f.x - 8} ${f.y + 1} q8 8 16 -2`} />
        <path d={`M${f.x - 6} ${f.y - 8} v0 M${f.x + 6} ${f.y - 10} v0`} strokeWidth={4} />
      </g>
      {[
        [2, 0.35, 45, 5],
        [2, 1.7, 52, 6],
        [2, 0.6, 76, 4],
        [2, 1.4, 30, 5],
      ].map(([tx, ty, z, r], i) => (
        <ellipse key={i} cx={iso(tx, ty, z).x} cy={iso(tx, ty, z).y} rx={r * 1.2} ry={r * 0.8} fill={dirt} stroke="none" opacity={0.3} />
      ))}
      {[
        [2, 1.8, 74, 3],
        [2, 0.2, 60, 2.4],
        [1.0, 2, 54, 3],
      ].map(([tx, ty, z, r], i) => spot(iso(tx, ty, z).x, iso(tx, ty, z).y, r, 's' + i))}
    </g>
  )
}

export const showerArt: ObjectArt = {
  catalogId: 'shower',
  footprint: { w: 2, d: 2 },
  bounds: { x: -68, y: -104, width: 136, height: 176 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {tray()}
      {backPanel()}
      {fixtures()}
      {stage === 'messy1' && inside1()}
      {stage === 'messy2' && inside2()}
      {glass(stage === 'messy2' ? 0.3 : 0)}
      {stage === 'messy1' && glass1()}
      {stage === 'messy2' && glass2()}
    </g>
  ),
}
