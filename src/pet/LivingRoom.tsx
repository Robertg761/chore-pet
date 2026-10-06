import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogEntry } from '../catalog/objects'
import { CharacterArt } from '../character/Character'
import { DONE_LINES, MOOD_LINES, OBJECT_LINES, TAP_LINES, VACATION_LINES, pickLine } from '../content/petLines'
import { messiestObject } from '../domain/mess'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore, MessStage, Mood, Pet, PlacedObject, Room as RoomRow } from '../domain/types'
import { footprintOf, freeTile, overlaps, tilesOf, type Footprint } from '../room/grid'
import { PET_SCALE, Room } from '../room/Room'
import { ROOM_VIEWBOX, roomPoint } from '../room/shell/geometry'
import { initialPet, positionAt, poseFor, step, tap, type PetState, type Tile, type World } from './behaviour'
import './LivingRoom.css'

// The home screen's room with the pet living in it: it wanders, goes and looks
// at the messiest thing and says something kind about it, and cheers when you
// tap it or finish a chore.

export interface Celebration {
  /** Changes for each new celebration. */
  key: number
  choreName: string
}

export interface LivingRoomProps {
  room: Pick<RoomRow, 'floorStyle' | 'wallStyle'>
  objects: PlacedObject[]
  stages: Record<string, MessStage>
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

export function LivingRoom({ room, objects, stages, pet, mood, away, chores, statuses, celebrate, overlay }: LivingRoomProps) {
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

  const mess = useMemo(
    () => (messObject && messEntry ? { objectId: messObject.id, tiles: tilesOf(footprintOf(messObject, messEntry)) } : null),
    [messObject, messEntry],
  )

  const [state, setState] = useState<PetState>(() => initialPet(freeTile(solid) ?? { tx: 3, ty: 3 }, performance.now()))
  const [now, setNow] = useState(() => performance.now())
  const [said, setSaid] = useState<{ text: string; until: number } | null>(null)

  // The loop reads the latest world and state through refs, synced after each render.
  const world = useRef<World>({ free: () => true, mood, away, mess: null })
  const walking = useRef(false)
  useEffect(() => {
    world.current = { free: (t: Tile) => !solid.some((f) => overlaps(f, { tx: t.tx, ty: t.ty, w: 1, d: 1 })), mood, away, mess }
    walking.current = state.activity.kind === 'walk'
  })

  // The behaviour loop: every animation frame while walking, otherwise a few times a second.
  useEffect(() => {
    const reduced = prefersReducedMotion()
    // With reduced motion the pet never wanders: a random source of 0.99 always picks idle.
    const rand = reduced ? () => 0.99 : Math.random
    let frame = 0
    let timer = 0
    const tick = () => {
      const t = performance.now()
      setState((s) => step(s, world.current, t, rand))
      setNow(t)
      schedule()
    }
    const schedule = () => {
      if (walking.current) frame = requestAnimationFrame(tick)
      else timer = window.setTimeout(tick, 250)
    }
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [])

  // Cheer for a finished chore (adjusting state when the prop changes, during render).
  const [celebrated, setCelebrated] = useState(celebrate?.key)
  if (celebrate && celebrate.key !== celebrated) {
    setCelebrated(celebrate.key)
    setState((s) => tap(s, now))
    setSaid({ text: pickLine(DONE_LINES, celebrate.key, { chore: celebrate.choreName }), until: now + LINE_MS })
  }

  function onTap() {
    const t = performance.now()
    const next = tap(state, t)
    setState(next)
    const lines = away ? VACATION_LINES : mood === 'sick' || mood === 'scruffy' ? MOOD_LINES[mood] : TAP_LINES
    setSaid({ text: pickLine(lines, next.beat), until: t + LINE_MS })
  }

  // What the pet is saying: something you just did, the mess it is looking at, or now and then how it feels.
  const a = state.activity
  let line: string | null = null
  if (said && said.until > now) line = said.text
  else if (a.kind === 'look' && messiest && messEntry) line = pickLine(OBJECT_LINES[messEntry.id] ?? [], state.beat, { chore: messiest.chore.name })
  else if (a.kind === 'idle' && state.beat % 4 === 0 && state.beat > 0 && !away) line = pickLine(MOOD_LINES[mood], state.beat)

  const pos = positionAt(state, now)

  // Bubble position over the pet's head, as a percentage of the room picture.
  const head = roomPoint(pos.tx + 0.5, pos.ty + 0.5)
  const vb = ROOM_VIEWBOX
  // Kept away from the edges so the bubble never slides off the room.
  const bubbleLeft = Math.min(72, Math.max(28, ((head.x - vb.x) / vb.width) * 100))
  const bubbleTop = ((head.y - 150 * PET_SCALE - vb.y) / vb.height) * 100

  return (
    <div className="living-room">
      <Room
        room={room}
        objects={objects}
        stages={stages}
        className="home-room"
        overlay={overlay}
        pet={{
          tile: pos,
          facing: state.facing,
          label: `${pet.name}, feeling ${mood}. Tap to say hi.`,
          onTap,
          art: <CharacterArt species={pet.species} mood={mood} pose={poseFor(state)} bodyColour={pet.bodyColour} equipped={pet.equipped} />,
        }}
      />
      {line && (
        <p className="pet-bubble" style={{ left: `${bubbleLeft}%`, top: `${bubbleTop}%` }}>
          {line}
        </p>
      )}
      <p className="visually-hidden" aria-live="polite">
        {line ?? ''}
      </p>
    </div>
  )
}
