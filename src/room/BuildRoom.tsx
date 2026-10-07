import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import type { NeglectLevel } from '../domain/neglect'
import type { MessStage, PlacedObject, Room as RoomRow } from '../domain/types'
import { checkPlacement, findFreeSpot, screenToTile, snapDrag, turned, type Placement, type PlacementProblem } from './grid'
import { lookup } from './placement'
import { Room } from './Room'
import { objectNames, objectsBackToFront } from './roomSummary'
import './BuildRoom.css'

// Build mode: drag things around the room and drop in new ones from the tray.
// - Tap an object to select it; drag it to move (it snaps to tiles, and wall
//   things slide along the walls). It only moves if it fits.
// - A new object from the tray appears where it fits first; drag it or tap a
//   spot, turn it, then "Place it".
// - Keyboard: with nothing selected, Left/Right (or [ and ]) step through the
//   things in the room, back to front. With one selected, arrows move it, R
//   turns it, Enter opens its card, Escape deselects. While placing a new
//   thing, arrows move it, R turns, Enter places, Escape cancels.

export type BuildChange = { kind: 'add'; entry: CatalogEntry; placement: Placement } | { kind: 'move'; id: string; placement: Placement }

export interface BuildRoomProps {
  room: Pick<RoomRow, 'floorStyle' | 'wallStyle'>
  objects: PlacedObject[]
  stages?: Record<string, MessStage>
  /** Neglect level per object, so the cues show while arranging the room too. */
  neglect?: Record<string, NeglectLevel>
  pet?: { tile: { tx: number; ty: number }; art: ReactNode } | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** The catalog entry picked from the tray, or null. */
  placing: CatalogEntry | null
  onCommit: (change: BuildChange) => void
  /** Called when a pick from the tray is placed or cancelled. */
  onPlacingDone: () => void
  /** Days late per object (objectOverdue() in ./cuePlan), to pick which cues show in full. */
  overdue?: Record<string, number>
  /**
   * Enter on a selected object: move focus to its card. Without it, focus goes
   * to the first control in the open `.sheet`.
   */
  onOpen?: (id: string) => void
}

interface Drag {
  pointerId: number
  /** The placed object being moved, or null for the new object from the tray. */
  id: string | null
  entry: CatalogEntry
  start: { x: number; y: number }
  moved: boolean
}

const PROBLEM_TEXT: Record<PlacementProblem, string> = {
  outside: "That's outside the room.",
  needsWall: 'This one goes against a wall.',
  window: "That's where the window is.",
  overlap: "Something's in the way.",
}


const KEYS_HINT = 'Arrows move, R turns, Enter opens, Escape deselects.'

function focusSheet() {
  const sheet = document.querySelector<HTMLElement>('.sheet')
  const target = sheet?.querySelector<HTMLElement>('button:not(.sheet-close), input, select, textarea, [tabindex="0"]')
  target?.focus()
}

