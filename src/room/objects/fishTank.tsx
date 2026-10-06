import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { bubble } from './batch2-parts'
import { leafShape } from './plant'
import { fly } from './mess'
import { slab, softBox } from './shapes3'
import type { ObjectArt } from './types'

// Fish tank on a small wooden stand, 1x1 against the wall. Glass box with water,
// sand and pebbles, a plant and two round fish. messy1 turns the water green
// and smudges the glass; messy2 grows algae, and one fish looks up hopefully at
// a bubble ("feed me") while a fly circles. Nothing gross: the fish stay cute.

const { ink, floorWood, woodDark, sky, white, warmRed, petDefault, sickTint, leaf, leafDark, creamDark, blush, steel, dirt } = PALETTE

const X0 = 0.08
const X1 = 0.92
const Y0 = 0.08
const Y1 = 0.92
const Z0 = 25 // tank floor (top of the stand)
const SAND = 29 // top of the sand layer
const WATER = 50
const TOP = 58

const WALL_GLASS = mix(sky, white, 0.6)
const SAND_TOP = mix(creamDark, floorWood, 0.4)
const SAND_SIDE = mix(SAND_TOP, ink, 0.16)
const FRESH = { light: leaf, dark: leafDark }
const WOOD_LIGHT = mix(floorWood, white, 0.3)

// Faces of the glass box, as iso point strings between two heights.
const backLeft = (a: number, b: number) => isoPoints([X0, Y0, b], [X0, Y1, b], [X0, Y1, a], [X0, Y0, a])
const backRight = (a: number, b: number) => isoPoints([X0, Y0, b], [X1, Y0, b], [X1, Y0, a], [X0, Y0, a])
const frontLeft = (a: number, b: number) => isoPoints([X0, Y1, b], [X1, Y1, b], [X1, Y1, a], [X0, Y1, a])
const frontRight = (a: number, b: number) => isoPoints([X1, Y0, b], [X1, Y1, b], [X1, Y1, a], [X1, Y0, a])

function stand() {
  const leg = (tx: number, ty: number) =>
    softBox({ x0: tx, x1: tx + 0.16, y0: ty, y1: ty + 0.16, z0: 0, z1: Z0 - 4, top: floorWood, left: woodDark, right: floorWood, r: 1.5 })
  return (
    <g>
      <polygon points={slab(0.1, 0.92, 0.1, 0.92, 0)} fill={ink} fillOpacity={0.15} stroke="none" />
      {leg(0.1, 0.1)}
      {leg(0.74, 0.1)}
      {leg(0.1, 0.74)}
      {leg(0.74, 0.74)}
      {softBox({ x0: 0.04, x1: 0.96, y0: 0.04, y1: 0.96, z0: Z0 - 5, z1: Z0, top: WOOD_LIGHT, left: woodDark, right: floorWood, r: 3 })}
    </g>
  )
}

/** The back glass panes with water behind the fish. */
function backGlass(waterTint: string, tintOpacity: number) {
  return (
    <g strokeWidth={2}>
      <polygon points={backLeft(Z0, TOP)} fill={WALL_GLASS} />
      <polygon points={backRight(Z0, TOP)} fill={WALL_GLASS} />
      <polygon points={backLeft(Z0, WATER)} fill={sky} fillOpacity={0.75} stroke="none" />
      <polygon points={backRight(Z0, WATER)} fill={sky} fillOpacity={0.6} stroke="none" />
      <polygon points={backLeft(Z0, WATER)} fill={waterTint} fillOpacity={tintOpacity} stroke="none" />
      <polygon points={backRight(Z0, WATER)} fill={waterTint} fillOpacity={tintOpacity} stroke="none" />
    </g>
  )
}

function sand() {
  const pebble = (tx: number, ty: number, c: string, r = 2.3) => {
    const p = iso(tx, ty, SAND)
    return <ellipse key={`${tx}-${ty}`} cx={p.x} cy={p.y} rx={r} ry={r * 0.62} fill={c} strokeWidth={1.4} />
  }
  return (
    <g>
      <polygon points={frontLeft(Z0, SAND)} fill={SAND_SIDE} strokeWidth={2} />
      <polygon points={frontRight(Z0, SAND)} fill={SAND_TOP} strokeWidth={2} />
      <polygon points={isoPoints([X0, Y0, SAND], [X1, Y0, SAND], [X1, Y1, SAND], [X0, Y1, SAND])} fill={SAND_TOP} strokeWidth={2} />
      {pebble(0.7, 0.3, warmRed)}
      {pebble(0.78, 0.55, sky, 2)}
      {pebble(0.6, 0.78, white, 2.1)}
      {pebble(0.3, 0.72, blush)}
      {pebble(0.45, 0.5, steel, 1.9)}
      {pebble(0.25, 0.4, petDefault, 1.9)}
    </g>
  )
}

