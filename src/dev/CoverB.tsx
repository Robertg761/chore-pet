import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { PALETTE, SPECIES_COLOUR } from '../art/palette'
import { mix } from '../art/color'
import type { MessKind } from '../catalog/types'
import { CharacterArt } from '../character/Character'
import type { PoseName } from '../character/poses'
import { SAMPLE_KITCHEN } from '../content/sampleHome'
import type { CharacterSlot, MessStage, Mood, PlacedObject, Species } from '../domain/types'
import { heartPath, starPath } from '../effects/shapes'
import type { CueLevel } from '../room/cuePlan'
import { NeglectCue } from '../room/neglect'
import { OBJECT_ART, cleanTop } from '../room/objects'
import { fly, plate } from '../room/objects/mess'
import { Room } from '../room/Room'
import { OBJECT_SCALE, PET_STROKE_SCALE, ROOM_VIEWBOX, TILE_SCALE, petTransform, roomPoint } from '../room/shell/geometry'

// Dev-only cover picture, direction B "Before / after" (/?cover=b, /?cover=b&card for the 1200x630
// share card). The same real kitchen twice, drawn by the app's own Room renderer: on the left the
// chores have run late (messy2 stages, big neglect cues, a cool washed-out room) and Mochi droops; on
// the right everything is clean and sparkling in a warm glow, and Mochi cheers in the red beanie she
// earned. A big Done button sits between them. Rendered to PNG by scripts/cover.mjs. Not part of the app.

const { ink, white, accent, blush, sakura, petDefault, leaf, sky, warmRed, fabricBlue, cream, steel } = PALETTE

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
 * Before: a few of the app's own mess pieces, bigger than in the app so they read at thumbnail size.
 * Two neglect cues (sink and bin) instead of cuePlan's choice, a tower of plates waiting by the sink,
 * and a few more flies. Room coordinates.
 */
