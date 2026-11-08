// The chess check: "your chess today" from your real chess.com games – where you leave your book,
// which moves of your opponents your book does not cover yet, and how many mistakes a game costs you.
import { Chess } from 'chess.js'
import type { Puzzle } from './db'
import type { Line } from './pgn'
import { CATEGORY, type Category } from './weakness'

// how many departures the report keeps per kind
export let TOP = 3
export function setTop(n: number) {
  TOP = n
}
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

type Book = Record<'w' | 'b', Map<string, { mine: Set<string>; theirs: Set<string> }>>

// The moves your book plays (mine) and expects (theirs) in every position
export function buildBook(lines: Line[]): Book {
  const book: Book = { w: new Map(), b: new Map() }
  for (const l of lines) {
    for (const m of l.moves) {
      const k = key(m.fenBefore)
      const map = book[l.side]
      if (!map.has(k)) map.set(k, { mine: new Set(), theirs: new Set() })
      ;(m.color === l.side ? map.get(k)!.mine : map.get(k)!.theirs).add(m.san)
    }
  }
  return book
}

export interface Followed {
  sans: string[]
  plies: number // moves played from the book
  left: null | { who: 'you' | 'they'; departure: Departure }
}

// One game against your book: how far did it follow, and who left it first?
export function followBook(game: CheckGame, book: Book): Followed | null {
  const c = new Chess()
  try {
    c.loadPgn(game.pgn)
  } catch {
    return null
  }
  const sans = c.history()
  if (sans.length < 2) return null
  const r = new Chess()
  let plies = 0
  for (let i = 0; i < sans.length; i++) {
    const e = book[game.color].get(key(r.fen()))
    if (!e) break
    const san = sans[i]
    const moves = numbered(sans.slice(0, i))
    if (r.turn() === game.color) {
      if (!e.mine.size) break
      if (!e.mine.has(san)) return { sans, plies, left: { who: 'you', departure: { moves, played: san, book: [...e.mine], count: 1 } } }
    } else {
      if (!e.theirs.size) break
      if (!e.theirs.has(san)) return { sans, plies, left: { who: 'they', departure: { moves, played: san, book: [...e.theirs], count: 1 } } }
    }
    r.move(san)
    plies++
  }
  return { sans, plies, left: null }
}

export function bookReport(games: CheckGame[], lines: Line[]): BookReport {
  const book = buildBook(lines)
  const blank = () => ({ games: 0, plies: 0, youLeft: 0, theyLeft: 0, youLeftAt: new Map<string, Departure>(), gaps: new Map<string, Departure>() })
  const out = { w: blank(), b: blank() }
  for (const g of games) {
    const f = followBook(g, book)
    if (!f) continue
    const side = out[g.color]
    side.games++
    side.plies += f.plies
    if (!f.left) continue
    const into = f.left.who === 'you' ? side.youLeftAt : side.gaps
    if (f.left.who === 'you') side.youLeft++
    else side.theyLeft++
    const k = f.left.departure.moves + '|' + f.left.departure.played
    const d = into.get(k) ?? { ...f.left.departure, count: 0 }
    d.count++
    into.set(k, d)
  }
  const top = (m: Map<string, Departure>) => [...m.values()].sort((a, b) => b.count - a.count).slice(0, TOP)
  const report = (s: ReturnType<typeof blank>): SideReport => ({
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

export interface Compare {
  mistakes: { before: number; now: number }
  threats: { before: number; now: number }
  rating: { before: number | null; now: number | null }
  better: boolean // fewer big mistakes per game than at the start
}

// The report after 20 games: the same numbers as at the start, side by side
export function compare(base: { mistakes: number; threats: number; rating: number | null }, now: ShapeReport, rating: number | null): Compare {
  return {
    mistakes: { before: base.mistakes, now: now.mistakes },
    threats: { before: base.threats, now: now.threats },
    rating: { before: base.rating, now: rating },
    better: now.mistakes < base.mistakes,
  }
}
