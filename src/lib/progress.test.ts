import { describe, expect, it } from 'vitest'
import { addToDay, dateKey, goalReached, levelInfo, streak, xpForDrill, xpForPuzzle, type DayActivity } from './progress'

const day = (date: string, lines = 1): DayActivity => ({ date, lines, puzzles: 0, xp: 10 })
const map = (...d: DayActivity[]) => new Map(d.map((x) => [x.date, x]))

describe('dateKey', () => {
  it('uses the local date, zero-padded', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('XP', () => {
  it('flawless drill earns the most', () => {
    expect([0, 1, 2, 7].map(xpForDrill)).toEqual([20, 15, 10, 10])
  })
  it('puzzles: bonus for the first try', () => {
    expect([0, 1, 3].map(xpForPuzzle)).toEqual([15, 10, 10])
  })
})

describe('levels', () => {
  it('level thresholds 0 / 100 / 300 / 600', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, needed: 100 })
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100)).toEqual({ level: 2, into: 0, needed: 200 })
    expect(levelInfo(450)).toEqual({ level: 3, into: 150, needed: 300 })
    expect(levelInfo(600).level).toBe(4)
  })
})

describe('streak', () => {
  it('counts consecutive days including today', () => {
    expect(streak(map(day('2026-10-27'), day('2026-10-28'), day('2026-10-29')), '2026-10-29')).toBe(3)
  })
  it('stays alive when today has no activity yet', () => {
    expect(streak(map(day('2026-10-27'), day('2026-10-28')), '2026-10-29')).toBe(2)
  })
  it('breaks after a missed day', () => {
    expect(streak(map(day('2026-10-26'), day('2026-10-28'), day('2026-10-29')), '2026-10-29')).toBe(2)
    expect(streak(map(day('2026-10-26')), '2026-10-29')).toBe(0)
  })
  it('works across month and year boundaries', () => {
    expect(streak(map(day('2025-12-31'), day('2026-01-01')), '2026-01-01')).toBe(2)
    expect(streak(map(day('2026-02-28'), day('2026-03-01')), '2026-03-01')).toBe(2)
  })
  it('days with zero activity do not count', () => {
    expect(streak(map(day('2026-10-28', 0), day('2026-10-29')), '2026-10-29')).toBe(1)
  })
})

describe('daily goal', () => {
  it('needs both lines and puzzles', () => {
    const goal = { lines: 2, puzzles: 1 }
    let d = addToDay(undefined, '2026-10-29', { lines: 1, xp: 20 })
    d = addToDay(d, '2026-10-29', { lines: 1, xp: 15 })
    expect(d).toEqual({ date: '2026-10-29', lines: 2, puzzles: 0, games: 0, xp: 35 })
    expect(goalReached(d, goal)).toBe(false)
    d = addToDay(d, '2026-10-29', { puzzles: 1, xp: 15 })
    expect(goalReached(d, goal)).toBe(true)
  })
})

describe('games against the bot', () => {
  it('count for the streak and give more XP for a win', async () => {
    const { xpForGame } = await import('./progress')
    const d = addToDay(undefined, '2026-10-30', { games: 1, xp: 30 })
    expect(streak(new Map([[d.date, d]]), '2026-10-30')).toBe(1)
    expect(xpForGame(1)).toBeGreaterThan(xpForGame(0.5))
    expect(xpForGame(0.5)).toBeGreaterThan(xpForGame(0))
  })
})