function messOverlay(): ReactNode {
  const cues: [string, MessKind, CueLevel, number, number][] = [
    ['sink', 'stink', 3, 2.1, 6],
    ['trash', 'stink', 3, 1.6, 0],
  ]
  const pile = roomPoint(0.5, 1.45, 23)
  const plates: [number, string | undefined][] = [
    [0, undefined],
    [-4, warmRed],
    [-8, fabricBlue],
    [-12, undefined],
    [-16, petDefault],
    [-20, warmRed],
  ]
  const s = OBJECT_SCALE * 1.25
  return (
    <g>
      <g transform={`translate(${pile.x} ${pile.y}) scale(${s})`} stroke={ink} strokeWidth={2}>
        {plates.map(([dy, sauce], i) => (
          <g key={i} transform={`translate(${i % 2 ? 1.2 : -0.6} ${dy})`}>
            {plate(0, 0, sauce)}
          </g>
        ))}
      </g>
      {cues.map(([id, kind, level, grow, dy]) => {
        const a = cueAnchor(id)
        return (
          <g key={id} transform={`translate(${a.x} ${a.y + dy}) scale(${TILE_SCALE * grow})`} stroke="none">
            <NeglectCue kind={kind} level={level} still />
          </g>
        )
      })}
      <g transform="scale(1)">
        {[
          [roomPoint(3.6, 3.2, 52), false],
          [roomPoint(1.4, 2.6, 92), true],
          [roomPoint(4.4, 0.6, 96), false],
        ].map(([p, flip], i) => {
          const { x, y } = p as { x: number; y: number }
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(1.15)`}>
              {fly(0, 0, i, flip as boolean)}
            </g>
          )
        })}
      </g>
    </g>
  )
}

/** After: plump sparkles on the things that just got cleaned, and two visiting friends (room coordinates). */
function cleanOverlay(guests: boolean): ReactNode {
  const at = (tx: number, ty: number, z: number) => roomPoint(tx, ty, z)
  const stars: [{ x: number; y: number }, number, string][] = [
    [at(0.5, 2.5, 50), 15, white],
    [at(0.2, 3.7, 30), 9, sky],
    [at(4, 4, 36), 14, white],
    [at(3.2, 3.4, 26), 8, blush],
    [at(1.6, 0.4, 46), 11, petDefault],
    [at(3.6, 0.2, 42), 9, white],
    [at(6.5, 0.4, 64), 8, blush],
    [at(0.6, 0.5, 80), 9, white],
  ]
  const glints: [{ x: number; y: number }, number][] = [
    [at(1.2, 2.2, 30), 6],
    [at(4.8, 3.6, 22), 6],
    [at(2.6, 0.8, 30), 5],
    [at(4.6, 5.8, 2), 6],
    [at(6.4, 4.2, 2), 5],
    [at(2.2, 4.4, 2), 5],
  ]
  const friend = (species: Species, tile: { tx: number; ty: number }, facing: 1 | -1) => (
    <g transform={petTransform(tile)}>
      <g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}>
        <CharacterArt species={species} mood="happy" bodyColour={SPECIES_COLOUR[species]} strokeScale={PET_STROKE_SCALE} />
      </g>
    </g>
  )
  return (
    <g style={{ pointerEvents: 'none' }}>
      {guests && friend('sprout', { tx: 1.7, ty: 1.1 }, -1)}
      {guests && friend('bun', { tx: 1.6, ty: 5.2 }, 1)}
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
  const common = { x, y, fontSize: size, fontWeight: 900, textAnchor: 'middle' as const, letterSpacing: -size * 0.01, strokeLinejoin: 'round' as const }
  const stroke = size * 0.15
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      {/* A soft drop shadow, then the ink outline, then the coloured letters (so no counter is left unfilled). */}
      <text {...common} y={y + size * 0.075} fill={ink} fillOpacity={0.2} stroke={ink} strokeOpacity={0.2} strokeWidth={stroke}>
        {word}
      </text>
      <text {...common} fill={ink} stroke={ink} strokeWidth={stroke}>
        {word}
      </text>
      <text {...common}>
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
function DoneButton({ w = 350, h = 130 }: { w?: number; h?: number }) {
  const r = h / 2
  const lift = 12
  return (
    <g>
      <rect x={-w / 2} y={-h / 2 + lift} width={w} height={h} rx={r} fill={ink} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill={accent} stroke={ink} strokeWidth={7} />
      {/* A soft top highlight, so it looks pressable. */}
      <rect x={-w / 2 + 26} y={-h / 2 + 13} width={w - 52} height={h * 0.25} rx={h * 0.125} fill={white} fillOpacity={0.24} />
      <g transform={`translate(${-w / 2 + r + 2} 0)`}>
        <circle r={r - 17} fill={white} stroke={ink} strokeWidth={6} />
        <path d="M-20 1 L-6 15 L22 -15" fill="none" stroke={ink} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-20 1 L-6 15 L22 -15" fill="none" stroke={leaf} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x={r * 0.62} y={h * 0.2} fontSize={h * 0.56} fontWeight={900} fill={white} textAnchor="middle" stroke={ink} strokeWidth={8} paintOrder="stroke fill" strokeLinejoin="round">
        Done
      </text>
    </g>
  )
}

/** A bold, short arc arrow from the messy side over to the clean one. */
function Arrow({ x0, x1, y, lift }: { x0: number; x1: number; y: number; lift: number }) {
  const mid = (x0 + x1) / 2
  const d = `M${x0} ${y} Q${mid} ${y - lift} ${x1} ${y}`
  // Head at the end, pointing along the curve's final direction.
  const ang = (Math.atan2(lift, x1 - mid) * 180) / Math.PI
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={ink} strokeWidth={30} />
      <path d={d} stroke={petDefault} strokeWidth={16} />
      <g transform={`translate(${x1} ${y}) rotate(${ang})`}>
        <path d="M-10 -32 L26 0 L-10 32 Z" fill={petDefault} stroke={ink} strokeWidth={7} />
      </g>
    </g>
  )
}

interface PetSpec {
  mood: Mood
  pose?: PoseName
  equipped?: Partial<Record<CharacterSlot, string>>
  tilt?: number
  /** Drawn over the pet, in its 200x200 box. */
  extra?: ReactNode
}

function Pet({ x, y, size, spec, flip = false }: { x: number; y: number; size: number; spec: PetSpec; flip?: boolean }) {
  const s = size / 200
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${spec.tilt ?? 0}) translate(-100 -180)`}>
      {/* Its own little ground shadow. */}
      <ellipse cx={100} cy={182} rx={66} ry={12} fill={ink} fillOpacity={0.18} />
      <CharacterArt species="mochi" mood={spec.mood} pose={spec.pose} bodyColour={sakura} equipped={spec.equipped} strokeScale={1.1} />
      {spec.extra}
    </g>
  )
}

/** A big sweat drop, for the glum Mochi (decoration in the app's outline style). */
function Drop({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -14 C5 -6 9 -1 9 4 A9 9 0 0 1 -9 4 C-9 -1 -5 -6 0 -14 Z" fill={sky} stroke={ink} strokeWidth={3.2} strokeLinejoin="round" />
      <ellipse cx={-3} cy={2} rx={2.2} ry={3.2} fill={white} />
    </g>
  )
}

/** Soft pastel rays from a point, for the clean side only. */
function Rays({ cx, cy, r, n = 14 }: { cx: number; cy: number; r: number; n?: number }) {
  const wedges = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = a0 + Math.PI / n
    wedges.push(`M${cx} ${cy} L${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} Z`)
  }
  return <path d={wedges.join(' ')} fill={white} fillOpacity={0.32} />
}

/** Sets a filter on the room's floor and walls only (the shell's first group), so the objects and mess keep their colour. */
function useShellFilter(filter: string) {
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    ref.current?.querySelector(':scope > g > g')?.setAttribute('filter', filter)
  })
  return ref
}

