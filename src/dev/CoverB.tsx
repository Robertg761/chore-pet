import type { ReactNode } from 'react'
import { PALETTE } from '../art/palette'
import { mix } from '../art/color'
import { CharacterArt } from '../character/Character'
import type { PoseName } from '../character/poses'
import { SAMPLE_KITCHEN } from '../content/sampleHome'
import type { MessKind } from '../catalog/types'
import type { CharacterSlot, MessStage, Mood, PlacedObject } from '../domain/types'
import { heartPath, starPath } from '../effects/shapes'
import type { CueLevel } from '../room/cuePlan'
import { NeglectCue } from '../room/neglect'
import { OBJECT_ART, cleanTop } from '../room/objects'
import { Room } from '../room/Room'
import { OBJECT_SCALE, ROOM_VIEWBOX, TILE_SCALE, roomPoint } from '../room/shell/geometry'

// Dev-only cover picture, direction B "Before / after" (/?cover=b, /?cover=b&card for the 1200x630
// share card). The same real kitchen twice, drawn by the app's own Room renderer: on the left the
// chores have run late (messy2 stages and neglect cues) and Mochi is glum; on the right everything
// is clean, sparkling, and Mochi cheers in the red beanie she earned. A big Done button sits between
// them. Rendered to PNG by scripts/cover.mjs. Not part of the app.

const { ink, white, accent, blush, sakura, petDefault, leaf, sky, warmRed, fabricBlue, cream } = PALETTE

const ROOM = { floorStyle: 'wood', wallStyle: 'peach' }
const OBJECTS: PlacedObject[] = SAMPLE_KITCHEN.map((spot, i) => ({ id: `cover-${spot.catalogId}-${i}`, roomId: 'cover', ...spot }))
const idOf = (catalogId: string) => OBJECTS.find((o) => o.catalogId === catalogId)!.id

/** Before: the kitchen after a few days of nobody washing up. */
const MESSY: Record<string, MessStage> = Object.fromEntries(
  ['sink', 'trash', 'dining-table', 'stove', 'dishwasher', 'recycling', 'counter', 'plant'].map((c) => [idOf(c), 'messy2' as MessStage]),
)

/** Where the room puts an object's neglect cue: the top-centre of its clean art (as Room's objectTop). */
function cueAnchor(catalogId: string) {
  const o = OBJECTS.find((p) => p.catalogId === catalogId)!
  const art = OBJECT_ART[catalogId]
  const corner = roomPoint(o.tileX, o.tileY)
  const flip = o.rotation % 2 === 1 ? -1 : 1
  return { x: corner.x + flip * OBJECT_SCALE * (art.bounds.x + art.bounds.width / 2), y: corner.y + OBJECT_SCALE * cleanTop(art) }
}

/**
 * Before: the app's own neglect cues, placed here rather than through cuePlan so more than two
 * show in full, and a touch bigger than in the app so they read at thumbnail size.
 */
function messCues(): ReactNode {
  const cues: [string, MessKind, CueLevel, number][] = [
    ['sink', 'stink', 3, 1.45],
    ['trash', 'stink', 3, 1.3],
    ['dining-table', 'stink', 2, 1.25],
    ['plant', 'wilt', 2, 1.2],
  ]
  return cues.map(([id, kind, level, grow]) => {
    const a = cueAnchor(id)
    return (
      <g key={id} transform={`translate(${a.x} ${a.y}) scale(${TILE_SCALE * grow})`} stroke="none">
        <NeglectCue kind={kind} level={level} still />
      </g>
    )
  })
}

