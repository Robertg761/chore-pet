import { useEffect, useState, type CSSProperties } from 'react'
import type { Mood } from '../domain/types'
import { PALETTE } from '../art/palette'
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
  /** Days in a row (currentStreak). Shown beside the mood from one day up; a missing streak shows nothing. */
  streak?: number
}

const FLOAT_MS = 1400

/** What shows for a mood. The pet is never "sick" to the person; it's just feeling poorly. */
const MOOD_FEELING: Record<Mood, string> = {
  happy: 'happy',
  content: 'content',
  meh: 'meh',
  scruffy: 'scruffy',
  sick: 'poorly',
}

/** A small flame, in the same thick outline as the rest of the art. */
function Flame() {
  return (
    <svg className="hb-flame" viewBox="0 0 20 24" width="15" height="18" aria-hidden="true" focusable="false">
      <path
        d="M10 2c1 4 6 6.500 6 12a6 6 0 0 1-12 0c0-3 1.500-4.500 3-6 .3 2 1.300 3 2.500 3.300C9 9 8.500 5.500 10 2z"
        fill={PALETTE.warmRed}
        stroke={PALETTE.ink}
        strokeWidth="2.200"
        strokeLinejoin="round"
      />
      <path d="M10 13.500c1.300 1.200 2.300 2.300 2.300 3.800a2.300 2.300 0 0 1-4.600 0c0-1.300.9-2.300 2.300-3.800z" fill={PALETTE.petDefault} />
    </svg>
  )
}

/** A flame and the day count beside the mood: the run that rewards count, kept in sight. */
function StreakChip({ days, pop }: { days: number; pop: boolean }) {
  return (
    <span className={pop ? 'hb-streak hb-streak-pop' : 'hb-streak'} title={`${days}-day streak`}>
      <Flame />
      <span aria-hidden="true">{days === 1 ? '1 day' : `${days} days`}</span>
      <span className="sr-only">{days === 1 ? 'Streak: 1 day' : `Streak: ${days} days in a row`}</span>
    </span>
  )
}

export function HealthBar({ health, mood, away, streak = 0 }: HealthBarProps) {
  // Compare with the last value during render so a rise shows its "+N" at once.
  const [seen, setSeen] = useState(health)
  const [gain, setGain] = useState<{ key: number; amount: number } | null>(null)
  if (health !== seen) {
    setSeen(health)
    if (health > seen) setGain({ key: (gain?.key ?? 0) + 1, amount: health - seen })
    else setGain(null)
  }

  // The streak chip gives a little pop when the count goes up, but not when it is simply shown.
  const [seenStreak, setSeenStreak] = useState(streak)
  const [popKey, setPopKey] = useState(0)
  if (streak !== seenStreak) {
    setSeenStreak(streak)
    if (streak > seenStreak) setPopKey(popKey + 1)
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
        <div className="hb-row">
          <p className="hb-text">On vacation</p>
          {streak > 0 && <StreakChip key={popKey} days={streak} pop={popKey > 0} />}
        </div>
      </div>
    )
  }

  const style = { width: `${health}%`, '--hb-colour': healthColour(health) } as CSSProperties

  return (
    <div className="hb">
      <div className="hb-track" role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={health} aria-valuetext={`${health} out of 100, feeling ${MOOD_FEELING[mood]}`}>
        <div className="hb-fill" style={style} />
      </div>
      <div className="hb-row">
        {/* The "+N" floats up from the end of the mood, clear of the streak. */}
        <span className="hb-mood">
          <p className="hb-text">Feeling {MOOD_FEELING[mood]}</p>
          {gain && (
            <span key={gain.key} className="hb-gain" aria-hidden="true">
              +{gain.amount}
            </span>
          )}
        </span>
        {streak > 0 && <StreakChip key={popKey} days={streak} pop={popKey > 0} />}
      </div>
    </div>
  )
}
