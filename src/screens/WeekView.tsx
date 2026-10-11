import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ScreenHeader } from '../shell/ScreenHeader'
import { useWide } from '../shell/useViewport'
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

// Chart geometry, in viewBox units (the SVG scales to fit the space it is given).
// Each panel is 360 wide. On phones the two panels stack; on wide screens they sit
// side by side, so the week fits without scrolling in both.
const PW = 360
const PAD_L = 36
const PAD_R = 8
const COL_W = (PW - PAD_L - PAD_R) / 7
const BAR_W = 26
const DOT_R = 8
const GAP = 28

const TITLE_Y = 18
const PLOT_TOP = 34
/** Bars are scaled to at least this many chores so a single chore doesn't tower. */
const MIN_BAR_SCALE = 4

const centreX = (i: number) => PAD_L + COL_W * (i + 0.5)
/** Stagger index for the arrival animations (see WeekView.css). */
const step = (i: number) => ({ '--i': i }) as CSSProperties

// Plot heights: a sensible default, and the range the chart may stretch to when it has room.
const PLOT_DEFAULT = { stacked: 100, wide: 230 }
const PLOT_RANGE = { stacked: [64, 230], wide: [120, 400] } as const
/** Everything in the viewBox that isn't plot area. */
const FIXED_H = { stacked: 145, wide: 91 }

/** The plot height that makes the chart exactly fill a box of this shape (height over width). */
function plotFor(wide: boolean, aspect: number): number {
  const key = wide ? 'wide' : 'stacked'
  const vbWidth = wide ? PW * 2 + GAP : PW
  const share = wide ? 1 : 2
  const fit = (vbWidth * aspect - FIXED_H[key]) / share
  const [min, max] = PLOT_RANGE[key]
  return Math.round(Math.min(max, Math.max(min, fit)))
}

/** Vertical sizes for one layout; `plotH` is the height of each plot area. */
function layout(wide: boolean, plotH: number) {
  const barBase = PLOT_TOP + plotH
  const healthTop = PLOT_TOP + 8
  const healthBottom = PLOT_TOP + plotH + 8
  const panelH = healthBottom + 12
  const labelY = healthBottom + 26
  const awayY = labelY + 17
  const rowY = wide ? 0 : panelH // where the health panel starts
  const height = rowY + awayY + 6
  const xs = wide ? [0, PW + GAP] : [0]
  return {
    width: wide ? PW * 2 + GAP : PW,
    height,
    barBase,
    barMax: plotH - 22,
    healthTop,
    healthBottom,
    labelY,
    awayY,
    healthX: wide ? PW + GAP : 0,
    healthY: rowY,
    /** Left edge of each set of seven day columns (labels and today's band). */
    xs,
    bandTop: 26,
    bandBottom: height - 4,
  }
}

