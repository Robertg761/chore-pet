import { useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { catalogEntry } from '../catalog/objects'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { ACTION_MS } from '../character/motion'
import { AFFECTION_LINES, CAUGHT_UP_LINES, CHECK_IN_LINES, DANCE_LINES, GREETING_LINES, HOP_LINES, MOOD_LINES, REST_LINES, STRETCH_LINES, TAP_LINES, VACATION_LINES, calmObjectLine, doneLine, messLine, objectLine, pickLine } from '../content/petLines'
import { messiestObject } from '../domain/mess'
import type { NeglectLevel } from '../domain/neglect'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore, MessStage, Mood, Pet, PlacedObject, Room as RoomRow } from '../domain/types'
import { objectOverdue } from '../room/cuePlan'
import { footprintOf, freeTile, overlaps, tilesOf } from '../room/grid'
import { Room } from '../room/Room'
import { SceneContext } from '../room/sceneContext'
import { petObstacles } from './obstacles'
import { PET_STROKE_SCALE, ROOM_WIDTH, petTransform } from '../room/shell/geometry'
import { play } from '../audio/sfx'
import { blendProgress, initialPet, needsRender, positionAt, react, routeAt, sortTile, step, tap, visitObject, type PetState, type PlayerGesture, type Tile, type World } from './behaviour'
import { motionFor } from './activityMotion'
import { interactionTargets } from './interactions'
import { usePetMotion } from './usePetMotion'
import { usePetVisibility } from './usePetVisibility'
import { faceAttention, pointerPosition, sampleAttention, type AttentionPoint, type AttentionSample } from './playerAttention'
import { bubbleSpot, bubbleStyle, objectBoxes, type Box, type BubbleSize } from './bubble'
import './LivingRoom.css'

// The pet approaches room objects, pauses to interact, and responds to the player.
//
// A shared clock samples character motion every frame. It only
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
  /** Consume a cheer so revisiting the home cannot replay it. */
  onCelebrated?: (key: number) => void
  initialTile?: Tile
  onPosition?: (tile: Tile) => void
  /** Effects in room coordinates, drawn over everything (e.g. a sparkle on the object just cleaned). */
  overlay?: ReactNode
  /** Optional player invitation, sharing this resident's clock and state. */
  control?: Ref<LivingRoomControl>
}

export type VisitResult = 'started' | 'still' | 'busy' | 'resting' | 'unreachable' | 'unavailable'
export type PlayerResponseResult = 'started' | 'busy' | 'resting' | 'unavailable'
export interface LivingRoomControl {
  lookAt: (objectId: string) => VisitResult
  respond: (action: PlayerGesture) => PlayerResponseResult
  /** A gaze-only hello while resting, with the existing600ms notice deadline. */
  checkIn: () => PlayerResponseResult
  /** Show a stationary furnishing marker without changing pet activity. */
  preview: (objectId: string | null) => void
}

const PLAYER_LINES: Record<PlayerGesture, string[]> = { greet: GREETING_LINES, affection: AFFECTION_LINES, hop: HOP_LINES, stretch: STRETCH_LINES, rest: REST_LINES, dance: DANCE_LINES }

function objectDialogue({ objects, stages, neglect, chores }: Pick<LivingRoomProps, 'objects' | 'stages' | 'neglect' | 'chores'>, objectId: string, seed: number): string | null {
  const target = objects.find(object => object.id === objectId)
  const entry = target && catalogEntry(target.catalogId)
  if (!target || !entry) return null
  const chore = chores.find(item => item.objectId === target.id)
  const level = neglect?.[target.id] ?? 0
  const stage = Object.prototype.hasOwnProperty.call(stages, target.id) ? stages[target.id] ?? 'clean' : 'clean'
  return level > 0 || stage !== 'clean'
    ? messLine(entry.mess, level, seed) || objectLine(entry.id, chore?.name ?? '', seed)
      || calmObjectLine(entry.id, seed) || pickLine(MOOD_LINES.content, seed)
    : calmObjectLine(entry.id, seed) || pickLine(MOOD_LINES.content, seed)
}

const LINE_MS = 3600

