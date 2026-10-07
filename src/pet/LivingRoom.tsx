import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogEntry } from '../catalog/objects'
import { CharacterArt } from '../character/Character'
import { CAUGHT_UP_LINES, MOOD_LINES, TAP_LINES, VACATION_LINES, doneLine, messLine, objectLine, pickLine } from '../content/petLines'
import { messiestObject } from '../domain/mess'
import type { NeglectLevel } from '../domain/neglect'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore, MessStage, Mood, Pet, PlacedObject, Room as RoomRow } from '../domain/types'
import { objectOverdue } from '../room/cuePlan'
import { footprintOf, freeTile, overlaps, tilesOf, type Footprint } from '../room/grid'
import { PET_SCALE, Room } from '../room/Room'
import { PET_STROKE_SCALE, ROOM_VIEWBOX, petTransform, roomPoint } from '../room/shell/geometry'
import { play } from '../audio/sfx'
import { initialPet, needsRender, positionAt, poseFor, sortTile, step, tap, type PetState, type Tile, type World } from './behaviour'
import './LivingRoom.css'

// The home screen's room with the pet living in it: it wanders, goes and looks
// at the messiest thing and says something kind about it, and cheers when you
// tap it or finish a chore.
//
// The behaviour loop runs every animation frame while the pet walks. It only
// re-renders the room when the pet starts something new (needsRender) or steps
// onto another tile for depth sorting; in between, it slides the pet and its
// speech bubble by writing their positions directly.

export interface Celebration {
  /** Changes for each new celebration. */
  key: number
  choreName: string
  /** The chore had piled up (neglect level 3), so the cheer is a bigger one. */
  big?: boolean
  /** The first chore done today. */
  first?: boolean
}

export interface LivingRoomProps {
  room: Pick<RoomRow, 'floorStyle' | 'wallStyle'>
  objects: PlacedObject[]
  stages: Record<string, MessStage>
  /** Neglect level per object: the cues that float over late objects. */
  neglect?: Record<string, NeglectLevel>
  pet: Pet
  mood: Mood
  away: boolean
  chores: Chore[]
  statuses: ChoreStatus[]
  /** Set when a chore was just completed: the pet cheers and says so. */
  celebrate?: Celebration | null
  /** Effects in room coordinates, drawn over everything (e.g. a sparkle on the object just cleaned). */
  overlay?: ReactNode
}

const LINE_MS = 3600

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Where the speech bubble goes over the pet, as percentages of the room picture. */
function bubbleSpot(pos: Tile) {
  const head = roomPoint(pos.tx + 0.5, pos.ty + 0.5)
  const vb = ROOM_VIEWBOX
  return {
    // Kept away from the edges so the bubble never slides off the room.
    left: `${Math.min(72, Math.max(28, ((head.x - vb.x) / vb.width) * 100))}%`,
    // Clear of the top of the pet's head, so the tail points at it without covering it.
    top: `${((head.y - 190 * PET_SCALE - vb.y) / vb.height) * 100}%`,
  }
}

/** What the room last drew: the pet's state and where it stood then. */
interface Shown {
  state: PetState
  pos: Tile
}

/** A line the pet says. `heard`: the player caused it (a tap, a chore done), so screen readers hear it too. */
interface Said {
  text: string
  heard: boolean
}

