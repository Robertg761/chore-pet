import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { fly, stink } from './mess'
import { poly, softBox } from './shapes3'
import type { ObjectArt } from './types'

// 1x2 wall couch. At rotation 0 its back sits against the left wall (tx = 0)
// and the seat faces +tx. Two seat cushions, two back cushions, rolled arms,
// four little wooden feet.

const { ink, woodDark, floorWood, fabricBlue, warmRed, blush, cream, creamDark, dirt, white, petDefault } = PALETTE

// Fabric shades derived from fabric-blue: darker for the left-front face, lighter for tops.
const BLUE_DARK = mix(fabricBlue, ink, 0.22)
const BLUE_LIGHT = mix(fabricBlue, white, 0.28)
const FABRIC = { top: BLUE_LIGHT, left: BLUE_DARK, right: fabricBlue }

const DEPTH = 0.78 // couch depth along tx (the front sits a little inside the footprint)
const FOOT = 5
const SEAT = 18 // seat deck height
const CUSH = 26 // seat cushion top
const ARM = 33
const BACK = 54
const ARM_W = 0.26

function feet() {
  const f = (x: number, y: number) => softBox({ x0: x, x1: x + 0.1, y0: y, y1: y + 0.1, z0: 0, z1: FOOT + 1, top: floorWood, left: woodDark, right: floorWood, r: 1 })
  return (
    <g>
      {f(0.06, 0.06)}
      {f(DEPTH - 0.14, 0.06)}
      {f(0.06, 1.84)}
      {f(DEPTH - 0.14, 1.84)}
    </g>
  )
}

function seatCushion(y0: number, y1: number, skip = false) {
  if (skip) return null
  return softBox({ x0: ARM_W, x1: DEPTH, y0, y1, z0: SEAT - 1, z1: CUSH, ...FABRIC, r: 5 })
}

function backCushion(y0: number, y1: number) {
  return softBox({ x0: ARM_W, x1: ARM_W + 0.2, y0, y1, z0: CUSH - 3, z1: BACK - 3, ...FABRIC, r: 6 })
}

/** The couch itself. `seatB` and `backs` let the mess stages move cushions off it. */
function couch(opts: { seatB: boolean; backs: boolean; askew: boolean }) {
  const btn = (ty: number) => {
    const p = iso(ARM_W + 0.2, ty, 40)
    return <circle cx={p.x} cy={p.y} r={1.8} fill={ink} stroke="none" />
  }
  return (
    <g>
      {feet()}
      {/* deck and back */}
      {softBox({ x0: 0, x1: DEPTH, y0: 0, y1: 2, z0: FOOT, z1: SEAT, ...FABRIC, r: 4 })}
      {softBox({ x0: 0, x1: ARM_W, y0: ARM_W - 0.02, y1: 2 - ARM_W + 0.02, z0: SEAT - 1, z1: BACK, ...FABRIC, r: 7 })}
      {/* left arm */}
      {softBox({ x0: 0, x1: DEPTH, y0: 0, y1: ARM_W, z0: FOOT, z1: ARM, ...FABRIC, r: 8 })}
      {opts.backs && backCushion(ARM_W, 1)}
      {opts.backs && backCushion(1, 2 - ARM_W)}
      {opts.backs && btn(0.63)}
      {opts.backs && btn(1.37)}
      {seatCushion(ARM_W, 1)}
      {seatCushion(1, 2 - ARM_W, !opts.seatB)}
      {opts.askew && askewCushion()}
      {/* right arm, nearest to the viewer */}
      {softBox({ x0: 0, x1: DEPTH, y0: 2 - ARM_W, y1: 2, z0: FOOT, z1: ARM, ...FABRIC, r: 8 })}
    </g>
  )
}

/** The right seat cushion, shoved crooked and sliding toward the front. */
function askewCushion() {
  const c = iso(0.55, 1.37, CUSH)
  return (
    <g transform={`rotate(-9 ${c.x} ${c.y}) translate(4 -2)`}>
      {softBox({ x0: ARM_W + 0.04, x1: DEPTH + 0.06, y0: 1.02, y1: 2 - ARM_W - 0.04, z0: SEAT - 1, z1: CUSH, ...FABRIC, r: 5 })}
    </g>
  )
}

/** A loose cushion lying flat on the floor, in front of the couch. */
function floorCushion(tx: number, ty: number, tilt = 0) {
  const c = iso(tx + 0.13, ty + 0.3, 8)
  return (
    <g transform={`rotate(${tilt} ${c.x} ${c.y})`}>
      {softBox({ x0: tx, x1: tx + 0.26, y0: ty, y1: ty + 0.6, z0: 0, z1: 7, ...FABRIC, r: 6 })}
    </g>
  )
}

