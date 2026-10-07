import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso, type Point } from '../iso'
import { smudge } from './mess'
import { roundedPath } from './shapes3'
import type { ObjectArt } from './types'

// 2x3 floor rug: flat, 5 units thick, rounded corners. Solid furniture can
// stand on it and the pet is never hidden behind it. It runs 2 tiles along +tx
// and 3 along +ty; a short fringe sits on the left-front end.

const { ink, warmRed, blush, cream, creamDark, dirt, white, steel, steelDark, sky } = PALETTE

// Slab edge of the rug: warm-red one step darker (blended toward dirt, not ink, so it stays warm).
const RED_DARK = mix(warmRed, dirt, 0.25)

const W = 2
const D = 3
const THICK = 5
const FRINGE = 0.09 // end tassels live inside the footprint
const YMAX = D - FRINGE

function rect(x0: number, x1: number, y0: number, y1: number, z = THICK): Point[] {
  return [iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)]
}

/** Little cream tassels along the left-front end, each with a thin ink outline. */
function fringe() {
  const angle = (Math.atan2(16, -32) * 180) / Math.PI // direction of +ty on screen
  return (
    <g fill={cream} strokeWidth={2}>
      {Array.from({ length: 9 }, (_, i) => {
        const p = iso(0.18 + i * 0.2, YMAX + FRINGE * 0.45, 1)
        return <ellipse key={i} cx={p.x} cy={p.y} rx={3.8} ry={2.4} transform={`rotate(${angle} ${p.x} ${p.y})`} />
      })}
    </g>
  )
}

function body() {
  const outer = rect(0.03, W - 0.03, 0.03, YMAX - 0.02)
  const border = rect(0.2, W - 0.2, 0.2, YMAX - 0.2)
  const inner = rect(0.42, W - 0.42, 0.42, YMAX - 0.42)
  const down = outer.map((p) => ({ x: p.x, y: p.y + THICK }))
  const c = iso(1, 1.45, THICK)
  // dotted pattern along the middle of the cream border band
  const dots: Point[] = []
  for (let i = 0; i < 7; i++) {
    const tx = 0.31 + i * ((W - 0.62) / 6)
    dots.push(iso(tx, 0.31, THICK), iso(tx, YMAX - 0.31, THICK))
  }
  for (let j = 1; j < 9; j++) {
    const ty = 0.31 + j * ((YMAX - 0.62) / 9)
    dots.push(iso(0.31, ty, THICK), iso(W - 0.31, ty, THICK))
  }
  return (
    <g>
      {fringe()}
      {/* slab edge, then the top */}
      <path d={roundedPath(down, 9)} fill={RED_DARK} />
      <path d={roundedPath(outer, 9)} fill={warmRed} />
      <path d={roundedPath(border, 6)} fill={cream} strokeWidth={1.5} />
      <path d={roundedPath(inner, 4)} fill={blush} strokeWidth={1.5} />
      <g fill={warmRed} stroke="none">
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.6} />
        ))}
      </g>
      {/* centre motif: a flower of cream petals around a warm-red heart */}
      <g strokeWidth={1.5}>
        {[
          [-12, 0],
          [12, 0],
          [0, -6],
          [0, 6],
        ].map(([dx, dy], i) => (
          <ellipse key={i} cx={c.x + dx} cy={c.y + dy} rx={8} ry={4.5} fill={cream} />
        ))}
        <ellipse cx={c.x} cy={c.y} rx={6} ry={3.2} fill={warmRed} />
      </g>
    </g>
  )
}

function crumb(x: number, y: number, key: number, colour: string = dirt) {
  return <ellipse key={key} cx={x} cy={y} rx={1.5} ry={0.9} fill={colour} stroke="none" opacity={0.75} />
}

function dustBunny(x: number, y: number, key: number, s = 1) {
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      <path
        d="M-9 0 q-3 -4 1 -7 q0 -5 6 -4 q4 -5 9 -1 q6 -1 6 5 q4 3 0 7 q-2 3 -7 2 h-8 q-5 1 -7 -2 Z"
        fill={steel}
      />
      <path d="M-5 -3 q2 -3 5 -1 M3 -6 q3 -1 4 2" fill="none" stroke={steelDark} strokeWidth={1.3} />
      <circle cx={-3} cy={-2.5} r={1.2} fill={ink} stroke="none" />
      <circle cx={3} cy={-2.5} r={1.2} fill={ink} stroke="none" />
    </g>
  )
}

function tissue(x: number, y: number) {
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      <path d="M-7 1 q-2 -5 3 -7 q3 -4 7 -1 q5 0 4 5 q1 4 -3 5 q-4 3 -8 0 q-3 -1 -3 -2 Z" fill={white} />
      <path d="M-3 -2 q2 2 5 0 M0 1 q2 -2 4 -2" fill="none" stroke={creamDark} strokeWidth={1.3} />
    </g>
  )
}

const at = (tx: number, ty: number) => iso(tx, ty, THICK)

function messy1() {
  const a = at(1.35, 0.8)
  const b = at(0.6, 2.1)
  const s = at(1.2, 1.9)
  return (
    <g>
      {smudge(s.x, s.y, 7)}
      {[
        [0, 0],
        [4, 1.5],
        [-3, 2.5],
        [7, -1],
      ].map(([dx, dy], i) => crumb(a.x + dx, a.y + dy, i))}
      {[
        [0, 0],
        [-4, 1],
        [3, 2],
      ].map(([dx, dy], i) => crumb(b.x + dx, b.y + dy, 10 + i, warmRed))}
    </g>
  )
}

function messy2() {
  const s1 = at(1.3, 1.1)
  const s2 = at(0.7, 2.2)
  const s3 = at(1.45, 2.3)
  const k = at(0.55, 1.7)
  const d1 = at(0.62, 0.62)
  const d2 = at(1.5, 1.6)
  const d3 = at(0.9, 2.55)
  const t = at(1.4, 0.5)
  return (
    <g>
      {/* stains */}
      {smudge(s1.x, s1.y, 9)}
      {smudge(s2.x, s2.y, 7)}
      <ellipse cx={s3.x} cy={s3.y} rx={8} ry={4} fill={sky} strokeWidth={2} />
      <ellipse cx={s3.x - 2} cy={s3.y - 1} rx={2.5} ry={1} fill={white} stroke="none" opacity={0.7} />
      {[
        [0, 0],
        [5, 2],
        [-4, 3],
        [8, -1],
        [-7, -1],
      ].map(([dx, dy], i) => crumb(k.x + dx, k.y + dy, i))}
      {dustBunny(d1.x, d1.y + 3, 20, 0.75)}
      {dustBunny(d2.x, d2.y + 3, 21, 0.85)}
      {dustBunny(d3.x, d3.y + 3, 22, 0.7)}
      {tissue(t.x, t.y)}
    </g>
  )
}

export const rugArt: ObjectArt = {
  catalogId: 'rug',
  footprint: { w: W, d: D },
  bounds: { x: -100, y: -26, width: 172, height: 114 },
  cueY: -4,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {body()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