/** After: plump sparkles on the things that just got cleaned (room coordinates). */
function cleanSparkles(): ReactNode {
  const at = (tx: number, ty: number, z: number) => roomPoint(tx, ty, z)
  const stars: [{ x: number; y: number }, number, string][] = [
    [at(0.5, 2.5, 46), 13, white],
    [at(0.2, 3.6, 30), 8, sky],
    [at(4, 4, 34), 12, white],
    [at(3.2, 3.4, 26), 7, blush],
    [at(1.6, 0.4, 44), 9, petDefault],
    [at(3.6, 0.2, 40), 8, white],
    [at(5.6, 2.8, 4), 7, sky],
    [at(2.2, 6.4, 4), 8, petDefault],
    [at(6.5, 0.4, 62), 7, blush],
  ]
  const glints: [{ x: number; y: number }, number][] = [
    [at(1.2, 2.2, 30), 5],
    [at(4.8, 3.6, 22), 5],
    [at(2.6, 0.8, 30), 4],
    [at(4.6, 5.8, 2), 5],
    [at(6.4, 4.2, 2), 4],
  ]
  return (
    <g style={{ pointerEvents: 'none' }}>
      {glints.map(([p, r], i) => (
        <path key={`g${i}`} transform={`translate(${p.x} ${p.y})`} d={starPath(r, 0.12)} fill={white} stroke="none" />
      ))}
      {stars.map(([p, r, fill], i) => (
        <path key={`s${i}`} transform={`translate(${p.x} ${p.y})`} d={starPath(r)} fill={fill} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      ))}
    </g>
  )
}

/** A rainbow, ink-outlined word, one tspan per letter (the wordmark of the story video). */
function RainbowWord({ word, colours, x, y, size, rotate = 0 }: { word: string; colours: string[]; x: number; y: number; size: number; rotate?: number }) {
  const common = { x, y, fontSize: size, fontWeight: 900, textAnchor: 'middle' as const, letterSpacing: -size * 0.01 }
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      {/* A soft drop shadow, then the inked letters on top. */}
      <text {...common} y={y + size * 0.075} fill={ink} fillOpacity={0.22} stroke={ink} strokeOpacity={0.22} strokeWidth={size * 0.16} strokeLinejoin="round">
        {word}
      </text>
      <text {...common} stroke={ink} strokeWidth={size * 0.16} strokeLinejoin="round" paintOrder="stroke fill">
        {[...word].map((ch, i) => (
          <tspan key={i} fill={colours[i]}>
            {ch}
          </tspan>
        ))}
      </text>
    </g>
  )
}

function Star({ x, y, r, fill = petDefault, stroke = 3 }: { x: number; y: number; r: number; fill?: string; stroke?: number }) {
  return <path transform={`translate(${x} ${y})`} d={starPath(r)} fill={fill} stroke={ink} strokeWidth={stroke} strokeLinejoin="round" />
}

function Heart({ x, y, s, fill = blush, rotate = 0 }: { x: number; y: number; s: number; fill?: string; rotate?: number }) {
  return <path transform={`translate(${x} ${y}) rotate(${rotate})`} d={heartPath(s)} fill={fill} stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />
}

/** The big Done button, in the app's chunky outline style, with a check. Centred on (0,0). */
function DoneButton({ w = 300, h = 112 }: { w?: number; h?: number }) {
  const r = h / 2
  const lift = 10
  return (
    <g>
      <rect x={-w / 2} y={-h / 2 + lift} width={w} height={h} rx={r} fill={ink} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill={accent} stroke={ink} strokeWidth={6} />
      {/* A soft top highlight, so it looks pressable. */}
      <rect x={-w / 2 + 22} y={-h / 2 + 12} width={w - 44} height={h * 0.26} rx={h * 0.13} fill={white} fillOpacity={0.22} />
      <g transform={`translate(${-w / 2 + r + 2} 0)`}>
        <circle r={r - 16} fill={white} stroke={ink} strokeWidth={5} />
        <path d="M-17 1 L-5 13 L19 -13" fill="none" stroke={leaf} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-17 1 L-5 13 L19 -13" fill="none" stroke={ink} strokeOpacity={0} strokeWidth={5} />
      </g>
      <text x={r * 0.62} y={h * 0.2} fontSize={h * 0.54} fontWeight={900} fill={white} textAnchor="middle" stroke={ink} strokeWidth={7} paintOrder="stroke fill" strokeLinejoin="round">
        Done
      </text>
    </g>
  )
}

