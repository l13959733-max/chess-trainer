// The chess check: "your chess today" from your real chess.com games – where you leave your book,
// which moves of your opponents your book does not cover yet, and how many mistakes a game costs you.
import { Chess } from 'chess.js'
import type { Puzzle } from './db'
import type { Line } from './pgn'
import { CATEGORY, type Category } from './weakness'

const key = (fen: string) => fen.split(' ').slice(0, 2).join(' ')

export interface CheckGame {
  pgn: string
  color: 'w' | 'b'
}

export interface Departure {
  moves: string // the moves before, e.g. "1.e4 d5"
  played: string
  book: string[]
  count: number
}

export interface SideReport {
  games: number
  inBook: number // average plies played from the book
  youLeft: number // games where you left the book first
  theyLeft: number // games where your opponent played a move your book does not know
  youLeftAt: Departure[]
  gaps: Departure[]
}

export interface BookReport {
  w: SideReport
  b: SideReport
}

function numbered(sans: string[]): string {
  return sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ')
}

export function bookReport(games: CheckGame[], lines: Line[]): BookReport {
  // book[side][position] = the moves your book plays (mine) and the moves it expects (theirs)
  const book = { w: new Map<string, { mine: Set<string>; theirs: Set<string> }>(), b: new Map<string, { mine: Set<string>; theirs: Set<string> }>() }
  for (const l of lines) {
    for (const m of l.moves) {
      const k = key(m.fenBefore)
      const map = book[l.side]
      if (!map.has(k)) map.set(k, { mine: new Set(), theirs: new Set() })
      ;(m.color === l.side ? map.get(k)!.mine : map.get(k)!.theirs).add(m.san)
    }
  }
  const out = {
    w: { games: 0, plies: 0, youLeft: 0, theyLeft: 0, youLeftAt: new Map<string, Departure>(), gaps: new Map<string, Departure>() },
    b: { games: 0, plies: 0, youLeft: 0, theyLeft: 0, youLeftAt: new Map<string, Departure>(), gaps: new Map<string, Departure>() },
  }
  for (const g of games) {
    const c = new Chess()
    try {
      c.loadPgn(g.pgn)
    } catch {
      continue
    }
    const sans = c.history()
    if (sans.length < 2) continue
    const side = out[g.color]
    side.games++
    const r = new Chess()
    for (let i = 0; i < sans.length; i++) {
      const e = book[g.color].get(key(r.fen()))
      if (!e) break
      const san = sans[i]
      const before = numbered(sans.slice(0, i))
      if (r.turn() === g.color) {
        if (!e.mine.size) break
        if (!e.mine.has(san)) {
          side.youLeft++
          const k = before + '|' + san
          const d = side.youLeftAt.get(k) ?? { moves: before, played: san, book: [...e.mine], count: 0 }
          d.count++
          side.youLeftAt.set(k, d)
          break
        }
      } else if (e.theirs.size && !e.theirs.has(san)) {
        side.theyLeft++
        const k = before + '|' + san
        const d = side.gaps.get(k) ?? { moves: before, played: san, book: [...e.theirs], count: 0 }
        d.count++
        side.gaps.set(k, d)
        break
      } else if (!e.theirs.size) break
      r.move(san)
      side.plies++
    }
  }
  const top = (m: Map<string, Departure>) => [...m.values()].sort((a, b) => b.count - a.count).slice(0, 3)
  const report = (s: (typeof out)['w']): SideReport => ({
    games: s.games,
    inBook: s.games ? s.plies / s.games : 0,
    youLeft: s.youLeft,
    theyLeft: s.theyLeft,
    youLeftAt: top(s.youLeftAt),
    gaps: top(s.gaps),
  })
  return { w: report(out.w), b: report(out.b) }
}

export interface ShapeReport {
  games: number
  mistakes: number // per game: blunders and missed mates
  threats: number // per game: what the opponent could do and you did not see
  chances: number // per game: your own chances you did not take
  worst?: { category: Category; title: string; rule: string; count: number }
}

// Mistakes of the given games (puzzles are the mistakes the analysis found)
export function shapeReport(games: number, puzzles: Puzzle[]): ShapeReport {
  const counts = new Map<Category, number>()
  for (const p of puzzles) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  const family = (f: 'opponent' | 'chance') => puzzles.filter((p) => p.category && CATEGORY[p.category].family === f).length
  const top = [...counts].filter(([c]) => c !== 'other').sort((a, b) => b[1] - a[1])[0]
  return {
    games,
    mistakes: games ? puzzles.length / games : 0,
    threats: games ? family('opponent') / games : 0,
    chances: games ? family('chance') / games : 0,
    worst: top ? { category: top[0], title: CATEGORY[top[0]].title, rule: CATEGORY[top[0]].rule, count: top[1] } : undefined,
  }
}