function crumbs(points: [number, number, number][]) {
  return (
    <g fill={dirt} stroke="none" opacity={0.7}>
      {points.map(([tx, ty, z], i) => {
        const p = iso(tx, ty, z)
        return <ellipse key={i} cx={p.x} cy={p.y} rx={1.6} ry={0.9} />
      })}
    </g>
  )
}

function blanket() {
  // draped over the left seat cushion and down its front edge
  const z = CUSH + 1.2
  const fx = DEPTH + 0.02
  const top = [iso(0.34, 0.3, z), iso(fx, 0.3, z), iso(fx, 0.96, z), iso(0.34, 0.96, z)]
  // scalloped hem along the hanging front, from ty 0.96 back to ty 0.3
  const ys = [0.96, 0.74, 0.52, 0.3]
  const hz = (i: number) => 9 + (i % 2) * 2
  let hem = ''
  for (let i = 0; i < 3; i++) {
    const p1 = iso(fx, ys[i + 1], hz(i + 1))
    const mid = iso(fx, (ys[i] + ys[i + 1]) / 2, hz(i) - 4)
    hem += `Q${mid.x} ${mid.y} ${p1.x} ${p1.y} `
  }
  const h0 = iso(fx, ys[0], hz(0))
  return (
    <g strokeWidth={2}>
      <path d={`M${top[1].x} ${top[1].y} L${top[2].x} ${top[2].y} L${h0.x} ${h0.y} ${hem} Z`} fill={warmRed} />
      <polygon points={poly(...top)} fill={warmRed} />
      {[0.45, 0.62, 0.79].map((tx) => {
        const a = iso(tx, 0.3, z)
        const b = iso(tx, 0.96, z)
        return <path key={tx} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={cream} strokeWidth={2} fill="none" />
      })}
      <path d={`M${top[1].x} ${top[1].y} L${top[2].x} ${top[2].y}`} fill="none" />
    </g>
  )
}

function pizza() {
  // an open pizza box on the right seat, with a slice left
  const z = SEAT + 0.5
  const lid = [iso(0.34, 1.08, z), iso(0.74, 1.08, z), iso(0.74, 1.66, z), iso(0.34, 1.66, z)]
  const c = iso(0.54, 1.37, z + 1)
  return (
    <g strokeWidth={2}>
      <polygon points={poly(...lid)} fill={creamDark} />
      <ellipse cx={c.x} cy={c.y} rx={11} ry={5.5} fill={petDefault} />
      <path d={`M${c.x} ${c.y} L${c.x + 11} ${c.y} A11 5.5 0 0 0 ${c.x + 9} ${c.y - 3.2} Z`} fill={creamDark} stroke="none" />
      <circle cx={c.x - 4} cy={c.y - 1} r={1.8} fill={warmRed} stroke="none" />
      <circle cx={c.x + 2} cy={c.y + 1.5} r={1.8} fill={warmRed} stroke="none" />
      <circle cx={c.x - 1} cy={c.y - 3} r={1.6} fill={warmRed} stroke="none" />
      {/* the lid, propped open at the back */}
      <polygon points={poly(lid[0], lid[3], { x: lid[3].x, y: lid[3].y - 12 }, { x: lid[0].x, y: lid[0].y - 12 })} fill={cream} />
    </g>
  )
}

function sock() {
  // a stripy sock dropped over the right arm's top, toe flopping over the front
  const p = iso(0.3, 1.9, ARM)
  return (
    <g strokeWidth={2} transform={`translate(${p.x} ${p.y}) rotate(-12)`}>
      <path d="M-7 -5 h8 v9 q0 4 5 5 q5 2 2 6 q-3 3 -9 0 q-6 -3 -6 -9 Z" fill={white} />
      <path d="M-7 -5 h8 v4 h-8 Z" fill={blush} />
      <path d="M-7 3 h8" stroke={blush} strokeWidth={2} fill="none" />
    </g>
  )
}

function messy1() {
  return <g>{blanket()}</g>
}

function messy2() {
  const z = SEAT
  const c = iso(0.5, 0.6, z)
  return (
    <g>
      {floorCushion(0.8, 0.2, -4)}
      {floorCushion(0.85, 1.05, 8)}
      {pizza()}
      {sock()}
      {crumbs([[0.45, 0.5, CUSH], [0.6, 0.7, CUSH], [0.7, 0.4, CUSH], [0.4, 0.85, CUSH], [0.5, 1.8, 0], [0.62, 1.9, 0]])}
      {stink(c.x + 8, c.y - 30)}
      {fly(c.x + 14, c.y - 44, 'a')}
      {fly(c.x - 14, c.y - 56, 'b', true)}
    </g>
  )
}

export const couchArt: ObjectArt = {
  catalogId: 'couch',
  footprint: { w: 1, d: 2 },
  bounds: { x: -70, y: -96, width: 112, height: 168 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {couch({ seatB: stage === 'clean', backs: stage !== 'messy2', askew: stage === 'messy1' })}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