function seaweed() {
  const a = iso(0.72, 0.28, SAND)
  const strand = (x: number, y: number, h: number, flip: number) => {
    const d = `M${x} ${y} q${-4 * flip} ${-h / 4} 0 ${-h / 2} q${4 * flip} ${-h / 4} 0 ${-h / 2}`
    return (
      <g fill="none">
        <path d={d} stroke={ink} strokeWidth={6} />
        <path d={d} stroke={leaf} strokeWidth={3} />
      </g>
    )
  }
  return (
    <g>
      {strand(a.x - 6, a.y + 2, 20, 1)}
      {strand(a.x + 6, a.y + 3, 26, -1)}
      {leafShape(a.x - 1, a.y + 1, -28, 15, -3, FRESH, 'l1')}
      {leafShape(a.x + 3, a.y + 1, 30, 13, 3, FRESH, 'l2')}
    </g>
  )
}

/** A round fish facing right at (x, y); `up` tilts it to look at the surface. */
function fish(x: number, y: number, body: string, flip = false, rot = 0, k = 1, key?: string | number) {
  return (
    <g key={key} transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -k : k} ${k})`} strokeWidth={2}>
      <path d="M-4 0 L-10.5 -5 Q-12.5 0 -10.5 5 Z" fill={mix(body, ink, 0.12)} />
      <path d="M-2 -4 Q0 -8.5 3.5 -4.2" fill={mix(body, ink, 0.12)} />
      <ellipse cx={0} cy={0} rx={7} ry={5.4} fill={body} />
      <path d="M-6.5 1 Q-4 4.8 0 5.2 Q-4 7 -6.8 3.4 Z" fill={ink} opacity={0.12} stroke="none" />
      <circle cx={3.2} cy={-1.4} r={2.1} fill={white} strokeWidth={1.2} />
      <circle cx={3.7} cy={-1.3} r={1} fill={ink} stroke="none" />
      <path d="M5.2 1.6 Q6.4 2.2 7 1.2" fill="none" strokeWidth={1.2} />
      <circle cx={1} cy={1.8} r={1.1} fill={blush} stroke="none" />
    </g>
  )
}

/** Glass in front: translucent water tint, water line, shine and the outline. */
function frontGlass(waterTint: string, tintOpacity: number) {
  return (
    <g>
      <g stroke="none">
        <polygon points={frontLeft(Z0, WATER)} fill={sky} fillOpacity={0.3} />
        <polygon points={frontRight(Z0, WATER)} fill={sky} fillOpacity={0.22} />
        <polygon points={frontLeft(Z0, WATER)} fill={waterTint} fillOpacity={tintOpacity} />
        <polygon points={frontRight(Z0, WATER)} fill={waterTint} fillOpacity={tintOpacity} />
        <polygon points={isoPoints([X0, Y0, WATER], [X1, Y0, WATER], [X1, Y1, WATER], [X0, Y1, WATER])} fill={white} fillOpacity={0.28} />
        <polygon points={frontLeft(WATER, TOP)} fill={sky} fillOpacity={0.12} />
        <polygon points={frontRight(WATER, TOP)} fill={sky} fillOpacity={0.1} />
      </g>
      {/* water line on the front panes */}
      <path d={`M${iso(X0, Y1, WATER).x} ${iso(X0, Y1, WATER).y} L${iso(X1, Y1, WATER).x} ${iso(X1, Y1, WATER).y} L${iso(X1, Y0, WATER).x} ${iso(X1, Y0, WATER).y}`} fill="none" stroke={white} strokeWidth={2} opacity={0.85} />
      {/* back edges, thin */}
      <path
        d={`M${iso(X0, Y0, Z0).x} ${iso(X0, Y0, Z0).y} V${iso(X0, Y0, TOP).y} M${iso(X0, Y1, TOP).x} ${iso(X0, Y1, TOP).y} L${iso(X0, Y0, TOP).x} ${iso(X0, Y0, TOP).y} L${iso(X1, Y0, TOP).x} ${iso(X1, Y0, TOP).y}`}
        fill="none"
        strokeWidth={1.5}
        opacity={0.55}
      />
      {/* front silhouette */}
      <path
        d={`M${iso(X0, Y1, TOP).x} ${iso(X0, Y1, TOP).y} V${iso(X0, Y1, Z0).y} L${iso(X1, Y1, Z0).x} ${iso(X1, Y1, Z0).y} L${iso(X1, Y0, Z0).x} ${iso(X1, Y0, Z0).y} V${iso(X1, Y0, TOP).y} L${iso(X1, Y1, TOP).x} ${iso(X1, Y1, TOP).y} Z M${iso(X1, Y1, TOP).x} ${iso(X1, Y1, TOP).y} V${iso(X1, Y1, Z0).y}`}
        fill="none"
      />
      {/* shine lines */}
      <g fill="none" stroke={white} strokeWidth={2.2} opacity={0.85}>
        <path d={`M${iso(0.3, Y1, 52).x} ${iso(0.3, Y1, 52).y} L${iso(0.42, Y1, 52).x} ${iso(0.42, Y1, 52).y}`} />
        <path d={`M${iso(0.5, Y1, 52).x} ${iso(0.5, Y1, 52).y} L${iso(0.54, Y1, 52).x} ${iso(0.54, Y1, 52).y}`} />
        <path d={`M${iso(X1, 0.3, 54).x} ${iso(X1, 0.3, 54).y} L${iso(X1, 0.3, 40).x} ${iso(X1, 0.3, 40).y}`} />
        <path d={`M${iso(X1, 0.38, 36).x} ${iso(X1, 0.38, 36).y} v-2`} />
      </g>
    </g>
  )
}

function cleanTank() {
  return (
    <g>
      {stand()}
      {backGlass(sky, 0)}
      {sand()}
      {seaweed()}
      {fish(-14, -22, warmRed)}
      {fish(-10, -35, petDefault, false, -4, 0.85)}
      {bubble(-3, -39, 2.2, 'b1')}
      {bubble(-1, -44.5, 1.6, 'b2')}
      {frontGlass(sky, 0)}
    </g>
  )
}

/** A smear of finger-marks on the front glass. */
function smudgeOnGlass(tx: number, z: number) {
  const p = iso(tx, Y1, z)
  return (
    <g stroke="none" fill={dirt}>
      <ellipse cx={p.x} cy={p.y} rx={5.5} ry={4} opacity={0.3} transform={`rotate(-20 ${p.x} ${p.y})`} />
      <ellipse cx={p.x + 6} cy={p.y + 2.5} rx={2.2} ry={1.8} opacity={0.3} />
      <ellipse cx={p.x - 6} cy={p.y - 2} rx={1.8} ry={1.5} opacity={0.3} />
    </g>
  )
}

/** A fuzzy blob of algae on the glass. */
function algae(x: number, y: number, k = 1, key?: string | number) {
  const puffs: [number, number, number][] = [
    [0, 0, 3.4],
    [-3.6, 1, 2.6],
    [3.4, 1, 2.8],
    [1, -2.4, 2.4],
  ]
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${k})`} stroke="none" fill={sickTint} opacity={0.7}>
      {puffs.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  )
}