export function LivingRoom({ room, objects, stages, neglect, pet, mood, away, chores, statuses, celebrate, overlay }: LivingRoomProps) {
  const solid = useMemo<Footprint[]>(
    () =>
      objects.flatMap((o) => {
        const e = catalogEntry(o.catalogId)
        return e && e.layer === 'solid' ? [footprintOf(o, e)] : []
      }),
    [objects],
  )
  const messiest = messiestObject(chores, statuses)
  const messObject = messiest && objects.find((o) => o.id === messiest.objectId)
  const messEntry = messObject && catalogEntry(messObject.catalogId)
  const overdue = useMemo(() => objectOverdue(chores, statuses), [chores, statuses])

  const mess = useMemo(
    () => (messObject && messEntry ? { objectId: messObject.id, tiles: tilesOf(footprintOf(messObject, messEntry)) } : null),
    [messObject, messEntry],
  )

  const [shown, setShown] = useState<Shown>(() => {
    const state = initialPet(freeTile(solid) ?? { tx: 3, ty: 3 }, performance.now())
    return { state, pos: state.tile }
  })
  const [said, setSaid] = useState<Said | null>(null)

  // The live state, ahead of `shown` while the pet walks.
  const live = useRef<Shown>(shown)
  const petNode = useRef<SVGGElement>(null)
  const bubbleNode = useRef<HTMLParagraphElement>(null)

  // The loop reads the latest world through a ref, synced after each render.
  const world = useRef<World>({ free: () => true, mood, away, mess: null })
  useEffect(() => {
    world.current = { free: (t: Tile) => !solid.some((f) => overlaps(f, { tx: t.tx, ty: t.ty, w: 1, d: 1 })), mood, away, mess }
  })

  /** Move to a new state: draw its position now, and re-render only when the picture changes. */
  const advance = useCallback((next: PetState, t: number) => {
    const prev = live.current
    const pos = positionAt(next, t)
    live.current = { state: next, pos }
    petNode.current?.setAttribute('transform', petTransform(pos))
    const bubble = bubbleNode.current
    if (bubble) Object.assign(bubble.style, bubbleSpot(pos))
    const tile = sortTile(pos)
    const drawn = sortTile(prev.pos)
    if (needsRender(prev.state, next) || tile.tx !== drawn.tx || tile.ty !== drawn.ty) setShown(live.current)
  }, [])

  // The behaviour loop: every animation frame while walking, otherwise a few times a second.
  useEffect(() => {
    const reduced = prefersReducedMotion()
    // With reduced motion the pet never wanders: a random source of 0.99 always picks idle.
    const rand = reduced ? () => 0.99 : Math.random
    let frame = 0
    let timer = 0
    const tick = () => {
      const t = performance.now()
      advance(step(live.current.state, world.current, t, rand), t)
      schedule()
    }
    const schedule = () => {
      if (live.current.state.activity.kind === 'walk') frame = requestAnimationFrame(tick)
      else timer = window.setTimeout(tick, 250)
    }
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [advance])

  // A line stays up for a few seconds.
  useEffect(() => {
    if (!said) return
    const timer = window.setTimeout(() => setSaid(null), LINE_MS)
    return () => window.clearTimeout(timer)
  }, [said])

  // Cheer for a finished chore.
  const celebrated = useRef(celebrate?.key)
  useEffect(() => {
    if (!celebrate || celebrate.key === celebrated.current) return
    celebrated.current = celebrate.key
    advance(tap(live.current.state, performance.now()), performance.now())
    setSaid({ text: doneLine(celebrate.key, celebrate.choreName, celebrate), heard: true })
  }, [celebrate, advance])

  function onTap() {
    play('chirp')
    const t = performance.now()
    const next = tap(live.current.state, t)
    advance(next, t)
    const lines = away ? VACATION_LINES : mood === 'sick' || mood === 'scruffy' ? MOOD_LINES[mood] : TAP_LINES
    setSaid({ text: pickLine(lines, next.beat), heard: true })
  }

  const { state, pos } = shown

  // What the pet is saying: something you just did, the mess it is looking at, or now and then how it feels.
  const a = state.activity
  let line: string | null = null
  if (said) line = said.text
  else if (a.kind === 'look' && messiest && messObject && messEntry) {
    // A smelly or dusty thing gets a line about the smell or dust every other look; otherwise the object's own line.
    const level = neglect?.[messObject.id] ?? 0
    line = (state.beat % 2 === 0 && messLine(messEntry.mess, level, state.beat)) || objectLine(messEntry.id, messiest.chore.name, state.beat) || null
  } else if (a.kind === 'idle' && state.beat % 4 === 0 && state.beat > 0 && !away) {
    const caughtUp = chores.length > 0 && !statuses.some((s) => s.state === 'overdue')
    line = pickLine(caughtUp && state.beat % 8 === 0 ? CAUGHT_UP_LINES : MOOD_LINES[mood], state.beat)
  }

  // The same element while nothing about the pet's look changes, so React skips redrawing it.
  const pose = poseFor(state)
  const { species, bodyColour, equipped, eyes, cheeks } = pet
  const art = useMemo(
    () => <CharacterArt species={species} mood={mood} pose={pose} bodyColour={bodyColour} equipped={equipped} look={{ eyes, cheeks }} strokeScale={PET_STROKE_SCALE} />,
    [species, mood, pose, bodyColour, equipped, eyes, cheeks],
  )

  return (
    <div className="living-room">
      <Room
        room={room}
        objects={objects}
        stages={stages}
        neglect={neglect}
        overdue={overdue}
        className="home-room"
        overlay={overlay}
        pet={{
          tile: pos,
          facing: state.facing,
          label: `${pet.name}, feeling ${mood}. Tap to say hi.`,
          onTap,
          nodeRef: petNode,
          art,
        }}
      />
      {line && (
        <p className="pet-bubble" ref={bubbleNode} style={bubbleSpot(pos)}>
          {line}
        </p>
      )}
      {/* Only what the player caused is announced; ambient chatter and mess-gazing stay visual. */}
      <p className="visually-hidden" aria-live="polite">
        {said?.heard ? said.text : ''}
      </p>
    </div>
  )
}