export function WeekView({ chores, completions, vacations, today, onClose }: WeekViewProps) {
  const wide = useWide()
  // Inside the app frame the chart stretches to the space it is given (no page scroll);
  // elsewhere it keeps its default shape.
  const plotRef = useRef<HTMLDivElement>(null)
  const [aspect, setAspect] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = plotRef.current
    if (!el || typeof ResizeObserver === 'undefined' || !el.closest('.screen')) return
    const read = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setAspect(height / width)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const model = useMemo(() => {
    const days = weekDays(today)
    const counts = completedPerDay(completions, days)
    const health = healthPerDay(chores, completions, vacations, days)
    const summary = weekSummary(days, counts, vacations)
    return { days, counts, health, summary }
  }, [chores, completions, vacations, today])

  const { days, counts, health, summary } = model
  const g = layout(wide, aspect === null ? PLOT_DEFAULT[wide ? 'wide' : 'stacked'] : plotFor(wide, aspect))
  const healthY = (value: number) => g.healthBottom - ((g.healthBottom - g.healthTop) * value) / 100
  const scale = Math.max(MIN_BAR_SCALE, ...counts)
  const last = health[health.length - 1]
  const ariaLabel = `${summary.line} Your pet ended the week at ${last.health} out of 100, feeling ${last.mood}.`
  const points = health.map((h, i) => `${centreX(i)},${healthY(h.health)}`).join(' ')

  return (
    <section className="wk screen-fit" aria-labelledby="wk-title">
      <ScreenHeader id="wk-title" title="Your week" onBack={onClose} />
      <p className="wk-summary">{summary.line}</p>

      <div className="wk-card">
        <div className="wk-plot" ref={plotRef}>
          <svg className="wk-chart" viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={ariaLabel}>
            {/* Column bands: vacation shading, then today's outline on top. */}
            {g.xs.map((x0) =>
              days.map((d, i) => {
                const away = health[i].away
                if (!away && !d.isToday) return null
                return (
                  <rect
                    key={`${x0}-${d.date}`}
                    x={x0 + PAD_L + COL_W * i + 2}
                    y={g.bandTop}
                    width={COL_W - 4}
                    height={g.bandBottom - g.bandTop}
                    rx={10}
                    fill={away ? PALETTE.sky : PALETTE.accent}
                    fillOpacity={away ? 0.4 : 0.12}
                    stroke={d.isToday ? PALETTE.accent : 'none'}
                    strokeWidth={2.5}
                  />
                )
              }),
            )}

            {/* Panel one: chores done. */}
            <text x={PAD_L} y={TITLE_Y} className="wk-panel-title">
              Chores done
            </text>
            <line x1={PAD_L} x2={PW - PAD_R} y1={g.barBase} y2={g.barBase} className="wk-axis" />
            {days.map((d, i) => {
              const n = counts[i]
              const h = (g.barMax * n) / scale
              return (
                <g key={d.date}>
                  {n > 0 && (
                    <rect
                      x={centreX(i) - BAR_W / 2}
                      y={g.barBase - h}
                      width={BAR_W}
                      height={h}
                      rx={7}
                      fill={PALETTE.accent}
                      stroke={PALETTE.ink}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      className="wk-bar"
                      style={step(i)}
                    />
                  )}
                  <text x={centreX(i)} y={g.barBase - h - 7} textAnchor="middle" className={n > 0 ? 'wk-count wk-fade' : 'wk-count wk-count-zero wk-fade'} style={step(i)}>
                    {n}
                  </text>
                </g>
              )
            })}

            {/* Panel two: health from 0 to 100. */}
            <g transform={`translate(${g.healthX} ${g.healthY})`}>
              <text x={PAD_L} y={TITLE_Y} className="wk-panel-title">
                Health
              </text>
              {[100, 50, 0].map((v) => (
                <g key={v}>
                  <line x1={PAD_L} x2={PW - PAD_R} y1={healthY(v)} y2={healthY(v)} className={v === 0 ? 'wk-axis' : 'wk-grid'} />
                  <text x={PAD_L - 7} y={healthY(v) + 4} textAnchor="end" className="wk-tick">
                    {v}
                  </text>
                </g>
              ))}
              <polyline className="wk-line" pathLength={1} points={points} fill="none" stroke={PALETTE.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
              {health.map((h, i) => (
                <circle key={h.date} cx={centreX(i)} cy={healthY(h.health)} r={DOT_R} fill={healthColour(h.health)} stroke={PALETTE.ink} strokeWidth={2.5} className="wk-dot" style={step(i)} />
              ))}
            </g>

            {/* Day labels: under the health panel, or under each panel when they sit side by side. */}
            {g.xs.map((x0) =>
              days.map((d, i) => (
                <g key={`${x0}-${d.date}`}>
                  <text x={x0 + centreX(i)} y={g.healthY + g.labelY} textAnchor="middle" className={d.isToday ? 'wk-day wk-day-today' : 'wk-day'}>
                    {d.label}
                  </text>
                  {health[i].away && (
                    <text x={x0 + centreX(i)} y={g.healthY + g.awayY} textAnchor="middle" className="wk-away">
                      away
                    </text>
                  )}
                </g>
              )),
            )}
          </svg>
        </div>

        <p className="wk-note">Dots show how your pet felt at the end of each day.</p>
      </div>

      <div className="sr-only">
        <table>
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
      </div>
    </section>
  )
}
