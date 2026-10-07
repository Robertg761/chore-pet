import { useId, useMemo, useState } from 'react'
import { CharacterArt } from '../character/Character'
import { ITEMS } from '../character/items'
import { currentStreak, isUnlocked, UNLOCKS, type Unlock } from '../domain/unlocks'
import type { Chore, Completion, Pet, Progress, VacationWindow } from '../domain/types'
import { ScreenHeader } from '../shell/ScreenHeader'
import { RewardArt } from './RewardArt'
import './RewardsScreen.css'
import { STREAK_RULE, hasRewardArt, nextLines, nextUpId, requirementLabel, withEquipped, type NextLine } from './rewardsModel'

export interface RewardsScreenProps {
  pet: Pet
  progress: Progress | null
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
  today: string
  /** The outfit to save after wearing or taking off an item. */
  onEquip: (equipped: Pet['equipped']) => void
  /** Not used: this is a tab, so the tab bar is the way out. */
  onBack?: () => void
}

type Group = 'dress' | 'home'
const GROUPS: { group: Group; label: string; has: (u: Unlock) => boolean }[] = [
  { group: 'dress', label: 'Dress-up', has: (u) => u.kind === 'item' },
  { group: 'home', label: 'For your home', has: (u) => u.kind !== 'item' },
]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function NextCard({ line, label }: { line: NextLine; label: string }) {
  const id = useId()
  return (
    <li className="rewards-next">
      <p className="rewards-next-text" id={id}>
        {line.text}
      </p>
      <div
        className="rewards-bar"
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={line.total}
        aria-valuenow={line.done}
        aria-valuetext={`${line.done} of ${line.total} ${label}`}
      >
        <div className="rewards-bar-fill" style={{ width: `${Math.round(line.fraction * 100)}%` }} />
      </div>
    </li>
  )
}

export function RewardsScreen({ pet, progress, chores, completions, vacations, today, onEquip }: RewardsScreenProps) {
  const titleId = useId()
  const [group, setGroup] = useState<Group>('dress')
  // Replays the home's whole history, so not again on every tab switch.
  const streak = useMemo(() => currentStreak(chores, completions, today, vacations), [chores, completions, today, vacations])
  const best = Math.max(progress?.bestStreak ?? 0, streak)
  const choreCount = progress?.choreCount ?? 0
  const next = progress ? nextLines(progress, streak) : { chores: null, streak: null }
  const earned = UNLOCKS.filter((x) => isUnlocked(progress, x.id))
  const upNext = progress ? nextUpId(progress, streak) : null

  function tile(unlock: Unlock) {
    const got = earned.includes(unlock)
    const item = unlock.kind === 'item' ? ITEMS.find((i) => i.id === unlock.ref) : undefined
    const worn = Boolean(item && pet.equipped[item.slot] === item.id)
    const isNext = !got && unlock.id === upNext
    return (
      <li key={unlock.id} className={`rewards-tile${got ? '' : ' rewards-tile-locked'}${isNext ? ' rewards-tile-next' : ''}`}>
        <RewardArt unlock={unlock} pet={pet} locked={!got} className="rewards-tile-art" />
        {got ? (
          <>
            <span className="rewards-tile-name">{unlock.name}</span>
            {item ? (
              <button
                type="button"
                className={worn ? 'btn btn-sm rewards-wear' : 'btn btn-sm btn-primary rewards-wear'}
                aria-label={`${worn ? 'Take off' : 'Put on'} ${unlock.name}`}
                onClick={() => onEquip(withEquipped(pet.equipped, item.slot, worn ? null : item.id))}
              >
                {worn ? 'Take off' : 'Put on'}
              </button>
            ) : (
              <span className="rewards-tile-meta">{hasRewardArt(unlock) ? (unlock.kind === 'decor' ? 'Find it in Build' : unlock.kind === 'item' ? 'Coming soon' : 'Change it in Build') : 'Coming soon'}</span>
            )}
          </>
        ) : (
          <>
            <span className="rewards-tile-name">
              <span className="sr-only">{isNext ? 'Next up. Locked gift. ' : 'Locked gift. '}</span>
              {requirementLabel(unlock.rule)}
            </span>
            <span className="rewards-tile-meta">A surprise</span>
          </>
        )}
      </li>
    )
  }

  const grid = ({ group: g, label, has }: (typeof GROUPS)[number]) => {
    const list = UNLOCKS.filter(has)
    return (
      <section key={g} className="rewards-group" aria-labelledby={`${titleId}-${g}`}>
        <h2 id={`${titleId}-${g}`} className="sr-only">
          {label}
        </h2>
        <ul className="rewards-grid" tabIndex={0} aria-label={label}>
          {list.map(tile)}
        </ul>
      </section>
    )
  }

  return (
    <section className="rewards screen-fit" aria-labelledby={titleId}>
      <ScreenHeader id={titleId} title="Rewards" />

      <div className="rewards-body">
        <div className="rewards-side">
          <div className="rewards-head">
            <svg className="rewards-pet" viewBox="0 0 200 200" role="img" aria-label={pet.name}>
              <CharacterArt species={pet.species} mood="happy" bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} />
            </svg>
            <div className="rewards-stats">
              <p className="rewards-stat">{plural(choreCount, 'chore', 'chores')} done</p>
              <p className="rewards-stat">{streak > 0 ? `${plural(streak, 'day', 'days')} in a row` : 'No streak yet'}</p>
              {best > 0 && <p className="rewards-stat rewards-best">Best: {plural(best, 'day', 'days')}</p>}
            </div>
          </div>
          <p className="rewards-rule">{STREAK_RULE}</p>

          <section className="rewards-block" aria-labelledby={`${titleId}-next`}>
            <h2 id={`${titleId}-next`} className="sr-only">
              Next up
            </h2>
            {next.chores || next.streak ? (
              <ul className="rewards-nexts">
                {next.chores && <NextCard line={next.chores} label="chores" />}
                {next.streak && <NextCard line={next.streak} label="days" />}
              </ul>
            ) : (
              <p className="rewards-all">You have every reward. Lovely!</p>
            )}
          </section>
        </div>

        <div className="rewards-main">
          <div className="rewards-tabs seg" role="group" aria-label="Show">
            {GROUPS.map((g) => {
              const list = UNLOCKS.filter(g.has)
              const got = list.filter((x) => earned.includes(x)).length
              return (
                <button key={g.group} type="button" className="seg-btn" aria-pressed={group === g.group} onClick={() => setGroup(g.group)}>
                  {g.label}
                  <span className="rewards-count" aria-hidden="true">
                    {got}/{list.length}
                  </span>
                  <span className="sr-only">
                    , {got} of {list.length} earned
                  </span>
                </button>
              )
            })}
          </div>
          {grid(GROUPS.find((g) => g.group === group) ?? GROUPS[0])}
        </div>
      </div>
    </section>
  )
}
