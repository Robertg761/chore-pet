import { useEffect, useState, useSyncExternalStore } from 'react'
import { weekdayOf } from '../domain/dates'
import { devToday, getDayOffset, setDayOffset, subscribeDayOffset } from '../lib/devClock'
import './TimePanel.css'

// Hidden time fast-forward for recording the demo. Open with ?dev (remembered
// for the session) or by long-pressing the very top-left corner of the screen.

const SESSION_KEY = 'chore-pet:dev'
const CORNER_PX = 48
const LONG_PRESS_MS = 900
const MOVE_SLOP_PX = 10

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Tue 6 Oct" */
function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${WEEKDAYS[weekdayOf(iso)]} ${d} ${MONTHS[m - 1]}`
}

function formatOffset(days: number): string {
  const n = Math.abs(days)
  return `${days > 0 ? '+' : '-'}${n} ${n === 1 ? 'day' : 'days'}`
}

function readEnabled(): boolean {
  try {
    if (new URLSearchParams(location.search).has('dev')) {
      sessionStorage.setItem(SESSION_KEY, '1')
      return true
    }
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return new URLSearchParams(location.search).has('dev')
  }
}

function remember(on: boolean) {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, '1')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Session storage is blocked; the panel just will not survive a reload.
  }
}

const STEPS: { label: string; days: number }[] = [
  { label: '-1 day', days: -1 },
  { label: '+1 day', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
]

export default function TimePanel() {
  const [enabled, setEnabled] = useState(readEnabled)
  const [open, setOpen] = useState(true)
  const offset = useSyncExternalStore(subscribeDayOffset, getDayOffset)

  // Long-press on the top-left corner. A document listener, so no invisible
  // element sits over the app and taps there behave as normal.
  useEffect(() => {
    let timer: number | undefined
    let start: { x: number; y: number } | null = null
    const cancel = () => {
      window.clearTimeout(timer)
      start = null
    }
    const onDown = (e: PointerEvent) => {
      if (e.clientX >= CORNER_PX || e.clientY >= CORNER_PX) return
      start = { x: e.clientX, y: e.clientY }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        start = null
        remember(true)
        setEnabled(true)
        setOpen(true)
      }, LONG_PRESS_MS)
    }
    const onMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_SLOP_PX) cancel()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', cancel)
    document.addEventListener('pointercancel', cancel)
    return () => {
      cancel()
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', cancel)
      document.removeEventListener('pointercancel', cancel)
    }
  }, [])

  if (!enabled) return null

  const date = formatDate(devToday())
  const shifted = offset !== 0

  if (!open) {
    return (
      <div className="time-panel time-panel-pill">
        <button type="button" className="time-pill" onClick={() => setOpen(true)} aria-label={`Open time panel. ${date}${shifted ? `, ${formatOffset(offset)}` : ''}`}>
          {shifted ? formatOffset(offset) : 'Time'}
        </button>
      </div>
    )
  }

  return (
    <section className="time-panel" aria-label="Time travel">
      <header className="time-head">
        <div className="time-date" aria-live="polite">
          <strong>{date}</strong>
          {shifted && <span className="time-offset">{formatOffset(offset)}</span>}
        </div>
        <button type="button" className="time-icon" onClick={() => setOpen(false)} aria-label="Collapse time panel">
          _
        </button>
        <button
          type="button"
          className="time-icon"
          onClick={() => {
            remember(false)
            setEnabled(false)
          }}
          aria-label="Close time panel"
        >
          x
        </button>
      </header>
      <div className="time-grid">
        {STEPS.map((s) => (
          <button key={s.label} type="button" className="time-btn" onClick={() => setDayOffset(offset + s.days)}>
            {s.label}
          </button>
        ))}
        <button type="button" className="time-btn time-btn-wide" onClick={() => setDayOffset(0)} disabled={!shifted}>
          Back to today
        </button>
      </div>
    </section>
  )
}

