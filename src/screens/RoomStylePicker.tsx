import { PALETTE } from '../art/palette'
import { isUnlocked } from '../domain/unlocks'
import type { Progress } from '../domain/types'
import { FLOOR_STYLES, WALL_STYLES, type FloorStyle, type WallStyle } from '../room/shell/styles'
import './RoomStylePicker.css'

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

function FloorSwatch({ s }: { s: FloorStyle }) {
  return (
    <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true">
      <path d="M20 4 L38 14 L20 24 L2 14 Z" fill={s.top} stroke={PALETTE.ink} strokeWidth="2" strokeLinejoin="round" />
      {s.pattern === 'checker' && <path d="M20 4 L29 9 L20 14 L11 9 Z M20 14 L29 19 L20 24 L11 19 Z" fill={s.alt} />}
      {s.pattern === 'rug' && <path d="M20 8 L31 14 L20 20 L9 14 Z" fill="none" stroke={s.alt} strokeWidth="2" />}
      {s.pattern === 'planks' && <path d="M11 9 L29 19 M15 7 L33 17" stroke={s.edgeLeft} strokeWidth="1" opacity="0.5" />}
    </svg>
  )
}

export function RoomStylePicker({ wallStyle, floorStyle, progress, onChange }: RoomStylePickerProps) {
  return (
    <section className="rsp" aria-label="Room style">
      <fieldset className="rsp-group">
        <legend>Walls</legend>
        {WALL_STYLES.map((s) => {
          const open = isUnlocked(progress, `wall:${s.id}`)
          return (
            <button
              key={s.id}
              type="button"
              className="rsp-option"
              aria-pressed={wallStyle === s.id}
              disabled={!open}
              title={open ? s.label : `${s.label}: earn it with a streak`}
              onClick={() => onChange({ wallStyle: s.id })}
            >
              <WallSwatch s={s} />
              <span>{open ? s.label : 'Locked'}</span>
            </button>
          )
        })}
      </fieldset>
      <fieldset className="rsp-group">
        <legend>Floor</legend>
        {FLOOR_STYLES.map((s) => {
          const open = isUnlocked(progress, `floor:${s.id}`)
          return (
            <button
              key={s.id}
              type="button"
              className="rsp-option"
              aria-pressed={floorStyle === s.id}
              disabled={!open}
              title={open ? s.label : `${s.label}: earn it with a streak`}
              onClick={() => onChange({ floorStyle: s.id })}
            >
              <FloorSwatch s={s} />
              <span>{open ? s.label : 'Locked'}</span>
            </button>
          )
        })}
      </fieldset>
    </section>
  )
}