export default function CoverB() {
  const params = new URLSearchParams(location.search)
  const card = params.has('card')
  const guests = !params.has('noguests')
  // The card is the same picture on a slightly wider canvas, scaled down to 1200 x 630.
  const W = 1600
  const H = card ? 840 : 900
  const scale = card ? 0.75 : 1

  const roomW = card ? 730 : 790
  const k = roomW / ROOM_VIEWBOX.width
  const roomH = ROOM_VIEWBOX.height * k
  const roomTop = card ? 214 : 222
  const gap = 12
  const leftX = W / 2 - gap / 2 - roomW
  const rightX = W / 2 + gap / 2
  /** A room point on screen, for the left (0) or right (1) room. */
  const petSize = card ? 360 : 380

  const before = mix(PALETTE.ground, steel, 0.45)
  const after = mix(sakura, cream, 0.3)
  const shadow = { filter: 'drop-shadow(0 16px 18px rgba(43, 30, 47, 0.2))' }
  const coolRef = useShellFilter('url(#cvb-cool)')
  const sad: PetSpec = { mood: 'scruffy', tilt: -4, extra: <Drop x={158} y={98} s={1.35} /> }

  const titleY = card ? 136 : 142
  const titleSize = card ? 140 : 150
  const doneY = card ? H - 112 : H - 124

  return (
    <div style={{ width: W * scale, height: H * scale, overflow: 'hidden', position: 'relative', background: PALETTE.ground, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{ width: W, height: H, position: 'absolute', left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {/* Background: a diagonal split, a cool grey-lavender before and a warm sakura after with a sunny glow and rays. */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="cvb-glow">
              <stop offset="0" stopColor={white} stopOpacity={0.55} />
              <stop offset="1" stopColor={white} stopOpacity={0} />
            </radialGradient>
            <radialGradient id="cvb-sun">
              <stop offset="0" stopColor={petDefault} stopOpacity={0.75} />
              <stop offset="0.55" stopColor={petDefault} stopOpacity={0.25} />
              <stop offset="1" stopColor={petDefault} stopOpacity={0} />
            </radialGradient>
            <clipPath id="cvb-after">
              <polygon points={`${W / 2 + 110},0 ${W},0 ${W},${H} ${W / 2 - 110},${H}`} />
            </clipPath>
            {/* The before room's floor and walls: washed out and cooler, so the mess and the clean room do the talking. */}
            <filter id="cvb-cool" colorInterpolationFilters="sRGB">
              <feColorMatrix type="saturate" values="0.35" />
              <feColorMatrix type="matrix" values="0.86 0 0 0 0.02  0 0.9 0 0 0.04  0 0 0.94 0 0.1  0 0 0 1 0" />
            </filter>
          </defs>
          <rect width={W} height={H} fill={before} />
          <circle cx={leftX + roomW * 0.5} cy={roomTop + roomH * 0.55} r={460} fill="url(#cvb-glow)" />
          <g clipPath="url(#cvb-after)">
            <rect width={W} height={H} fill={after} />
            <Rays cx={rightX + roomW * 0.5} cy={roomTop + roomH * 0.5} r={1100} n={16} />
            <circle cx={rightX + roomW * 0.5} cy={roomTop + roomH * 0.5} r={620} fill="url(#cvb-sun)" />
          </g>
          <polygon points={`${W / 2 + 110 - 8},0 ${W / 2 + 110 + 8},0 ${W / 2 - 110 + 8},${H} ${W / 2 - 110 - 8},${H}`} fill={white} />
        </svg>

        {/* The same kitchen twice, drawn by the app's own room renderer. */}
        <div style={{ position: 'absolute', left: leftX, top: roomTop, ...shadow }}>
          <Room room={ROOM} objects={OBJECTS} stages={MESSY} width={roomW} overlay={messOverlay()} svgRef={coolRef} />
        </div>
        <div style={{ position: 'absolute', left: rightX, top: roomTop, ...shadow }}>
          <Room room={ROOM} objects={OBJECTS} width={roomW} overlay={cleanOverlay(guests)} />
        </div>

        {/* Foreground: wordmark, pets, the Done button and decorations. */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <RainbowWord word="Chore" colours={[blush, petDefault, leaf, sky, sakura]} x={W / 2 - 152} y={titleY} size={titleSize} />
          <RainbowWord word="Pet" colours={[warmRed, petDefault, fabricBlue]} x={W / 2 + 238} y={titleY + 4} size={titleSize} rotate={-4} />
          <text x={W / 2} y={titleY + (card ? 58 : 62)} fontSize={card ? 40 : 42} fontWeight={900} textAnchor="middle" stroke={white} strokeWidth={8} strokeOpacity={0.7} paintOrder="stroke fill" strokeLinejoin="round">
            <tspan fill={accent}>Do real chores.</tspan>
            <tspan fill={ink}> Keep it happy.</tspan>
          </text>
          <Star x={W / 2 - 420} y={titleY - 78} r={26} fill={petDefault} />
          <Star x={W / 2 + 440} y={titleY - 90} r={20} fill={sky} />

          {/* After: a sparkle burst round the clean room. */}
          <Star x={rightX + roomW - 120} y={roomTop + 60} r={22} fill={petDefault} />
          <Star x={rightX + roomW - 40} y={roomTop + 150} r={14} fill={white} />
          <Star x={rightX + roomW * 0.5 + 40} y={roomTop - 4} r={13} fill={blush} />

          {/* The pets, big, overlapping the front of their homes */}
          <Pet x={leftX + petSize * 0.5 + 6} y={H - 14} size={petSize} spec={sad} />
          <Pet x={rightX + roomW - petSize * 0.5 - 6} y={H - 14} size={petSize} spec={{ mood: 'happy', pose: 'cheering', equipped: { head: 'beanie-red' } }} flip />
          <Heart x={rightX + roomW - 22} y={H - petSize - 6} s={50} rotate={12} />
          <Heart x={rightX + roomW - petSize * 0.92} y={H - petSize + 24} s={34} fill={sakura} rotate={-14} />

          {/* The transition: a short bold arc over the gap, and the Done button, the hero, below it. */}
          <Arrow x0={W / 2 - 92} x1={W / 2 + 86} y={doneY - 92} lift={92} />
          <g transform={`translate(${W / 2} ${doneY})`}>
            <DoneButton />
          </g>
          <Star x={W / 2 + 196} y={doneY - 54} r={20} fill={white} />
          <Star x={W / 2 - 190} y={doneY + 62} r={13} fill={petDefault} />
        </svg>
      </div>
    </div>
  )
}