/** A playful arc arrow from the messy side over to the clean one. */
function Arrow({ x0, x1, y, lift }: { x0: number; x1: number; y: number; lift: number }) {
  const mid = (x0 + x1) / 2
  const d = `M${x0} ${y} Q${mid} ${y - lift} ${x1} ${y}`
  // Head at the end, pointing along the curve's final direction.
  const ang = (Math.atan2(lift, x1 - mid) * 180) / Math.PI
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={ink} strokeWidth={20} />
      <path d={d} stroke={white} strokeWidth={9} strokeDasharray="0.1 22" />
      <g transform={`translate(${x1} ${y}) rotate(${ang})`}>
        <path d="M-6 -24 L20 0 L-6 24 Z" fill={white} stroke={ink} strokeWidth={6} />
      </g>
    </g>
  )
}

interface PetSpec {
  mood: Mood
  pose?: PoseName
  equipped?: Partial<Record<CharacterSlot, string>>
}

function Pet({ x, y, size, spec, flip = false }: { x: number; y: number; size: number; spec: PetSpec; flip?: boolean }) {
  const s = size / 200
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) translate(-100 -180)`}>
      {/* Its own little ground shadow. */}
      <ellipse cx={100} cy={182} rx={64} ry={12} fill={ink} fillOpacity={0.16} />
      <CharacterArt species="mochi" mood={spec.mood} pose={spec.pose} bodyColour={sakura} equipped={spec.equipped} strokeScale={1.15} />
    </g>
  )
}

export default function CoverB() {
  const card = new URLSearchParams(location.search).has('card')
  // The card is the same picture on a slightly wider canvas, scaled down to 1200 x 630.
  const W = 1600
  const H = card ? 840 : 900
  const scale = card ? 0.75 : 1

  const roomW = card ? 640 : 690
  const roomH = (roomW * ROOM_VIEWBOX.height) / ROOM_VIEWBOX.width
  const roomTop = card ? 232 : 250
  const gap = card ? 120 : 70
  const leftX = W / 2 - gap / 2 - roomW
  const rightX = W / 2 + gap / 2
  const roomBottom = roomTop + roomH
  const petSize = card ? 310 : 340
  const k = roomW / ROOM_VIEWBOX.width
  /** The left room's right floor corner on screen: the Done button and arrow sit around its height. */
  const seamY = roomTop + (215 - ROOM_VIEWBOX.y) * k

  const before = mix(PALETTE.ground, sky, 0.22)
  const after = mix(sakura, cream, 0.35)
  const shadow = { filter: 'drop-shadow(0 14px 18px rgba(43, 30, 47, 0.18))' }

  return (
    <div style={{ width: W * scale, height: H * scale, overflow: 'hidden', position: 'relative', background: PALETTE.ground, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{ width: W, height: H, position: 'absolute', left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {/* Background: a diagonal split, cool lavender before and warm sakura after, with soft glows. */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="cvb-glow">
              <stop offset="0" stopColor={white} stopOpacity={0.8} />
              <stop offset="1" stopColor={white} stopOpacity={0} />
            </radialGradient>
            <radialGradient id="cvb-sun">
              <stop offset="0" stopColor={petDefault} stopOpacity={0.6} />
              <stop offset="1" stopColor={petDefault} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={before} />
          <polygon points={`${W / 2 + 110},0 ${W},0 ${W},${H} ${W / 2 - 110},${H}`} fill={after} />
          <circle cx={rightX + roomW * 0.55} cy={roomTop + roomH * 0.55} r={560} fill="url(#cvb-sun)" />
          <circle cx={leftX + roomW * 0.5} cy={roomTop + roomH * 0.55} r={440} fill="url(#cvb-glow)" />
          <circle cx={rightX + roomW * 0.5} cy={roomTop + roomH * 0.55} r={420} fill="url(#cvb-glow)" />
          <polygon points={`${W / 2 + 110 - 8},0 ${W / 2 + 110 + 8},0 ${W / 2 - 110 + 8},${H} ${W / 2 - 110 - 8},${H}`} fill={white} />
        </svg>

        {/* The same kitchen twice, drawn by the app's own room renderer. */}
        <div style={{ position: 'absolute', left: leftX, top: roomTop, ...shadow }}>
          <Room room={ROOM} objects={OBJECTS} stages={MESSY} width={roomW} overlay={messCues()} />
        </div>
        <div style={{ position: 'absolute', left: rightX, top: roomTop, ...shadow }}>
          <Room room={ROOM} objects={OBJECTS} width={roomW} overlay={cleanSparkles()} />
        </div>

        {/* Foreground: wordmark, pets, the Done button and decorations. */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <RainbowWord word="Chore" colours={[blush, petDefault, leaf, sky, sakura]} x={W / 2 - 140} y={card ? 128 : 136} size={card ? 128 : 136} />
          <RainbowWord word="Pet" colours={[warmRed, petDefault, fabricBlue]} x={W / 2 + 214} y={card ? 132 : 140} size={card ? 128 : 136} rotate={-4} />
          <g transform={`translate(${W / 2} ${card ? 190 : 202})`}>
            <rect x={-300} y={-27} width={600} height={54} rx={27} fill={white} stroke={ink} strokeWidth={4} />
            <text y={12} fontSize={33} fontWeight={800} fill={ink} textAnchor="middle">
              Do real chores. Keep it happy.
            </text>
          </g>
          <Star x={W / 2 - 420} y={card ? 66 : 72} r={26} fill={petDefault} />
          <Star x={W / 2 + 430} y={card ? 58 : 62} r={20} fill={sky} />
          <Star x={W / 2 + 488} y={card ? 118 : 124} r={12} fill={white} />

          {/* The pets, big, in front of their homes */}
          <Pet x={leftX + petSize * 0.42} y={H - 26} size={petSize} spec={{ mood: 'scruffy' }} />
          <Pet x={rightX + roomW - petSize * 0.42} y={H - 26} size={petSize} spec={{ mood: 'happy', pose: 'cheering', equipped: { head: 'beanie-red' } }} flip />
          <Heart x={rightX + roomW - 10} y={H - petSize - 4} s={46} rotate={12} />
          <Heart x={rightX + roomW - petSize * 0.86} y={H - petSize + 30} s={32} fill={sakura} rotate={-14} />
          <Star x={rightX + roomW + 8} y={H - petSize * 0.62} r={16} fill={petDefault} />

          {/* The transition: an arc over the gap, and the Done button below it. */}
          <Arrow x0={W / 2 - 112} x1={W / 2 + 104} y={seamY + 4} lift={96} />
          <g transform={`translate(${W / 2} ${seamY + 96})`}>
            <DoneButton />
          </g>
          <Star x={W / 2 + 172} y={seamY + 40} r={18} fill={white} />
          <Star x={W / 2 - 162} y={seamY + 160} r={12} fill={petDefault} />

          {/* Before and after, under each home */}
          <Tag x={leftX + roomW / 2 + 40} y={roomBottom + 30} text="Before" />
          <Tag x={rightX + roomW / 2 - 40} y={roomBottom + 30} text="After" dark />
        </svg>
      </div>
    </div>
  )
}

function Tag({ x, y, text, dark = false }: { x: number; y: number; text: string; dark?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-78} y={-25} width={156} height={50} rx={25} fill={dark ? ink : white} stroke={ink} strokeWidth={4} />
      <text y={10} fontSize={29} fontWeight={900} fill={dark ? white : ink} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}
