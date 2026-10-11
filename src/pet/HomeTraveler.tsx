import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CharacterArt } from '../character/Character'
import type { Mood, Pet } from '../domain/types'
import type { HomeLayout } from '../room/homeLayout'
import { PET_SCALE, PET_STROKE_SCALE, ROOM_TILE_H, ROOM_TILE_W } from '../room/shell/geometry'
import { homePositionBetween, homeWaypointPoint, type RoomWaypoint } from './homeTravel'
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

/** A single decorative pet that moves in the same scene coordinates as every room. */
export function HomeTraveler({ path, layout, pet, mood, away = false, onDone, onPosition }: HomeTravelerProps) {
  const node = useRef<SVGGElement>(null)
  const facingNode = useRef<SVGGElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const callbacks = useRef({ onDone, onPosition })
  useLayoutEffect(() => { callbacks.current = { onDone, onPosition } }, [onDone, onPosition])
  const layoutKey = JSON.stringify(layout)
  const stableLayout = useMemo<HomeLayout>(() => JSON.parse(layoutKey), [layoutKey])

  const journey = useMemo(() => {
    let duration = 0
    const points = path.map((waypoint) => ({ waypoint, point: homeWaypointPoint(stableLayout, waypoint), at: 0 }))
    if (points.some(({ point }) => point === null)) return []
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1].point!
      const b = points[i].point!
      duration += STEP_MS * Math.hypot(b.x - a.x, b.y - a.y) / tileDistance
      points[i].at = duration
    }
    const speed = duration > MAX_TRAVEL_MS ? MAX_TRAVEL_MS / duration : 1
    return points.map(({ waypoint, point, at }) => ({ waypoint, point: point!, at: at * speed }))
  }, [path, stableLayout])

  useEffect(() => {
    if (!journey.length) return
    let frame = 0
    let cancelled = false
    let startedAt: number | null = null
    let arrived = -1
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const last = journey[journey.length - 1]
    const draw = (x: number, y: number, facing: number) => {
      node.current?.setAttribute('transform', `translate(${x - 100 * PET_SCALE} ${y - 182 * PET_SCALE}) scale(${PET_SCALE})`)
      if (facing !== 0) facingNode.current?.setAttribute('transform', facing < 0 ? 'translate(200 0) scale(-1 1)' : '')
    }
    const report = (waypoint: RoomWaypoint) => {
      svg.current?.setAttribute('data-travel-room', waypoint.roomId)
      callbacks.current.onPosition?.(waypoint)
    }
    const finish = () => {
      svg.current?.setAttribute('data-travelling', 'false')
      callbacks.current.onDone(last.waypoint)
    }
    const tick = (now: number) => {
      if (cancelled) return
      if (startedAt === null) startedAt = now
      const elapsed = reduced ? last.at : now - startedAt
      if (reduced) {
        draw(last.point.x, last.point.y, 0)
        report(last.waypoint)
        finish()
        return
      }
      while (arrived + 1 < journey.length && elapsed >= journey[arrived + 1].at) {
        arrived++
      }
      if (arrived >= journey.length - 1) {
        draw(last.point.x, last.point.y, 0)
        report(last.waypoint)
        finish()
        return
      }
      const a = journey[Math.max(0, arrived)]
      const b = journey[Math.max(0, arrived) + 1]
      const progress = Math.min(1, Math.max(0, (elapsed - a.at) / (b.at - a.at)))
      draw(a.point.x + (b.point.x - a.point.x) * progress, a.point.y + (b.point.y - a.point.y) * progress, b.point.x - a.point.x)
      report(homePositionBetween(stableLayout, a.waypoint, b.waypoint, progress))
      frame = requestAnimationFrame(tick)
    }
    svg.current?.setAttribute('data-travelling', 'true')
    frame = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [journey, stableLayout])

  const first = journey[0]
  if (!first) return null
  const initialFacing = journey[1] && journey[1].point.x < first.point.x ? 'translate(200 0) scale(-1 1)' : undefined
  return (
    <svg
      ref={svg}
      className="home-traveler"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
      height={layout.height}
      aria-hidden="true"
      focusable="false"
      data-testid="home-traveler"
      data-travel-room={first.waypoint.roomId}
      data-travelling="true"
      data-away={away}
    >
      <g ref={node} transform={`translate(${first.point.x - 100 * PET_SCALE} ${first.point.y - 182 * PET_SCALE}) scale(${PET_SCALE})`}>
        <g ref={facingNode} transform={initialFacing}>
          <g className="home-traveler-run">
            <CharacterArt
              species={pet.species}
              mood={mood}
              pose="idle"
              bodyColour={pet.bodyColour}
              equipped={pet.equipped}
              look={{ eyes: pet.eyes, cheeks: pet.cheeks }}
              strokeScale={PET_STROKE_SCALE}
            />
          </g>
        </g>
      </g>
    </svg>
  )
}