export function BuildRoom({ room, objects, stages, neglect, overdue, pet, selectedId, onSelect, placing, onCommit, onPlacingDone, onOpen }: BuildRoomProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const roomRef = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const names = useMemo(() => objectNames(objects), [objects])
  // Announced when the keyboard picks something; tapping shows its card instead.
  const [keyed, setKeyed] = useState(false)
  const [pending, setPending] = useState<{ entry: CatalogEntry; placement: Placement } | null>(null)
  const [moving, setMoving] = useState<{ id: string; entry: CatalogEntry; placement: Placement } | null>(null)
  const drag = useRef<Drag | null>(null)

  // A new pick from the tray appears at the first spot it fits. (The tray
  // only offers things that fit somewhere: see `fitsSomewhere` in ./placement.)
  const [picked, setPicked] = useState<CatalogEntry | null>(null)
  if (placing !== picked) {
    setPicked(placing)
    const spot = placing && findFreeSpot(placing, objects, lookup)
    setPending(placing && spot ? { entry: placing, placement: spot } : null)
  }

  // Picking from the tray moves focus to the room, so the arrows move the new thing.
  useEffect(() => {
    if (picked) roomRef.current?.focus()
  }, [picked])

  const check = (entry: CatalogEntry, placement: Placement, movingId?: string) => checkPlacement(entry, placement, objects, lookup, movingId)

  function toTile(e: PointerEvent): { tx: number; ty: number } | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return screenToTile(p.x, p.y)
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    const target = (e.target as Element).closest('[data-object-id]')
    const id = target?.getAttribute('data-object-id') ?? null
    if (pending) {
      drag.current = { pointerId: e.pointerId, id: null, entry: pending.entry, start: { x: e.clientX, y: e.clientY }, moved: false }
    } else if (id) {
      const obj = objects.find((o) => o.id === id)
      const entry = obj && catalogEntry(obj.catalogId)
      if (!obj || !entry) return
      drag.current = { pointerId: e.pointerId, id, entry, start: { x: e.clientX, y: e.clientY }, moved: false }
    } else {
      onSelect(null)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (!d.moved && Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) < 6) return
    d.moved = true
    const tile = toTile(e)
    if (!tile) return
    if (d.id === null && pending) {
      setPending({ entry: d.entry, placement: snapDrag(d.entry, tile.tx, tile.ty, pending.placement.rotation) })
    } else if (d.id) {
      const current = moving?.placement ?? objects.find((o) => o.id === d.id)
      setMoving({ id: d.id, entry: d.entry, placement: snapDrag(d.entry, tile.tx, tile.ty, current?.rotation ?? 0) })
    }
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (!d.id) {
      // A tap (no drag) while placing puts the new thing where you tapped.
      const tile = toTile(e)
      if (!d.moved && pending && tile) setPending({ entry: pending.entry, placement: snapDrag(pending.entry, tile.tx, tile.ty, pending.placement.rotation) })
      return
    }
    if (!d.moved) {
      setKeyed(false)
      onSelect(d.id)
    } else if (moving && check(moving.entry, moving.placement, moving.id).ok) {
      onCommit({ kind: 'move', id: moving.id, placement: moving.placement })
      onSelect(moving.id)
    }
    setMoving(null)
  }

  function place() {
    if (!pending || !check(pending.entry, pending.placement).ok) return
    onCommit({ kind: 'add', entry: pending.entry, placement: pending.placement })
    setPending(null)
    onPlacingDone()
  }

  function cancel() {
    setPending(null)
    onPlacingDone()
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
    const step = steps[e.key]
    const selected = objects.find((o) => o.id === selectedId)
    const selectedEntry = selected && catalogEntry(selected.catalogId)
    const cycle = e.key === 'ArrowRight' || e.key === ']' ? 1 : e.key === 'ArrowLeft' || e.key === '[' ? -1 : 0

    if (pending) {
      if (step) setPending({ ...pending, placement: { ...pending.placement, tileX: pending.placement.tileX + step[0], tileY: pending.placement.tileY + step[1] } })
      else if (e.key === 'r' || e.key === 'R') setPending({ ...pending, placement: turned(pending.entry, pending.placement) })
      else if (e.key === 'Enter') place()
      else if (e.key === 'Escape') cancel()
      else return
    } else if (cycle !== 0 && (!selected || e.key === '[' || e.key === ']')) {
      const order = objectsBackToFront(objects)
      if (!order.length) return
      const at = order.findIndex((o) => o.id === selectedId)
      const next = at < 0 ? (cycle > 0 ? 0 : order.length - 1) : (at + cycle + order.length) % order.length
      setKeyed(true)
      onSelect(order[next].id)
    } else if (selected && selectedEntry) {
      if (step) {
        const next = { tileX: selected.tileX + step[0], tileY: selected.tileY + step[1], rotation: selected.rotation }
        if (check(selectedEntry, next, selected.id).ok) onCommit({ kind: 'move', id: selected.id, placement: next })
      } else if (e.key === 'r' || e.key === 'R') {
        const next = turned(selectedEntry, selected)
        if (check(selectedEntry, next, selected.id).ok) onCommit({ kind: 'move', id: selected.id, placement: next })
      } else if (e.key === 'Enter') {
        if (onOpen) onOpen(selected.id)
        else focusSheet()
      } else if (e.key === 'Escape') onSelect(null)
      else return
    } else return
    e.preventDefault()
  }

  const ghostSource = pending ?? moving
  const ghostCheck = ghostSource && check(ghostSource.entry, ghostSource.placement, moving?.id)
  const ghost = ghostSource && ghostCheck ? { entry: ghostSource.entry, placement: ghostSource.placement, ok: ghostCheck.ok } : null
  const problem = ghostCheck && !ghostCheck.ok && ghostCheck.problem ? PROBLEM_TEXT[ghostCheck.problem] : ''
  const selectedName = selectedId && !ghost ? names[selectedId] : undefined
  const hint = !problem && keyed && selectedName ? `${selectedName} selected. ${KEYS_HINT}` : ''

  return (
    <div
      className="build-room"
      ref={roomRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-roledescription="room editor"
      aria-label="Your room"
      aria-describedby={helpId}
    >
      <p id={helpId} className="build-room-help">
        Tap a thing to select it and drag to move it. With the keyboard, Left and Right arrows pick a thing; then arrows move it, R turns it, Enter opens it
        and Escape lets go.
      </p>
      <Room
        room={room}
        objects={objects}
        stages={stages}
        neglect={neglect}
        overdue={overdue}
        pet={pet}
        selectedId={selectedId}
        ghost={ghost}
        hiddenId={moving?.id}
        svgRef={svgRef}
        className="build-room-svg"
        svgProps={{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => ((drag.current = null), setMoving(null)) }}
      />
      <p className="build-room-status" role="status">
        {problem}
        {/* What the keyboard just picked: read out, not shown (the chevron and its card show it). */}
        {hint && <span className="build-room-help">{hint}</span>}
      </p>
      {pending && (
        // data-unsaved: a reload now would drop this placement (see UpdateBanner).
        <div className="build-room-actions" data-unsaved>
          <button type="button" className="build-btn build-btn-primary" onClick={place} disabled={!ghost?.ok}>
            Place it
          </button>
          <button type="button" className="build-btn" onClick={() => setPending({ ...pending, placement: turned(pending.entry, pending.placement) })}>
            Turn
          </button>
          <button type="button" className="build-btn" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
