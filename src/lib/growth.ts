// "Is my chess getting better?" (Lu, 15.11.): the numbers behind the charts on the Journey page.
// Only real data: the chess.com games Hoppy has checked (moves + mistakes per game) and the rapid rating
// chess.com stores with every game. Nothing is estimated – too few games = no chart.
import type { ChessComGame } from './chesscom'
import { safeShare } from './trainingPath'

export interface GameStat {
  endTime: number // seconds, as chess.com gives it
  plies: number
  blunders: number
}

export interface Point {
  t: number // ms, start of the week / month, or the game's end
  v: number
  n: number // games behind the point
}

const DAY = 86_400_000

// Monday 00:00 (local) of the week of t
export function weekStart(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

function monthStart(t: number): number {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

function group(stats: GameStat[], key: (t: number) => number): Map<number, GameStat[]> {
  const m = new Map<number, GameStat[]>()
  for (const s of [...stats].sort((a, b) => a.endTime - b.endTime)) {
    const k = key(s.endTime * 1000)
    m.set(k, [...(m.get(k) ?? []), s])
  }
  return m
}

// safe moves in % per week (the app's main number, see accuracy.ts), weeks with at least `min` games
export function safeByWeek(stats: GameStat[], min = 2): Point[] {
  return [...group(stats, weekStart)]
    .map(([t, g]) => ({ t, v: Math.round((safeShare(g) ?? 0) * 1000) / 10, n: g.length }))
    .filter((p) => p.n >= min)
}

// big mistakes per game, per month (fewer is better)
export function mistakesByMonth(stats: GameStat[], min = 3): Point[] {
  return [...group(stats, monthStart)]
    .map(([t, g]) => ({ t, v: Math.round((g.reduce((s, x) => s + x.blunders, 0) / g.length) * 10) / 10, n: g.length }))
    .filter((p) => p.n >= min)
}

// your rapid rating after every rated rapid game
export function rapidHistory(games: ChessComGame[], user: string): Point[] {
  const me = user.toLowerCase()
  return games
    .filter((g) => g.rules === 'chess' && g.time_class === 'rapid' && g.rated)
    .map((g) => {
      const side = g.white.username.toLowerCase() === me ? g.white : g.black.username.toLowerCase() === me ? g.black : null
      return side ? { t: g.end_time * 1000, v: side.rating, n: 1 } : null
    })
    .filter((p): p is Point => !!p)
    .sort((a, b) => a.t - b.t)
}

// then vs now: the average of the first and the last quarter of the points (at least one point each)
export function thenNow(points: Point[]): { then: number; now: number } | null {
  if (points.length < 2) return null
  const k = Math.max(1, Math.floor(points.length / 4))
  const avg = (p: Point[]) => p.reduce((s, x) => s + x.v, 0) / p.length
  return { then: avg(points.slice(0, k)), now: avg(points.slice(-k)) }
}

export function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / DAY)
}
