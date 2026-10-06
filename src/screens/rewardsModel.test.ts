import { UNLOCKS } from '../domain/unlocks'
import { describe, expect, it } from 'vitest'
import type { Progress } from '../domain/types'
import { giftTitle, nextLines, requirementLabel, rewardsButtonLabel, withEquipped } from './rewardsModel'

const progress = (over: Partial<Progress> = {}): Progress => ({ homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [], ...over })

describe('rewardsModel', () => {
  it('words the requirements', () => {
    expect(requirementLabel({ type: 'chores', count: 1 })).toBe('1 chore')
    expect(requirementLabel({ type: 'chores', count: 12 })).toBe('12 chores')
    expect(requirementLabel({ type: 'streak', days: 7 })).toBe('7-day streak')
  })

  it('titles the gift', () => {
    expect(giftTitle({ name: 'Red beanie' })).toBe('You unlocked the red beanie!')
  })

  it('counts progress from the previous reward of the same kind', () => {
    // Beanie (1) and plant (3) are earned; 4 chores done; the bow is at 5.
    const p = progress({ choreCount: 4, unlockedItems: ['item:beanie-red', 'decor:plant'] })
    const { chores } = nextLines(p, 0)
    expect(chores?.unlock.id).toBe('item:bow')
    expect(chores?.text).toBe('1 more chore to the bow')
    expect(chores?.done).toBe(1)
    expect(chores?.total).toBe(2)
    expect(chores?.fraction).toBeCloseTo(0.5)
  })

  it('shows the next streak reward from the best streak', () => {
    const p = progress({ choreCount: 1, bestStreak: 1, unlockedItems: ['item:beanie-red'] })
    const { streak } = nextLines(p, 1)
    expect(streak?.unlock.id).toBe('wall:mint')
    expect(streak?.text).toBe('1 more day to the mint walls')
  })

  it('has nothing next once everything is earned', () => {
    const all = progress({ choreCount: 99, bestStreak: 99, unlockedItems: nextLinesAll() })
    expect(nextLines(all, 99)).toEqual({ chores: null, streak: null })
  })

  it('labels the home button', () => {
    expect(rewardsButtonLabel(null)).toBe('Rewards')
    expect(rewardsButtonLabel(progress({ choreCount: 1, unlockedItems: ['item:beanie-red'] }))).toBe('Rewards · 2 to go')
  })

  it('keeps one item per slot', () => {
    expect(withEquipped({ head: 'a' }, 'head', 'b')).toEqual({ head: 'b' })
    expect(withEquipped({ head: 'a', neck: 'c' }, 'head', null)).toEqual({ neck: 'c' })
  })
})

function nextLinesAll(): string[] {
  return UNLOCKS.map((x) => x.id)
}