interface MotionControl { paint: (state: PetState, now: number) => void; reduced: boolean }
interface PlayerAttention { pointer: AttentionPoint | null; focused: boolean; reset: boolean }

/** Only this subtree redraws for breathing, gait and finite reaction frames. */
function RoomPetArt({ pet, mood, away, live, tick, control, attention, nodeRef }: {
  pet: Pet; mood: Mood; away: boolean
  live: RefObject<Shown>
  tick: (now: number, reduced: boolean) => void
  control: RefObject<MotionControl | null>
  attention: RefObject<PlayerAttention>
  nodeRef: RefObject<SVGGElement | null>
}) {
  const inView = usePetVisibility(nodeRef)
  const [sample, setSample] = useState(() => ({ state: live.current.state, now: performance.now(), attention: { x: 0, y: 0 } }))
  const gaze = useRef<AttentionSample | null>(null)
  const attentionSource = useRef<AttentionPoint | 'focus' | null>(null)
  const finite = (sample.state.activity.kind === 'react' && sample.now < sample.state.activity.until)
    || (sample.state.noticeStart !== undefined && sample.now < sample.state.noticeStart + ACTION_MS.notice)
  const blending = sample.state.transition && blendProgress(sample.state.transition.start, sample.now) < 1
  const { reducedMotion } = usePetMotion(tick, {
    normal: inView && ((!away && mood !== 'sick') || finite || Boolean(blending)),
    reduced: inView && finite,
  })
  useImperativeHandle(control, () => ({ paint: (state, now) => {
    const still = !inView || reducedMotion || away || mood === 'sick' || attention.current.reset
    const idle = state.activity.kind === 'idle' && (!state.transition || blendProgress(state.transition.start, now) >= 1)
    if (still || !idle) attention.current.pointer = null
    const source = !still && idle ? attention.current.pointer ?? (attention.current.focused ? 'focus' : null) : null
    const localTarget = source === 'focus' ? { x: 0, y: -1.5 } : source
      ? faceAttention(source, pet.species, mood, motionFor(state, now, pet.species, mood, false).frame, state.facing) : null
    // Keep the easing snapshot in the outer x-axis. A facing change during
    // release must not reflect an outgoing cue to the other side of the room.
    const target = localTarget ? { x: localTarget.x * state.facing, y: localTarget.y } : null
    gaze.current = sampleAttention(gaze.current, target, now, still, source !== attentionSource.current)
    attentionSource.current = source
    attention.current.reset = false
    setSample({ state, now, attention: gaze.current.value })
  }, reduced: reducedMotion }), [reducedMotion, away, mood, pet.species, attention, inView])
  useLayoutEffect(() => {
    // Preference and suppression changes apply before paint, including while hidden.
    tick(performance.now(), reducedMotion)
  }, [tick, reducedMotion, inView])
  const frame = motionFor(sample.state, sample.now, pet.species, mood, reducedMotion).frame
  frame.gazeX += sample.attention.x * sample.state.facing
  frame.gazeY += sample.attention.y
  return <AnimatedCharacterArt species={pet.species} mood={mood} pose={away ? 'sleeping' : undefined}
    frame={frame} bodyColour={pet.bodyColour} equipped={pet.equipped}
    look={{ eyes: pet.eyes, cheeks: pet.cheeks }} strokeScale={PET_STROKE_SCALE} />
}

function advanceState(state: PetState, world: World, now: number, reduced: boolean): PetState {
  // Still validate occupancy/suppression, but never choose an ambient action in reduced motion.
  const quiet = reduced ? { ...world, interactions: [], mess: null } : world
  const waiting = reduced && state.activity.kind === 'idle'
    ? { ...state, activity: { ...state.activity, until: Infinity } } : state
  const next = step(waiting, quiet, now, reduced ? () => 0.99 : Math.random)
  if (next === waiting && waiting !== state) return state
  if (!reduced || !['walk', 'interact', 'look'].includes(next.activity.kind)) return next
  const route = routeAt(next, now)
  return { ...next, tile: route.tile, position: positionAt(next, now), resume: route.segment ?? next.resume,
    activity: { kind: 'idle', start: now, until: now }, transition: undefined, beat: next.beat + 1 }
}

