// The numbers behind the visual Progress page (prototype, Lu 25.11.2026: "Statistik visuell darstellen, alles").
// Only real data on this device: the player's chess.com rapid games (result, colour, rating, opening, clock, time of
// day) and – for the games Hoppy has checked – the big mistakes (kind, phase, move number, clock left).
// Same rules as the analysis prototype (claude.ai artifact "Hoppy Progress"), which used the app's own analysis.
import { gameKey, type ChessComGame } from './chesscom'
import type { GameRecord, Puzzle } from './db'
import { phaseOf, type Category } from './weakness'

export type Kind = 'h' | 'i' | 'u' | 't' | 'a' | 'f' | 'M' | 'm' | 'o'
const KIND: Record<Category, Kind> = { 'hung-piece': 'h', 'ignored-threat': 'i', 'left-undefended': 'u', tactic: 't', 'allowed-mate': 'a', 'free-piece': 'f', 'missed-mate': 'M', 'missed-tactic': 'm', other: 'o' }

export interface Mistake {
  move: number // move number (1, 2, …)
  kind: Kind
  phase: 'o' | 'm' | 'e'
  clock: number | null // bucket of time left: 0 = >75 %, 1 = 50–75, 2 = 25–50, 3 = 10–25, 4 = <10 %
}
export interface PGame {
  t: number // end, seconds
  hour: number // local
  weekday: number // 0 = Monday
  color: 'w' | 'b'
  result: 'w' | 'd' | 'l'
  how: string // chess.com result code of the loser / the draw (timeout, resigned, checkmated …)
  rating: number
  opp: number
  family: string // opening family, e.g. "Scandinavian Defense"
  analysed: boolean // Hoppy checked the game (mistake numbers only count these)
  safe: number | null // % of my moves that lose less than 2 pawns
  moves: number // my moves
  clockMoves: number[] // my moves per clock bucket
  moveBuckets: number[] // my moves per move-number bucket: 1–10, 11–20, 21–30, 31–40, 41+
  mistakes: Mistake[]
  sans: string[] // the first moves of the game (SAN, without + # ! ?), to find the opening chapter
}

const DRAW = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']
const KEYS = ['Defense', 'Opening', 'Game', 'Gambit', 'Attack', 'System', 'Variation']

export function openingFamily(pgn: string): string {
  const url = /\[ECOUrl "([^"]+)"\]/.exec(pgn)?.[1]
  if (!url) return 'Unknown'
  const words = decodeURIComponent(url.split('/openings/')[1] ?? '').replace(/-/g, ' ').replace(/\bQueens\b/g, 'Queen’s').replace(/\bKings\b/g, 'King’s').split(' ').filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    if (KEYS.includes(words[i])) return words.slice(0, i + (words[i + 1] === 'Accepted' || words[i + 1] === 'Declined' ? 2 : 1)).join(' ')
  }
  return words.slice(0, 3).join(' ') || 'Unknown'
}

export function clockBucket(left: number, base: number): number {
  const f = left / base
  return f > 0.75 ? 0 : f > 0.5 ? 1 : f > 0.25 ? 2 : f > 0.1 ? 3 : 4
}

