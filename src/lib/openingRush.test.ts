import { readdirSync, readFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { builtinLines } from './repertoire'
import {
  ARENA_KEYS,
  MASTERED,
  OR_LIVES,
  bookTasks,
  buildRun,
  keyOf,
  masteryPct,
  missTask,
  recordTask,
  rememberMissed,
  solveTask,
  startRun,
  type ArenaFile,
  type ArenaTask,
} from './openingRush'

const files: ArenaFile[] = readdirSync('src/data/arena').map((f) => JSON.parse(readFileSync('src/data/arena/' + f, 'utf8')) as ArenaFile)
const play = (c: Chess, u: string) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })

function checkTask(t: ArenaTask, side: 'w' | 'b') {
  const c = new Chess(t.fen)
  expect(c.turn(), t.id).not.toBe(side) // the opponent moves first
  const opp = play(c, t.moves[0])
  expect(t.path.endsWith(opp.san), t.id).toBe(true)
  for (const u of [t.moves[1], ...(t.alts ?? [])]) expect(() => play(new Chess(c.fen()), u), t.id + ' ' + u).not.toThrow()
}

describe('Opening Rush tasks', () => {
  it('there is a file for the Catalan, and every opening file is found by its key', () => {
    expect(ARENA_KEYS).toContain(keyOf('Catalan', 'w'))
    for (const f of files) expect(ARENA_KEYS).toContain(keyOf(f.opening, f.side))
  })

  it('every Stockfish task is legal: the opponent moves first, then your answer (and the other good answers)', () => {
    for (const f of files) {
      expect(f.tasks.length, f.opening).toBeGreaterThan(0)
      expect(new Set(f.tasks.map((t) => t.id)).size, f.opening).toBe(f.tasks.length)
      for (const t of f.tasks) {
        expect(['react', 'punish']).toContain(t.kind)
        checkTask(t, f.side)
      }
    }
  })

  it('book tasks come from your lines, are legal, and accept every book move of the position', () => {
    const catalan = builtinLines.filter((l) => l.opening === 'Catalan' && l.side === 'w')
    const tasks = bookTasks(catalan)
    expect(tasks.length).toBeGreaterThan(20)
    for (const t of tasks) checkTask(t, 'w')
    // 3.g3 is a book task (after 2...e6), 1.d4 is not
    expect(tasks.some((t) => t.path === '1.d4 Nf6 2.c4 e6')).toBe(true)
    expect(tasks.some((t) => t.ply === 0)).toBe(false)
    for (const f of files) for (const t of bookTasks(builtinLines.filter((l) => l.opening === f.opening && l.side === f.side))) checkTask(t, f.side)
  })

  it('a run: points by kind, 3 right in a row = +5 s, misses cost a life', () => {
    let s = startRun(0)
    s = solveTask(s, 'book').s
    s = solveTask(s, 'punish').s
    const r = solveTask(s, 'react')
    expect(r.boom).toBe(true)
    expect(r.s.score).toBe(60)
    expect(r.s.end).toBe(s.end + 5000)
    const m = missTask(r.s, 'x')
    expect(m.lives).toBe(OR_LIVES - 1)
    expect(m.streak).toBe(0)
  })

  it('mastery needs 2 right in a row; a miss starts again', () => {
    const t = [{ id: 'a' }, { id: 'b' }] as ArenaTask[]
    let m = recordTask({}, 'a', true)
    expect(masteryPct(m, t)).toBe(0)
    m = recordTask(m, 'a', true)
    expect(m.a).toBe(MASTERED)
    expect(masteryPct(m, t)).toBe(50)
    expect(recordTask(m, 'a', false).a).toBe(0)
  })

  it('the run brings missed tasks back early, mastered ones last, and uses every task once', () => {
    const tasks = Array.from({ length: 30 }, (_, k) => ({ id: 't' + k, kind: (['book', 'react', 'punish'] as const)[k % 3] }) as ArenaTask)
    const mastery = Object.fromEntries(tasks.slice(0, 10).map((t) => [t.id, MASTERED]))
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const run = buildRun(tasks, mastery, ['t20'], rnd)
    expect(run.length).toBe(30)
    expect(new Set(run.map((t) => t.id)).size).toBe(30)
    expect(run.findIndex((t) => t.id === 't20')).toBeLessThan(3)
    // the 10 mastered ones come after the others
    expect(run.slice(-10).every((t) => (mastery[t.id] ?? 0) >= MASTERED)).toBe(true)
  })

  it('missed tasks are remembered until solved', () => {
    expect(rememberMissed(['a', 'b'], ['c'], ['a'])).toEqual(['c', 'b'])
  })
})
