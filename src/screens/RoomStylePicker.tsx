import { PALETTE } from '../art/palette'
import { UNLOCKS, isUnlocked } from '../domain/unlocks'
import type { Progress } from '../domain/types'
import { FLOOR_STYLES, WALL_STYLES, type FloorStyle, type WallStyle } from '../room/shell/styles'
import '../shell/controls.css'
import './RoomStylePicker.css'
import { requirementLabel } from './rewardsModel'

// Walls and floor for the room. The starting styles are always there; the
// rest are rewards (src/domain/unlocks.ts) and show how to earn them.

export interface RoomStylePickerProps {
  wallStyle: string
  floorStyle: string
  progress: Progress | null
  onChange: (patch: { wallStyle?: string; floorStyle?: string }) => void
}

function WallSwatch({ s }: { s: WallStyle }) {
  return (
    <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true">
      <path d="M2 6 L20 2 L20 26 L2 22 Z" fill={s.left} stroke={PALETTE.ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 2 L38 6 L38 22 L20 26 Z" fill={s.right} stroke={PALETTE.ink} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/** Alternate cells of a 4x4 grid on the swatch diamond. */
const MOSAIC_CELLS = (() => {
  const at = (i: number, j: number) => `${20 + (i - j) * 4.5} ${4 + (i + j) * 2.5}`
  const cells: string[] = []
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 1) cells.push(`M${at(i, j)} L${at(i + 1, j)} L${at(i + 1, j + 1)} L${at(i, j + 1)} Z`)
  return cells.join(' ')
})()

function FloorSwatch({ s }: { s: FloorStyle }) {
  return (
    <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true">
      <path d="M20 4 L38 14 L20 24 L2 14 Z" fill={s.top} stroke={PALETTE.ink} strokeWidth="2" strokeLinejoin="round" />
      {s.pattern === 'mosaic' && <path d={MOSAIC_CELLS} fill={s.alt} />}
      {s.pattern === 'checker' && <path d="M20 4 L29 9 L20 14 L11 9 Z M20 14 L29 19 L20 24 L11 19 Z" fill={s.alt} />}
      {s.pattern === 'rug' && <path d="M20 8 L31 14 L20 20 L9 14 Z" fill="none" stroke={s.alt} strokeWidth="2" />}
      {s.pattern === 'planks' && <path d="M11 9 L29 19 M15 7 L33 17" stroke={s.edgeLeft} strokeWidth="1" opacity="0.5" />}
    </svg>
  )
}

/** A small padlock beside the requirement. */
function Lock() {
  return (
    <svg className="rsp-lock" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M4.5 7 V5 a3.5 3.5 0 0 1 7 0 V7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="2.5" y="7" width="11" height="7.5" rx="2" fill="currentColor" />
    </svg>
  )
}

/** "2-day streak" for a locked style, from the same rule that unlocks it. */
function requirementFor(id: string): string | null {
  const rule = UNLOCKS.find((u) => u.id === id)?.rule
  return rule ? requirementLabel(rule) : null
}

export function RoomStylePicker({ wallStyle, floorStyle, progress, onChange }: RoomStylePickerProps) {
  const option = (kind: 'wall' | 'floor', s: WallStyle | FloorStyle, selected: boolean, onPick: () => void) => {
    const id = `${kind}:${s.id}`
    const open = isUnlocked(progress, id)
    const need = open ? null : requirementFor(id)
    return (
      <button key={s.id} type="button" className="rsp-option choice" aria-pressed={selected} disabled={!open} onClick={onPick}>
        {kind === 'wall' ? <WallSwatch s={s as WallStyle} /> : <FloorSwatch s={s as FloorStyle} />}
        <span className="rsp-name">{s.label}</span>
        {!open && (
          <span className="rsp-need" title={need ?? undefined}>
            <Lock />
            <span className="sr-only">Locked: {need ?? 'surprise'}</span>
            {/* "21 days" fits a small tile; the full "21-day streak" is read out and shown on hover. */}
            <span aria-hidden="true">{need ? need.replace(/^(\d+)-day streak$/, '$1 days') : 'surprise'}</span>
          </span>
        )}
      </button>
    )
  }
  return (
    <section className="rsp" aria-label="Room style">
      <fieldset className="rsp-group">
        <legend>Walls</legend>
        {WALL_STYLES.map((s) => option('wall', s, wallStyle === s.id, () => onChange({ wallStyle: s.id })))}
      </fieldset>
      <fieldset className="rsp-group">
        <legend>Floor</legend>
        {FLOOR_STYLES.map((s) => option('floor', s, floorStyle === s.id, () => onChange({ floorStyle: s.id })))}
      </fieldset>
    </section>
  )
}
