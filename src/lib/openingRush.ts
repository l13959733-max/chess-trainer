// Opening Rush #/opening-rush/<key> (Lu, 22.11.2026: "die Eröffnung hardcore trainieren … Aufgaben zufällig …
// gegen Zeit und Belohnungen"). One opening, all its situations as tasks, in random order, on time:
//   book   – the opponent plays a move from your lines: play your book move
//   react  – the opponent leaves your book with a good move: find the best answer (Stockfish, scripts/build-arena.mjs)
//   punish – the opponent makes a mistake: find the move that punishes it (Stockfish, unique answer)
// Pure rules here (tested in openingRush.test.ts); the screen is src/screens/OpeningRush.tsx.
// Mastery: a task is mastered after 2 right in a row; the belts give chestnuts once.
import { Chess } from 'chess.js'
import type { Line } from './pgn'

export type TaskKind = 'book' | 'react' | 'punish'
export interface ArenaTask {
  id: string
  kind: TaskKind
  fen: string // before the opponent's move
  moves: [string, string] // UCI: the opponent's move, then yours
  alts?: string[] // UCI: other answers that count too
  path: string // the moves so far, the opponent's last move included
  why: string
  ply: number
}
export interface ArenaFile {
  opening: string
  side: 'w' | 'b'
  tasks: ArenaTask[]
}

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const keyOf = (opening: string, side: 'w' | 'b') => `${slug(opening)}-${side}`

// the extra tasks, one file per opening, loaded only when you open that rush
const FILES = import.meta.glob<ArenaFile>('../data/arena/*.json', { import: 'default' })
export const ARENA_KEYS = Object.keys(FILES).map((p) => p.replace(/^.*\/(.*)\.json$/, '$1'))
export async function loadArena(key: string): Promise<ArenaFile | null> {
  const f = FILES[`../data/arena/${key}.json`]
  return f ? f() : null
}

const place = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '')

// Your book moves as tasks: every move of your side in the opening's lines (not White's first move), with the
// opponent's move before it played on the board. Other book moves in the same position count too.
export function bookTasks(lines: Line[]): ArenaTask[] {
  const out = new Map<string, ArenaTask>()
  for (const l of lines) {
    l.moves.forEach((m, ply) => {
      if (m.color !== l.side || ply === 0) return
      const opp = l.moves[ply - 1]
      const k = place(m.fenBefore)
      const c = new Chess(m.fenBefore)
      const mv = c.move(m.san)
      const u = uciOf(mv)
      const e = out.get(k)
      if (e) {
        if (e.moves[1] !== u && !e.alts?.includes(u)) e.alts = [...(e.alts ?? []), u]
        return
      }
      const o = new Chess(opp.fenBefore).move(opp.san)
      const path = l.moves
        .slice(0, ply)
        .map((x, i) => (i % 2 === 0 ? `${i / 2 + 1}.${x.san}` : x.san))
        .join(' ')
      out.set(k, {
        id: 'b:' + k,
        kind: 'book',
        fen: opp.fenBefore,
        moves: [uciOf(o), u],
        path,
        ply,
        why: m.comment ? `${m.san}: ${m.comment}` : `${m.san} – your move in “${l.title}”.`,
      })
    })
  }
  return [...out.values()]
}

// ---------- one run: 3 minutes, 3 lives, 3 right in a row = +5 s ----------
export const OR_TIME = 180_000
export const OR_LIVES = 3
export const OR_COMBO = 3
export const OR_BONUS_MS = 5_000
export const POINTS: Record<TaskKind, number> = { book: 10, react: 20, punish: 30 }

export interface RunState {
  end: number
  lives: number
  score: number
  streak: number
  combo: number
  solved: number
  missed: string[]
}
export const startRun = (now: number): RunState => ({ end: now + OR_TIME, lives: OR_LIVES, score: 0, streak: 0, combo: 0, solved: 0, missed: [] })

