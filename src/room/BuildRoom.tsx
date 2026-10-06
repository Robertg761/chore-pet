import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import type { MessStage, PlacedObject, Room as RoomRow } from '../domain/types'
import { checkPlacement, findFreeSpot, screenToTile, snapDrag, turned, type Placement, type PlacementProblem } from './grid'
import { lookup } from './placement'
import { Room } from './Room'
import './BuildRoom.css'

// Build mode: drag things around the room and drop in new ones from the tray.
// - Tap an object to select it; drag it to move (it snaps to tiles, and wall
//   things slide along the walls). It only moves if it fits.
// - A new object from the tray appears where it fits first; drag it or tap a
//   spot, turn it, then "Place it".
// - Keyboard: arrows move, R turns, Enter places, Escape cancels.

export type BuildChange = { kind: 'add'; entry: CatalogEntry; placement: Placement } | { kind: 'move'; id: string; placement: Placement }

export interface BuildRoomProps {
  room: Pick<RoomRow, 'floorStyle' | 'wallStyle'>
  objects: PlacedObject[]
  stages?: Record<string, MessStage>
  pet?: { tile: { tx: number; ty: number }; art: ReactNode } | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** The catalog entry picked from the tray, or null. */
  placing: CatalogEntry | null
  onCommit: (change: BuildChange) => void
  /** Called when a pick from the tray is placed or cancelled. */
  onPlacingDone: () => void
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
  overlap: "Something's in the way.",
}


export function BuildRoom({ room, objects, stages, pet, selectedId, onSelect, placing, onCommit, onPlacingDone }: BuildRoomProps) {
  const svgRef = useRef<SVGSVGElement>(null)
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

    if (pending) {
      if (step) setPending({ ...pending, placement: { ...pending.placement, tileX: pending.placement.tileX + step[0], tileY: pending.placement.tileY + step[1] } })
      else if (e.key === 'r' || e.key === 'R') setPending({ ...pending, placement: turned(pending.entry, pending.placement) })
      else if (e.key === 'Enter') place()
      else if (e.key === 'Escape') cancel()
      else return
    } else if (selected && selectedEntry) {
      if (step) {
        const next = { tileX: selected.tileX + step[0], tileY: selected.tileY + step[1], rotation: selected.rotation }
        if (check(selectedEntry, next, selected.id).ok) onCommit({ kind: 'move', id: selected.id, placement: next })
      } else if (e.key === 'r' || e.key === 'R') {
        const next = turned(selectedEntry, selected)
        if (check(selectedEntry, next, selected.id).ok) onCommit({ kind: 'move', id: selected.id, placement: next })
      } else if (e.key === 'Escape') onSelect(null)
      else return
    } else return
    e.preventDefault()
  }

  const ghostSource = pending ?? moving
  const ghostCheck = ghostSource && check(ghostSource.entry, ghostSource.placement, moving?.id)
  const ghost = ghostSource && ghostCheck ? { entry: ghostSource.entry, placement: ghostSource.placement, ok: ghostCheck.ok } : null
  const status = ghostCheck && !ghostCheck.ok && ghostCheck.problem ? PROBLEM_TEXT[ghostCheck.problem] : ''

  return (
    <div
      className="build-room"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Your room. Tap a thing to select it, drag to move. Arrow keys move, R turns."
    >
      <Room
        room={room}
        objects={objects}
        stages={stages}
        pet={pet}
        selectedId={selectedId}
        ghost={ghost}
        hiddenId={moving?.id}
        svgRef={svgRef}
        className="build-room-svg"
        svgProps={{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => ((drag.current = null), setMoving(null)) }}
      />
      <p className="build-room-status" role="status">
        {status}
      </p>
      {pending && (
        <div className="build-room-actions">
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
