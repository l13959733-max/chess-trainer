import { describe, expect, it } from 'vitest'
import type { ChessComGame } from './chesscom'
import { mistakesByMonth, rapidHistory, safeByWeek, thenNow, weekStart } from './growth'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime() / 1000

describe('growth', () => {
  it('weeks start on Monday', () => {
    expect(new Date(weekStart(at(2026, 11, 15) * 1000)).getDay()).toBe(1) // a Sunday → the Monday before
    expect(new Date(weekStart(at(2026, 11, 15) * 1000)).getDate()).toBe(9)
  })

  it('safe moves per week from moves and mistakes', () => {
    const stats = [
      { endTime: at(2026, 11, 2), plies: 40, blunders: 4 }, // 20 moves, 4 bad
      { endTime: at(2026, 11, 3), plies: 40, blunders: 2 }, // 20 moves, 2 bad → week 1: 34/40 = 85 %
      { endTime: at(2026, 11, 10), plies: 60, blunders: 1 },
      { endTime: at(2026, 11, 11), plies: 20, blunders: 1 }, // 40 moves, 2 bad → 95 %
      { endTime: at(2026, 11, 17), plies: 40, blunders: 0 }, // only one game: left out
    ]
    const w = safeByWeek(stats)
    expect(w.map((p) => p.v)).toEqual([85, 95])
    expect(w.map((p) => p.n)).toEqual([2, 2])
  })

  it('mistakes per game per month', () => {
    const stats = [1, 2, 3].map((d) => ({ endTime: at(2026, 10, d), plies: 40, blunders: d })) // 1+2+3 / 3 = 2
    expect(mistakesByMonth(stats)).toEqual([{ t: new Date(2026, 9, 1).getTime(), v: 2, n: 3 }])
  })

  it('rapid rating after each rated rapid game, from your side', () => {
    const g = (t: number, cls: string, w: [string, number], b: [string, number], rated = true) =>
      ({ end_time: t, time_class: cls, rules: 'chess', rated, white: { username: w[0], rating: w[1], result: '' }, black: { username: b[0], rating: b[1], result: '' } }) as unknown as ChessComGame
    const games = [
      g(at(2026, 11, 2), 'rapid', ['l0o2', 600], ['x', 650]),
      g(at(2026, 11, 1), 'rapid', ['y', 500], ['L0O2', 590]),
      g(at(2026, 11, 3), 'blitz', ['l0o2', 400], ['x', 650]),
      g(at(2026, 11, 4), 'rapid', ['l0o2', 999], ['x', 650], false),
    ]
    expect(rapidHistory(games, 'l0o2').map((p) => p.v)).toEqual([590, 600])
  })

  it('then vs now compares the first and last quarter', () => {
    const pts = [10, 20, 30, 40, 50, 60, 70, 80].map((v, i) => ({ t: i, v, n: 1 }))
    expect(thenNow(pts)).toEqual({ then: 15, now: 75 })
    expect(thenNow(pts.slice(0, 1))).toBeNull()
  })
})