// a streak bonus: from the 5th right in a row, +5 per task
export function solveTask(s: RunState, kind: TaskKind): { s: RunState; boom: boolean } {
  const combo = s.combo + 1
  const boom = combo >= OR_COMBO
  const streak = s.streak + 1
  return {
    s: { ...s, score: s.score + POINTS[kind] + (streak >= 5 ? 5 : 0), streak, combo: boom ? 0 : combo, solved: s.solved + 1, end: boom ? s.end + OR_BONUS_MS : s.end },
    boom,
  }
}
export function missTask(s: RunState, id: string): RunState {
  return { ...s, lives: Math.max(0, s.lives - 1), streak: 0, combo: 0, missed: [...s.missed, id] }
}
export const runLeft = (s: RunState, now: number) => Math.max(0, s.end - now)
export const runOver = (s: RunState, now: number) => s.lives <= 0 || runLeft(s, now) <= 0
export const runStars = (score: number) => (score >= 500 ? 3 : score >= 250 ? 2 : score >= 80 ? 1 : 0)

// ---------- mastery: 2 right in a row ----------
export type Mastery = Record<string, number> // task id -> right in a row (0 after a miss)
export const MASTERED = 2
export function recordTask(m: Mastery, id: string, right: boolean): Mastery {
  return { ...m, [id]: right ? (m[id] ?? 0) + 1 : 0 }
}
export function masteryPct(m: Mastery, tasks: ArenaTask[]): number {
  if (!tasks.length) return 0
  return Math.floor((100 * tasks.filter((t) => (m[t.id] ?? 0) >= MASTERED).length) / tasks.length)
}
export const BELTS = [
  { pct: 25, name: 'Bronze', nuts: 2 },
  { pct: 50, name: 'Silver', nuts: 3 },
  { pct: 80, name: 'Gold', nuts: 5 },
  { pct: 100, name: 'Master', nuts: 10 },
] as const
export const beltOf = (pct: number) => [...BELTS].reverse().find((b) => pct >= b.pct)
export const nextBelt = (pct: number) => BELTS.find((b) => pct < b.pct)

// The order of a run: tasks you missed last time come back early, then the ones you have not mastered yet,
// mastered ones last – each group shuffled, and the kinds mixed (no three of one kind in a row when avoidable).
export function buildRun(tasks: ArenaTask[], mastery: Mastery, again: string[], rnd: () => number, length = 80): ArenaTask[] {
  const shuffle = <T,>(a: T[]) => {
    const b = [...a]
    for (let k = b.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1))
      ;[b[k], b[j]] = [b[j], b[k]]
    }
    return b
  }
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const back = again.map((id) => byId.get(id)).filter((t): t is ArenaTask => !!t)
  const backIds = new Set(back.map((t) => t.id))
  const rest = tasks.filter((t) => !backIds.has(t.id))
  const fresh = shuffle(rest.filter((t) => (mastery[t.id] ?? 0) < MASTERED))
  const known = shuffle(rest.filter((t) => (mastery[t.id] ?? 0) >= MASTERED))
  const pool = [...fresh, ...known]
  const out: ArenaTask[] = []
  const backQ = shuffle(back)
  while (out.length < length && (pool.length || backQ.length)) {
    if (backQ.length && (out.length % 3 === 1 || !pool.length)) {
      out.push(backQ.shift()!)
      continue
    }
    // avoid a third task of the same kind in a row, if another kind is close by
    const k2 = out.slice(-2).map((t) => t.kind)
    let pick = 0
    if (k2.length === 2 && k2[0] === k2[1]) {
      const j = pool.findIndex((t) => t.kind !== k2[0])
      if (j >= 0 && j < 6) pick = j
    }
    out.push(pool.splice(pick, 1)[0])
  }
  return out
}

// missed ones are remembered for the next run; solved ones leave the list
export function rememberMissed(again: string[], missed: string[], solved: string[]): string[] {
  const s = new Set(solved)
  return [...new Set([...missed, ...again])].filter((id) => !s.has(id) || missed.includes(id)).slice(0, 30)
}

// ---------- your Black system (Lu, 22.11.: "mir jetzt ein schwarzes System raussuchen") ----------
export interface BlackChoice {
  e4?: string // opening name against 1.e4
  d4?: string // opening name against 1.d4
}
const BLACK_KEY = 'hoppy-black-system'
export function loadBlack(): BlackChoice {
  try {
    return JSON.parse(localStorage.getItem(BLACK_KEY) ?? '{}') as BlackChoice
  } catch {
    return {}
  }
}
export function saveBlack(b: BlackChoice) {
  try {
    localStorage.setItem(BLACK_KEY, JSON.stringify(b))
  } catch {
    // not remembered
  }
}