/** Write the bubble's spot straight to its element (custom properties need setProperty). */
function placeBubble(node: HTMLElement | null, style: ReturnType<typeof bubbleStyle>) {
  if (!node) return
  node.style.left = style.left
  node.style.top = style.top
  node.style.setProperty('--tail-x', style['--tail-x'])
}

/** What the room last drew: the pet's state and where it stood then. */
interface Shown {
  state: PetState
  pos: Tile
  /** Hold the opening dialogue seed through orient, action and settle. */
  interactionBeat?: number
}

/** A line the pet says. `heard`: the player caused it (a tap, a chore done), so screen readers hear it too. */
interface Said {
  text: string
  heard: boolean
}

export function LivingRoom({ room, objects, stages, neglect, pet, mood, away, chores, statuses, celebrate, onCelebrated, initialTile, onPosition, overlay, control }: LivingRoomProps) {
  const scene = useContext(SceneContext)
  const solid = useMemo(() => petObstacles(objects, stages), [objects, stages])
  const messiest = messiestObject(chores, statuses)
  const messObject = messiest && objects.find((o) => o.id === messiest.objectId)
  const messEntry = messObject && catalogEntry(messObject.catalogId)
  const overdue = useMemo(() => objectOverdue(chores, statuses), [chores, statuses])

  const mess = useMemo(
    () => (messObject && messEntry ? { objectId: messObject.id, tiles: tilesOf(footprintOf(messObject, messEntry)) } : null),
    [messObject, messEntry],
  )
  const free = useCallback((t: Tile) => !solid.some((f) => overlaps(f, { tx: t.tx, ty: t.ty, w: 1, d: 1 })), [solid])
  const interactions = useMemo(() => interactionTargets(objects, free, stages), [objects, free, stages])
  const world = useMemo<World>(() => ({ free, mood, away, mess, interactions }), [free, mood, away, mess, interactions])

  const [shown, setShown] = useState<Shown>(() => {
    const state = initialPet(initialTile ?? freeTile(solid) ?? { tx: 3, ty: 3 }, performance.now())
    // A resting first mount has no previously visible motion to blend out.
    if (away) state.activity = { kind: 'sleep' }
    else if (mood === 'sick') state.activity = { kind: 'sick' }
    return { state, pos: state.tile }
  })
  const [said, setSaid] = useState<Said | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  // The live state, ahead of `shown` while the pet walks.
  const live = useRef<Shown>(shown)
  const motion = useRef<MotionControl | null>(null)
  const attention = useRef<PlayerAttention>({ pointer: null, focused: false, reset: false })
  const invitation = useRef<{ objectId: string; announced: boolean } | null>(null)
  const petNode = useRef<SVGGElement>(null)
  const bubbleNode = useRef<HTMLParagraphElement>(null)
  const reportPosition = useRef(onPosition)
  useEffect(() => { reportPosition.current = onPosition }, [onPosition])
  const roomNode = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        attention.current.pointer = null
        attention.current.reset = true
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  // What the bubble steers clear of, and how big it is (room px), so it can sit off the furniture.
  const boxes = useMemo<Box[]>(() => objectBoxes(objects), [objects])
  const bubbleBoxes = useRef(boxes)
  const bubbleSize = useRef<BubbleSize>({ w: 120, h: 34 })
  useEffect(() => {
    bubbleBoxes.current = boxes
  }, [boxes])
  const bubbleAt = useCallback((pos: Tile) => bubbleStyle(bubbleSpot(pos, bubbleSize.current, bubbleBoxes.current)), [])

  /** Move to a new state: draw its position now, and re-render only when the picture changes. */
  const advance = useCallback((next: PetState, t: number) => {
    const prev = live.current
    const pos = positionAt(next, t)
    const interactionBeat = next.activity.kind === 'interact'
      ? prev.state.activity.kind === 'interact' && prev.state.activity.target === next.activity.target
        ? prev.interactionBeat : next.beat
      : undefined
    live.current = { state: next, pos, interactionBeat }
    motion.current?.paint(next, t)
    reportPosition.current?.(pos)
    petNode.current?.setAttribute('transform', petTransform(pos))
    placeBubble(bubbleNode.current, bubbleAt(pos))
    const tile = sortTile(pos)
    const drawn = sortTile(prev.pos)
    if (needsRender(prev.state, next) || tile.tx !== drawn.tx || tile.ty !== drawn.ty) setShown(live.current)
  }, [bubbleAt])

  const tick = useCallback((now: number, reduced: boolean) => {
    advance(advanceState(live.current.state, world, now, reduced), now)
  }, [advance, world])

  useImperativeHandle(control, () => ({ preview: setPreviewId, respond: action => {
    if (away || mood === 'sick') return 'resting'
    const now = performance.now()
    const current = advanceState(live.current.state, world, now, motion.current?.reduced ?? false)
    if (current.activity.kind === 'react' && now < current.activity.until) return 'busy'
    invitation.current = null
    attention.current.pointer = null
    const next = react(current, now, action)
    advance(next, now)
    play('chirp')
    setSaid({ text: pickLine(PLAYER_LINES[action], next.beat), heard: true })
    return 'started'
  }, checkIn: () => {
    if (!away && mood !== 'sick') return 'unavailable'
    const now = performance.now()
    const current = advanceState(live.current.state, world, now, motion.current?.reduced ?? false)
    if (current.noticeStart !== undefined && now < current.noticeStart + ACTION_MS.notice) return 'busy'
    invitation.current = null
    attention.current.pointer = null
    const next = react(current, now, 'tap')
    advance(next, now)
    play('chirp')
    setSaid({ text: pickLine(CHECK_IN_LINES, next.beat), heard: true })
    return 'started'
  }, lookAt: objectId => {
    if (away || mood === 'sick') return 'resting'
    if (!objects.some(object => object.id === objectId && catalogEntry(object.catalogId))) return 'unreachable'
    const now = performance.now(), reduced = motion.current?.reduced ?? false
    const current = advanceState(live.current.state, world, now, reduced)
    if (current.activity.kind === 'react' && now < current.activity.until) return 'busy'
    if (reduced) {
      invitation.current = null
      advance(current, now)
      const text = objectDialogue({ objects, stages, neglect, chores }, objectId, current.beat)
      if (text) setSaid({ text, heard: true })
      return 'still'
    }
    const next = visitObject(current, world, objectId, now)
    if (!next) return 'unreachable'
    if (next !== current || invitation.current?.objectId !== objectId) {
      invitation.current = { objectId, announced: false }
      attention.current.pointer = null
      setSaid(null)
      if (next.activity.kind === 'interact') {
        invitation.current.announced = true
        const seed = next === current ? live.current.interactionBeat ?? next.beat : next.beat
        const text = objectDialogue({ objects, stages, neglect, chores }, objectId, seed)
        if (text) setSaid({ text, heard: true })
      }
    }
    advance(next, now)
    return 'started'
  } }))

  // A line stays up for a few seconds.
  useEffect(() => {
    if (!said) return
    const timer = window.setTimeout(() => setSaid(null), LINE_MS)
    return () => window.clearTimeout(timer)
  }, [said])

  // Cheer for a finished chore.
  const celebrated = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!celebrate || celebrate.key === celebrated.current) return
    celebrated.current = celebrate.key
    invitation.current = null
    const now = performance.now()
    const current = advanceState(live.current.state, world, now, motion.current?.reduced ?? false)
    advance(react(current, now, celebrate.big ? 'celebrate-big' : 'celebrate'), now)
    setSaid({ text: doneLine(celebrate.key, celebrate.choreName, celebrate), heard: true })
    onCelebrated?.(celebrate.key)
  }, [celebrate, advance, onCelebrated, world])

  function onTap() {
    invitation.current = null
    play('chirp')
    const t = performance.now()
    const current = advanceState(live.current.state, world, t, motion.current?.reduced ?? false)
    const next = tap(current, t)
    advance(next, t)
    const lines = away ? VACATION_LINES : mood === 'sick' || mood === 'scruffy' ? MOOD_LINES[mood] : TAP_LINES
    setSaid({ text: pickLine(lines, next.beat), heard: true })
  }

  const { state, pos } = shown

  // What the pet is saying: something you just did, the mess it is looking at, or now and then how it feels.
  const a = state.activity
  let line: string | null = null
  if (said) line = said.text
  else if (a.kind === 'interact') {
    const seed = shown.interactionBeat ?? state.beat
    line = objectDialogue({ objects, stages, neglect, chores }, a.target.objectId, seed)
  } else if (a.kind === 'look' && messiest && messObject && messEntry) {
    // A smelly or dusty thing gets a line about the smell or dust every other look; otherwise the object's own line.
    const level = neglect?.[messObject.id] ?? 0
    line = (state.beat % 2 === 0 && messLine(messEntry.mess, level, state.beat)) || objectLine(messEntry.id, messiest.chore.name, state.beat) || null
  } else if (a.kind === 'idle' && state.beat % 4 === 0 && state.beat > 0 && !away) {
    const caughtUp = chores.length > 0 && !statuses.some((s) => s.state === 'overdue' || s.state === 'due')
    line = pickLine(caughtUp && state.beat % 8 === 0 ? CAUGHT_UP_LINES : MOOD_LINES[mood], state.beat)
  }

  // An explicit invitation makes one observation audible at arrival. Automatic
  // exploration stays quiet; interruptions discard the pending invitation.
  useEffect(() => {
    const requested = invitation.current
    if (!requested) return
    const { objectId } = requested
    if (a.kind === 'interact' && a.target.objectId === objectId) {
      if (!requested.announced) {
        requested.announced = true
        const text = objectDialogue({ objects, stages, neglect, chores }, objectId, shown.interactionBeat ?? state.beat)
        if (text) setSaid({ text, heard: true })
      }
    } else if (a.kind !== 'walk' || a.target?.objectId !== objectId) invitation.current = null
  }, [a, objects, stages, neglect, chores, shown.interactionBeat, state.beat])

  // Measure the bubble once its words are in, so it can find a spot clear of the furniture before it is seen.
  useLayoutEffect(() => {
    const node = bubbleNode.current
    const frame = roomNode.current
    if (!node || !frame || !frame.clientWidth) return
    const scale = ROOM_WIDTH / frame.clientWidth
    bubbleSize.current = { w: node.offsetWidth * scale, h: node.offsetHeight * scale }
    bubbleBoxes.current = boxes
    placeBubble(node, bubbleAt(live.current.pos))
  })

  return (
    <div className="living-room" ref={roomNode}>
      <Room
        room={room}
        objects={objects}
        stages={stages}
        neglect={neglect}
        overdue={overdue}
        selectedId={away || mood === 'sick' ? null : previewId}
        selectionMode="preview"
        className="home-room"
        overlay={overlay}
        pet={{
          tile: pos,
          facing: state.facing,
          label: `${pet.name}, feeling ${mood}. Tap to say hi.`,
          onTap,
          attention: {
            onPointerMove: (event) => {
              if (event.pointerType === 'touch') return
              attention.current.pointer = pointerPosition(event.clientX, event.clientY, event.currentTarget.getScreenCTM?.() ?? null)
            },
            onPointerLeave: () => { attention.current.pointer = null },
            onPointerCancel: () => { attention.current.pointer = null },
            onFocus: () => { attention.current.focused = true },
            onBlur: () => { attention.current.focused = false },
          },
          nodeRef: petNode,
          art: <RoomPetArt pet={pet} mood={mood} away={away} live={live} tick={tick} control={motion} attention={attention} nodeRef={petNode} />,
        }}
      />
      {line && (scene?.bubbleContainer ? createPortal(
        <p className="home-scene-bubble">{line}</p>,
        scene.bubbleContainer,
      ) : (
        <p className="pet-bubble" ref={bubbleNode}>
          {line}
        </p>
      ))}
      {/* Only what the player caused is announced; ambient chatter and mess-gazing stay visual. */}
      <p className="visually-hidden" aria-live="polite">
        {said?.heard ? said.text : ''}
      </p>
    </div>
  )
}
