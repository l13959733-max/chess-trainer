import type { Puzzle } from './db'
import type { Line } from './pgn'
import { isDue, type SrsState } from './srs'

export const DAILY_MAX = 20

export type Card = { kind: 'line' | 'puzzle' | 'threat'; id: string }

// "Today's cards": everything the review schedule says is due – lines, puzzles ('p:') and threats ('t:')
// – mixed one of each kind in turn, at most DAILY_MAX.
export function dailyQueue(lines: Line[], lineSrs: Map<string, SrsState>, puzzles: Puzzle[], puzzleSrs: Map<string, SrsState>, now = Date.now()): Card[] {
  const dueLines: Card[] = lines.filter((l) => isDue(lineSrs.get(l.id), now)).map((l) => ({ kind: 'line', id: l.id }))
  const due = (prefix: string) => (p: Puzzle) => {
    const s = puzzleSrs.get(prefix + p.id)
    return !!s && isDue(s, now)
  }
  const puz: Card[] = puzzles.filter(due('p:')).map((p) => ({ kind: 'puzzle', id: p.id }))
  const thr: Card[] = puzzles.filter((p) => p.refutation && due('t:')(p)).map((p) => ({ kind: 'threat', id: p.id }))
  const out: Card[] = []
  for (let i = 0; out.length < DAILY_MAX && i < Math.max(dueLines.length, puz.length, thr.length); i++) {
    for (const list of [dueLines, puz, thr]) if (list[i] && out.length < DAILY_MAX) out.push(list[i])
  }
  return out
}
