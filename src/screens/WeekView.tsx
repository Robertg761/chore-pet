import { useMemo } from 'react'
import { PALETTE } from '../art/palette'
import type { Chore, Completion, ISODate, VacationWindow } from '../domain/types'
import { healthColour } from './doneMoment'
import { completedPerDay, healthPerDay, weekDays, weekSummary } from './weekModel'
import './WeekView.css'

// The last seven days at a glance. Two small panels share the same seven
// columns so each keeps one honest scale: bars for chores done (from zero) and
// dots for the pet's health (0 to 100). Vacation days are shaded and today is
// outlined.

export interface WeekViewProps {
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
  today: ISODate
  onClose?: () => void
}

// Chart geometry, in viewBox units (the SVG scales to the card's width).
const W = 360
const H = 352
const PAD_L = 36
const PAD_R = 8
const COL_W = (W - PAD_L - PAD_R) / 7
const BAR_W = 26
const DOT_R = 8

const BARS_TITLE_Y = 18
const BAR_BASE_Y = 130
const BAR_MAX_H = 74
/** Bars are scaled to at least this many chores so a single chore doesn't tower. */
const MIN_BAR_SCALE = 4

const HEALTH_TITLE_Y = 166
const HEALTH_TOP_Y = 190 // health 100
const HEALTH_BOTTOM_Y = 290 // health 0
const LABEL_Y = 326
const AWAY_Y = 343

const BAND_TOP = 26
const BAND_BOTTOM = 348

const centreX = (i: number) => PAD_L + COL_W * (i + 0.5)
const healthY = (health: number) => HEALTH_BOTTOM_Y - ((HEALTH_BOTTOM_Y - HEALTH_TOP_Y) * health) / 100

export function WeekView({ chores, completions, vacations, today, onClose }: WeekViewProps) {
  const model = useMemo(() => {
    const days = weekDays(today)
    const counts = completedPerDay(completions, days)
    const health = healthPerDay(chores, completions, vacations, days)
    const summary = weekSummary(days, counts, vacations)
    return { days, counts, health, summary }
  }, [chores, completions, vacations, today])

  const { days, counts, health, summary } = model
  const scale = Math.max(MIN_BAR_SCALE, ...counts)
  const last = health[health.length - 1]
  const ariaLabel = `${summary.line} Your pet ended the week at ${last.health} out of 100, feeling ${last.mood}.`
  const points = health.map((h, i) => `${centreX(i)},${healthY(h.health)}`).join(' ')

  return (
    <section className="wk" aria-labelledby="wk-title">
      <div className="wk-head">
        <h2 id="wk-title" className="wk-title">
          This week
        </h2>
        {onClose && (
          <button type="button" className="wk-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <p className="wk-summary">{summary.line}</p>

      <svg className="wk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {/* Column bands: vacation shading, then today's outline on top. */}
        {days.map((d, i) => {
          const away = health[i].away
          if (!away && !d.isToday) return null
          return (
            <rect
              key={d.date}
              x={PAD_L + COL_W * i + 2}
              y={BAND_TOP}
              width={COL_W - 4}
              height={BAND_BOTTOM - BAND_TOP}
              rx={10}
              fill={away ? PALETTE.sky : PALETTE.accent}
              fillOpacity={away ? 0.4 : 0.12}
              stroke={d.isToday ? PALETTE.accent : 'none'}
              strokeWidth={2.5}
            />
          )
        })}

        {/* Panel one: chores done. */}
        <text x={PAD_L} y={BARS_TITLE_Y} className="wk-panel-title">
          Chores done
        </text>
        <line x1={PAD_L} x2={W - PAD_R} y1={BAR_BASE_Y} y2={BAR_BASE_Y} className="wk-axis" />
        {days.map((d, i) => {
          const n = counts[i]
          const h = (BAR_MAX_H * n) / scale
          return (
            <g key={d.date}>
              {n > 0 && (
                <rect
                  x={centreX(i) - BAR_W / 2}
                  y={BAR_BASE_Y - h}
                  width={BAR_W}
                  height={h}
                  rx={7}
                  fill={PALETTE.accent}
                  stroke={PALETTE.ink}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              )}
              <text x={centreX(i)} y={BAR_BASE_Y - h - 7} textAnchor="middle" className={n > 0 ? 'wk-count' : 'wk-count wk-count-zero'}>
                {n}
              </text>
            </g>
          )
        })}

        {/* Panel two: health from 0 to 100. */}
        <text x={PAD_L} y={HEALTH_TITLE_Y} className="wk-panel-title">
          Health
        </text>
        {[100, 50, 0].map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={healthY(v)} y2={healthY(v)} className={v === 0 ? 'wk-axis' : 'wk-grid'} />
            <text x={PAD_L - 7} y={healthY(v) + 4} textAnchor="end" className="wk-tick">
              {v}
            </text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke={PALETTE.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
        {health.map((h, i) => (
          <circle key={h.date} cx={centreX(i)} cy={healthY(h.health)} r={DOT_R} fill={healthColour(h.health)} stroke={PALETTE.ink} strokeWidth={2.5} />
        ))}

        {/* Day labels. */}
        {days.map((d, i) => (
          <g key={d.date}>
            <text x={centreX(i)} y={LABEL_Y} textAnchor="middle" className={d.isToday ? 'wk-day wk-day-today' : 'wk-day'}>
              {d.label}
            </text>
            {health[i].away && (
              <text x={centreX(i)} y={AWAY_Y} textAnchor="middle" className="wk-away">
                away
              </text>
            )}
          </g>
        ))}
      </svg>

      <p className="wk-note">Dots show how your pet felt at the end of each day.</p>

      <table className="wk-sr">
        <caption>Chores done and health for the last seven days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Chores done</th>
            <th scope="col">Health out of 100</th>
            <th scope="col">Feeling</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.date}>
              <th scope="row">{d.long}</th>
              <td>{counts[i]}</td>
              <td>{health[i].health}</td>
              <td>{health[i].mood}</td>
              <td>{[d.isToday ? 'Today' : '', health[i].away ? 'Away' : ''].filter(Boolean).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
