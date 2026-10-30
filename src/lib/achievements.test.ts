import { describe, expect, it } from 'vitest'
import { achievements, bestStreak, type AchievementInput } from './achievements'

const base: AchievementInput = {
  linesPlayed: 0, linesTotal: 59, perfectLines: 0, chaptersDone: [{ title: 'Italian Game', done: false }], puzzlesSolved: 0,
  threatsSolved: 0, bestStreak: 0, level: 1, gamesPlayed: 0, gamesWon: 0, botRating: 533,
}

describe('achievements', () => {
  it('nothing earned at the start, progress is capped at the goal', () => {
    const a = achievements(base)
    expect(a.filter((x) => x.earned)).toEqual([])
    const b = achievements({ ...base, linesPlayed: 12 })
    const lines10 = b.find((x) => x.id === 'lines-10')!
    expect(lines10.earned).toBe(true)
    expect(lines10.value).toBe(10)
    expect(b.find((x) => x.id === 'lines-30')!.value).toBe(12)
  })

  it('one trophy per finished chapter and rating trophies', () => {
    const a = achievements({ ...base, chaptersDone: [{ title: 'Italian Game', done: true }], botRating: 1010 })
    expect(a.find((x) => x.id === 'chapter-Italian Game')!.earned).toBe(true)
    expect(a.find((x) => x.id === 'rating-1000')!.earned).toBe(true)
    expect(a.find((x) => x.id === 'rating-1200')!.earned).toBe(false)
  })
})

describe('bestStreak', () => {
  it('finds the longest run of consecutive days, across months', () => {
    expect(bestStreak([])).toBe(0)
    expect(bestStreak(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03'])).toBe(4)
    expect(bestStreak(['2026-10-01', '2026-10-01'])).toBe(1)
  })
})
