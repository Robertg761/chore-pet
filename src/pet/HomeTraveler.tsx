import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { ACTION_MS, blendGroundFeet, sampleMotion, type MotionFrame } from '../character/motion'
import { poseFor, poseNameFor } from '../character/poses'
import type { Mood, Pet } from '../domain/types'
import type { HomeLayout } from '../room/homeLayout'
import { PET_SCALE, PET_STROKE_SCALE, ROOM_TILE_H, ROOM_TILE_W } from '../room/shell/geometry'
import { homePositionBetween, homeWaypointPoint, type RoomWaypoint } from './homeTravel'
import { usePetMotion } from './usePetMotion'
import './HomeTraveler.css'

export interface HomeTravelerProps {
  path: readonly RoomWaypoint[]
  layout: HomeLayout
  pet: Pet
  mood: Mood
  away?: boolean
  onDone: (lastWaypoint: RoomWaypoint) => void
  /** The drawn position each frame. Store in a ref so retargeting starts without a jump. */
  onPosition?: (waypoint: RoomWaypoint) => void
}

const STEP_MS = 90
const MAX_TRAVEL_MS = 10_000
const tileDistance = Math.hypot(ROOM_TILE_W / 2, ROOM_TILE_H / 2)
interface JourneyPoint { waypoint: RoomWaypoint; point: { x: number; y: number }; at: number; distance: number }
const placement = ({ x, y }: { x: number; y: number }) => `translate(${x - 100 * PET_SCALE} ${y - 182 * PET_SCALE}) scale(${PET_SCALE})`
const mirror = (facing: number) => facing < 0 ? 'translate(200 0) scale(-1 1)' : ''
const NEUTRAL_FRAME = sampleMotion({ species: 'bun', mood: 'happy', action: 'idle', elapsedMs: 0,
  distance: 0, durationMs: ACTION_MS.idle, reducedMotion: true })
function reflected(old: MotionFrame, species: Pet['species'], mood: Mood): MotionFrame {
  // Mirroring must preserve the full torso angle, including its mood posture.
  const postureLean = poseFor(species, poseNameFor(mood)).anchors.body.rotate ?? 0
  return { ...old, bodyX: -old.bodyX, lean: -old.lean - 2 * postureLean, gazeX: -old.gazeX,
    leftArm: -old.rightArm, rightArm: -old.leftArm, leftFoot: old.rightFoot, rightFoot: old.leftFoot,
    leftGroundX: -(old.rightGroundX ?? 0), rightGroundX: -(old.leftGroundX ?? 0),
    leftGroundY: old.rightGroundY, rightGroundY: old.leftGroundY,
    leftAppendage: -(species === 'bun' ? old.rightAppendage : old.leftAppendage),
    rightAppendage: -(species === 'bun' ? old.leftAppendage : old.rightAppendage),
  }
}