const MOVES_KEPT = 24
const clean = (san: string) => san.replace(/[+#!?]/g, '')
// the first moves of a chess.com PGN, e.g. ['e4', 'e5', 'Nf3', …]
export function firstMoves(pgn: string, n = MOVES_KEPT): string[] {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ')
  return body
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
    .slice(0, n)
    .map(clean)
}

// Which chapter of your book a game was: the chapter whose line follows the game's first moves the longest
// (at least two half-moves). Lu, 27.11.: "die Statistik zu den Openings – wie erfolgreich ich damit bin".
export function bestChapter(sans: string[], chs: { key: string; lines: { moves: { san: string }[] }[] }[]): string | null {
  let best: string | null = null
  let depth = 1
  for (const c of chs) {
    for (const l of c.lines) {
      let d = 0
      while (d < sans.length && d < l.moves.length && clean(l.moves[d].san) === sans[d]) d++
      if (d > depth) {
        depth = d
        best = c.key
      }
    }
  }
  return best
}

const clocks = (pgn: string) => [...pgn.matchAll(/\[%clk (\d+):(\d+):(\d+(?:\.\d+)?)\]/g)].map((m) => +m[1] * 3600 + +m[2] * 60 + +m[3])

export function buildGames(games: ChessComGame[], player: string, records: GameRecord[], puzzles: Puzzle[]): PGame[] {
  const me = player.toLowerCase()
  const recs = new Map(records.map((r) => [r.uuid, r]))
  const byGame = new Map<string, Puzzle[]>()
  for (const p of puzzles) {
    if (p.source === 'bot' || (p.player ?? 'l0o2').toLowerCase() !== me) continue
    byGame.set(p.gameUuid, [...(byGame.get(p.gameUuid) ?? []), p])
  }
  return games
    .filter((g) => g.time_class === 'rapid' && g.rules === 'chess' && (g.white.username.toLowerCase() === me || g.black.username.toLowerCase() === me))
    .sort((a, b) => a.end_time - b.end_time)
    .map((g) => {
      const color = g.white.username.toLowerCase() === me ? 'w' : 'b'
      const mine = color === 'w' ? g.white : g.black
      const opp = color === 'w' ? g.black : g.white
      const base = parseInt(/\[TimeControl "(\d+)/.exec(g.pgn)?.[1] ?? '600', 10) || 600
      const clk = clocks(g.pgn)
      const clockMoves = [0, 0, 0, 0, 0]
      const moveBuckets = [0, 0, 0, 0, 0]
      let moves = 0
      for (let ply = color === 'w' ? 0 : 1; ply < clk.length; ply += 2) {
        moves++
        clockMoves[clockBucket(clk[ply], base)]++
        moveBuckets[Math.min(Math.floor(ply / 2 / 10), 4)]++
      }
      const rec = recs.get(gameKey(player, g.uuid))
      const local = new Date(g.end_time * 1000)
      const result: PGame['result'] = mine.result === 'win' ? 'w' : DRAW.includes(mine.result) ? 'd' : 'l'
      return {
        t: g.end_time,
        hour: local.getHours(),
        weekday: (local.getDay() + 6) % 7,
        color,
        result,
        how: mine.result === 'win' ? opp.result : mine.result,
        rating: mine.rating,
        opp: opp.rating,
        family: openingFamily(g.pgn),
        analysed: !!rec,
        safe: rec && moves ? Math.max(0, 100 * (1 - rec.blunders / Math.max(Math.ceil(rec.plies / 2), 1))) : null,
        moves,
        clockMoves,
        moveBuckets,
        sans: firstMoves(g.pgn),
        mistakes: rec
          ? (byGame.get(g.uuid) ?? []).map((p) => ({
              move: Math.floor(p.ply / 2) + 1,
              kind: KIND[p.category ?? 'other'],
              phase: phaseOf(p.fen)[0] as Mistake['phase'],
              clock: clk[p.ply] != null ? clockBucket(clk[p.ply], base) : null,
            }))
          : [],
      }
    })
}

// ---------- the numbers for one set of games ----------
export interface Stats {
  n: number // games
  checked: number // analysed games
  win: number // 0..1
  safe: number | null
  perGame: number // big mistakes per checked game
  rating: number | null
  kind: (k: Kind[]) => number // per checked game
  phase: (p: Mistake['phase']) => number
  trouble: number // mistakes with < 25 % of the time left, per checked game
  timeout: number // lost on time, share of all games
}

export function stats(S: PGame[]): Stats {
  const A = S.filter((g) => g.analysed)
  const all = A.flatMap((g) => g.mistakes)
  const per = (f: (m: Mistake) => boolean) => (A.length ? all.filter(f).length / A.length : 0)
  const safes = A.map((g) => g.safe).filter((x): x is number => x != null)
  return {
    n: S.length,
    checked: A.length,
    win: S.length ? S.filter((g) => g.result === 'w').length / S.length : 0,
    safe: safes.length ? safes.reduce((s, x) => s + x, 0) / safes.length : null,
    perGame: A.length ? all.length / A.length : 0,
    rating: S.length ? S[S.length - 1].rating : null,
    kind: (k) => per((m) => k.includes(m.kind)),
    phase: (p) => per((m) => m.phase === p),
    trouble: per((m) => m.clock === 3 || m.clock === 4),
    timeout: S.length ? S.filter((g) => g.result === 'l' && g.how === 'timeout').length / S.length : 0,
  }
}

export type Range = '4w' | '3m' | 'all'
const DAY = 86400
// the games shown, and the two sets that are compared ("now" vs "before")
export function windows(G: PGame[], range: Range): { shown: PGame[]; now: PGame[]; before: PGame[]; label: string } {
  if (!G.length) return { shown: [], now: [], before: [], label: '' }
  const end = G[G.length - 1].t
  if (range === 'all') {
    const q = Math.floor(G.length / 4)
    return { shown: G, now: G.slice(-q), before: G.slice(0, q), label: 'your last quarter of games vs your first quarter' }
  }
  const span = (range === '4w' ? 28 : 91) * DAY
  return {
    shown: G.filter((g) => g.t > end - span),
    now: G.filter((g) => g.t > end - span),
    before: G.filter((g) => g.t > end - 2 * span && g.t <= end - span),
    label: range === '4w' ? 'last 4 weeks vs the 4 weeks before' : 'last 3 months vs the 3 months before',
  }
}

// one point per week (Monday), weeks with at least `min` games
export function weekly(S: PGame[], f: (gs: PGame[]) => number | null, min = 3): { t: number; v: number; n: number }[] {
  const by = new Map<number, PGame[]>()
  for (const g of S) {
    const w = Math.floor((g.t - 4 * DAY) / (7 * DAY))
    by.set(w, [...(by.get(w) ?? []), g])
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, gs]) => gs.length >= min)
    .map(([w, gs]) => ({ t: w * 7 * DAY + 4 * DAY, v: f(gs), n: gs.length }))
    .filter((p): p is { t: number; v: number; n: number } => p.v != null)
}

// games less than an hour apart (end to end) are one session
export function sessions(S: PGame[]): PGame[][] {
  const out: PGame[][] = []
  let cur: PGame[] = []
  for (const g of S) {
    if (cur.length && g.t - cur[cur.length - 1].t > 3600) {
      out.push(cur)
      cur = []
    }
    cur.push(g)
  }
  if (cur.length) out.push(cur)
  return out
}