function messy1Tank() {
  return (
    <g>
      {stand()}
      {backGlass(sickTint, 0.3)}
      {sand()}
      {seaweed()}
      {fish(-14, -22, warmRed)}
      {fish(-10, -35, petDefault, false, -4, 0.85)}
      {frontGlass(sickTint, 0.24)}
      {smudgeOnGlass(0.62, 40)}
      {smudgeOnGlass(0.32, 34)}
    </g>
  )
}

function messy2Tank() {
  return (
    <g>
      {stand()}
      {backGlass(sickTint, 0.5)}
      {sand()}
      {seaweed()}
      {/* the hungry fish gazes up at a bubble holding a flake of food */}
      {fish(-17, -19, warmRed, false, -42, 1, 'hungry')}
      {fish(14, -36, petDefault, true, 4, 0.8, 'sleepy')}
      {frontGlass(sickTint, 0.3)}
      {algae(iso(X1, 0.2, 31).x, iso(X1, 0.2, 31).y, 1, 'a1')}
      {algae(iso(X1, 0.45, 45).x, iso(X1, 0.45, 45).y, 0.8, 'a2')}
      {algae(iso(0.2, Y1, 33).x, iso(0.2, Y1, 33).y, 1.1, 'a3')}
      {algae(iso(0.55, Y1, 29).x, iso(0.55, Y1, 29).y, 0.9, 'a4')}
      {algae(iso(X1, 0.7, 29).x, iso(X1, 0.7, 29).y, 0.8, 'a5')}
      {smudgeOnGlass(0.4, 44)}
      <g>
        <circle cx={-6} cy={-38} r={6.6} fill={sky} fillOpacity={0.6} strokeWidth={2} />
        <path d="M-9.6 -39.4 q0.6 -3 3.4 -3.6" fill="none" stroke={white} strokeWidth={1.6} />
        <ellipse cx={-6} cy={-37} rx={2.4} ry={1.4} fill={petDefault} strokeWidth={1.2} transform="rotate(-20 -6 -37)" />
        {bubble(-11, -29, 1.5, 'tiny')}
      </g>
    </g>
  )
}

export const fishTankArt: ObjectArt = {
  catalogId: 'fish-tank',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {stage === 'clean' && cleanTank()}
      {stage === 'messy1' && messy1Tank()}
      {stage === 'messy2' && messy2Tank()}
      {stage === 'messy2' && fly(16, -68, 'a')}
    </g>
  ),
}
