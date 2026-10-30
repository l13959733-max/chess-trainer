import { expect, it } from 'vitest'
import { dailyQueue } from './daily'
import type { Puzzle } from './db'
import type { Line } from './pgn'
import type { SrsState } from './srs'

const now = Date.UTC(2026, 9, 30)
const st = (id: string, due: number): SrsState => ({ lineId: id, ef: 2.5, interval: 1, reps: 1, due, lastReviewed: now - 86400000, lastMistakes: 0 })
const line = (id: string) => ({ id, title: id, side: 'w', moves: [], source: 'builtin' }) as Line
const puzzle = (id: string, refutation = true) => ({ id, refutation: refutation ? { best: 'e2e4', pv: [], score: { cp: 0 } } : undefined }) as unknown as Puzzle

it('mixes due lines, puzzles and threats, skips what is not due or new', () => {
  const lines = [line('a'), line('b'), line('new')]
  const lineSrs = new Map([['a', st('a', now - 1)], ['b', st('b', now + 86400000)]])
  const puzzles = [puzzle('x'), puzzle('y', false)]
  const pSrs = new Map([['p:x', st('p:x', now - 1)], ['t:x', st('t:x', now - 1)], ['p:y', st('p:y', now - 1)], ['t:y', st('t:y', now - 1)]])
  expect(dailyQueue(lines, lineSrs, puzzles, pSrs, now)).toEqual([
    { kind: 'line', id: 'a' },
    { kind: 'puzzle', id: 'x' },
    { kind: 'threat', id: 'x' },
    { kind: 'puzzle', id: 'y' },
  ])
})
