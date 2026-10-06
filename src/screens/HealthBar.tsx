import { useEffect, useState, type CSSProperties } from 'react'
import type { Mood } from '../domain/types'
import { healthColour } from './doneMoment'
import './HealthBar.css'

// The pet's health as a friendly bar. It fills toward leaf green as the home
// gets cleaner. When health goes up a small "+N" floats up beside it; when it
// goes down (a new day) it just settles.

export interface HealthBarProps {
  /** 0 to 100, from petCondition. */
  health: number
  mood: Mood
  /** On vacation nothing is due, so the bar rests. */
  away: boolean
}

const FLOAT_MS = 1400

export function HealthBar({ health, mood, away }: HealthBarProps) {
  // Compare with the last value during render so a rise shows its "+N" at once.
  const [seen, setSeen] = useState(health)
  const [gain, setGain] = useState<{ key: number; amount: number } | null>(null)
  if (health !== seen) {
    setSeen(health)
    if (health > seen) setGain({ key: (gain?.key ?? 0) + 1, amount: health - seen })
    else setGain(null)
  }

  useEffect(() => {
    if (!gain) return
    const t = window.setTimeout(() => setGain(null), FLOAT_MS)
    return () => window.clearTimeout(t)
  }, [gain])

  if (away) {
    return (
      <div className="hb hb-away">
        <div className="hb-track" aria-hidden="true">
          <div className="hb-fill" style={{ width: '100%' }} />
        </div>
        <p className="hb-text">On vacation</p>
      </div>
    )
  }

  const style = { width: `${health}%`, '--hb-colour': healthColour(health) } as CSSProperties

  return (
    <div className="hb">
      <div className="hb-track" role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={health} aria-valuetext={`${health} out of 100, feeling ${mood}`}>
        <div className="hb-fill" style={style} />
      </div>
      <div className="hb-row">
        <p className="hb-text">Feeling {mood}</p>
        {gain && (
          <span key={gain.key} className="hb-gain" aria-hidden="true">
            +{gain.amount}
          </span>
        )}
      </div>
    </div>
  )
}