/** The SVG and scene stay stable while this child samples the whole journey. */
function TravelerArt({ journey, layout, pet, mood, away = false, onDone, onPosition, svg }: Omit<HomeTravelerProps, 'path'> & {
  journey: readonly JourneyPoint[]; svg: RefObject<SVGSVGElement | null>
}) {
  const node = useRef<SVGGElement>(null)
  const facingNode = useRef<SVGGElement>(null)
  const startedAt = useRef(0)
  const done = useRef(false)
  const facing = useRef<1 | -1>(1)
  const previousJourney = useRef<readonly JourneyPoint[] | null>(null)
  const [sample, setSample] = useState({ frame: NEUTRAL_FRAME, journey, done: false })
  const { frame } = sample
  const previous = useRef({ frame, point: journey[0].point })
  const turn = useRef<{ start: number; durationMs: number; frame: MotionFrame; point: { x: number; y: number } } | null>(null)
  const groundPath = useMemo(() => journey.filter((p, i) => i === 0 || p.distance > journey[i - 1].distance).map(({ distance, point }) => ({
    distance, x: (point.x - journey[0].point.x) / PET_SCALE, y: (point.y - journey[0].point.y) / PET_SCALE,
  })), [journey])

  useLayoutEffect(() => {
    // Strict Mode may replay setup for the same route. Arrival must stay consumed.
    if (previousJourney.current === journey) return
    startedAt.current = performance.now()
    done.current = false
    const nextFacing = journey[1] && journey[1].point.x < journey[0].point.x ? -1 : 1
    turn.current = previousJourney.current ? { start: startedAt.current, durationMs: Math.min(ACTION_MS.turn, journey[journey.length - 1].at), point: previous.current.point,
      frame: nextFacing === facing.current ? previous.current.frame : reflected(previous.current.frame, pet.species, mood) } : null
    facing.current = nextFacing
    previousJourney.current = journey
    node.current?.setAttribute('transform', placement(journey[0].point))
    facingNode.current?.setAttribute('transform', mirror(facing.current))
    svg.current?.setAttribute('data-travelling', 'true')
    // Appearance changes update sampling; only a new route resets the deadline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey, svg])

  const tick = (now: number, reduced: boolean) => {
    if (done.current) return
    const last = journey[journey.length - 1]
    const suppressed = away || mood === 'sick'
    // Resting art includes a bed/sleeping silhouette. Transfer it immediately,
    // using the same completion contract as reduced motion, instead of sliding it.
    const elapsed = reduced || suppressed ? last.at : Math.max(0, now - startedAt.current)
    let index = 0
    while (index + 1 < journey.length && elapsed >= journey[index + 1].at) index++
    const a = journey[index]
    const b = journey[index + 1] ?? a
    const progress = b.at > a.at ? Math.min(1, Math.max(0, (elapsed - a.at) / (b.at - a.at))) : 1
    const point = { x: a.point.x + (b.point.x - a.point.x) * progress, y: a.point.y + (b.point.y - a.point.y) * progress }
    const distance = a.distance + (b.distance - a.distance) * progress
    const nextFacing = b.point.x < a.point.x ? -1 : b.point.x > a.point.x ? 1 : facing.current
    if (nextFacing !== facing.current) {
      // Reflect the outgoing pose once, so mirrored limbs meet in screen space.
      turn.current = { start: now, durationMs: Math.min(ACTION_MS.turn, Math.max(0, last.at - elapsed)),
        point: previous.current.point, frame: reflected(previous.current.frame, pet.species, mood) }
      facing.current = nextFacing
    }
    const input = { species: pet.species, mood, action: suppressed ? 'idle' as const : 'walk' as const, elapsedMs: elapsed,
      blinkMs: now, distance, durationMs: last.at, reducedMotion: reduced || suppressed, groundPath, facing: facing.current }
    const sampled = sampleMotion(input)
    if (!reduced && !suppressed && turn.current && index < journey.length - 1) {
      const t = Math.min(1, Math.max(0, (now - turn.current.start) / Math.min(120, turn.current.durationMs)))
      const blend = t * t * (3 - 2 * t)
      const compression = sampleMotion({ ...input, action: 'turn', elapsedMs: now - turn.current.start, durationMs: turn.current.durationMs })
      sampled.scaleX += compression.scaleX - 1
      sampled.scaleY += compression.scaleY - 1
      const old = { ...turn.current.frame }
      // Rebase the frozen world contact as the scene continues through the corner.
      const dx = (turn.current.point.x - point.x) / PET_SCALE * facing.current
      const dy = (turn.current.point.y - point.y) / PET_SCALE
      old.leftGroundX = (old.leftGroundX ?? 0) + dx
      old.rightGroundX = (old.rightGroundX ?? 0) + dx
      old.leftGroundY = (old.leftGroundY ?? 0) + dy
      old.rightGroundY = (old.rightGroundY ?? 0) + dy
      const groundFeet = blendGroundFeet(old, sampled, blend)
      for (const field of Object.keys(sampled) as (keyof MotionFrame)[]) {
        if (field === 'expression') continue
        sampled[field] = (old[field] ?? 0) * (1 - blend) + (sampled[field] ?? 0) * blend
      }
      Object.assign(sampled, groundFeet)
      if (now - turn.current.start >= turn.current.durationMs) turn.current = null
    }
    previous.current = { frame: sampled, point }
    node.current?.setAttribute('transform', placement(point))
    facingNode.current?.setAttribute('transform', mirror(facing.current))
    const position = index === journey.length - 1 ? last.waypoint : homePositionBetween(layout, a.waypoint, b.waypoint, progress)
    svg.current?.setAttribute('data-travel-room', position.roomId)
    onPosition?.(position)
    setSample({ frame: sampled, journey, done: index === journey.length - 1 })
    if (index === journey.length - 1) {
      done.current = true
      svg.current?.setAttribute('data-travelling', 'false')
      onDone(last.waypoint)
    }
  }
  const latestTick = useRef(tick)
  useLayoutEffect(() => { latestTick.current = tick })
  const { reducedMotion } = usePetMotion(tick, sample.journey !== journey || !sample.done)
  // A preference change arrives immediately, even in a hidden tab. Other prop
  // changes update the next sample without restarting the journey deadline.
  useLayoutEffect(() => { latestTick.current(performance.now(), reducedMotion) }, [reducedMotion, journey, mood, away])

  return <g ref={node} transform={placement(journey[0].point)}>
    <g ref={facingNode} transform={mirror(journey[1] && journey[1].point.x < journey[0].point.x ? -1 : 1)}>
      <AnimatedCharacterArt species={pet.species} mood={mood} pose={away ? 'sleeping' : undefined}
        frame={frame} bodyColour={pet.bodyColour} equipped={pet.equipped}
        look={{ eyes: pet.eyes, cheeks: pet.cheeks }} strokeScale={PET_STROKE_SCALE} />
    </g>
  </g>
}

/** A single decorative pet in the same scene coordinates as every room. */
export function HomeTraveler({ path, layout, pet, mood, away = false, onDone, onPosition }: HomeTravelerProps) {
  const svg = useRef<SVGSVGElement>(null)
  const layoutKey = JSON.stringify(layout)
  const stableLayout = useMemo<HomeLayout>(() => JSON.parse(layoutKey), [layoutKey])
  const journey = useMemo<JourneyPoint[]>(() => {
    let distance = 0
    const points = path.map((waypoint) => ({ waypoint, point: homeWaypointPoint(stableLayout, waypoint), distance: 0, at: 0 }))
    if (points.some(({ point }) => point === null)) return []
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1].point!, b = points[i].point!
      distance += Math.hypot(b.x - a.x, b.y - a.y) / tileDistance
      points[i].distance = distance
    }
    const duration = Math.min(MAX_TRAVEL_MS, distance * STEP_MS)
    return points.map(({ waypoint, point, distance: d }) => ({ waypoint, point: point!, distance: d, at: distance > 0 ? d / distance * duration : 0 }))
  }, [path, stableLayout])
  if (!journey.length) return null
  return <svg ref={svg} className="home-traveler" viewBox={`0 0 ${layout.width} ${layout.height}`}
    width={layout.width} height={layout.height} aria-hidden="true" focusable="false"
    data-testid="home-traveler" data-travel-room={journey[0].waypoint.roomId} data-travelling="true" data-away={away}>
    <TravelerArt journey={journey} layout={stableLayout} pet={pet} mood={mood} away={away}
      onDone={onDone} onPosition={onPosition} svg={svg} />
  </svg>
}
