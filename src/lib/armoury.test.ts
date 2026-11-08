import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import PUZZLES from '../data/lichess-puzzles.json'
import { REAL_GAMES, SLICES, STAGES, TECHNIQUES, finishStage, isOpen, medal, passed, realCheck, type Armoury } from './armoury'
import type { GameRecord, Puzzle } from './db'

const all = PUZZLES as Record<string, { id: string; fen: string; moves: string[]; rating: number }[]>

describe('armoury puzzles', () => {
  it('every technique has enough puzzles for all stages, and every one is legal', () => {
    const need = Math.max(...Object.values(SLICES).map(([, to]) => to))
    for (const t of TECHNIQUES) {
      const list = all[t.theme]
      expect(list?.length ?? 0, t.id).toBeGreaterThanOrEqual(need)
      for (const p of list.slice(0, need)) {
        const c = new Chess(p.fen)
        for (const m of p.moves) expect(() => c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }), `${t.id} ${p.id}`).not.toThrow()
      }
    }
  })
  it('ids are unique', () => {
    expect(new Set(TECHNIQUES.map((t) => t.id)).size).toBe(TECHNIQUES.length)
  })
})

describe('medals', () => {
  it('bronze after help, silver after the shield, gold only after the real world', () => {
    let a: Armoury = {}
    const order = STAGES.map((s) => s.stage)
    const seen: string[] = []
    for (const s of order) {
      a = finishStage(a, 'fork', s, 1000)
      seen.push(medal(a.fork))
    }
    expect(seen).toEqual(['none', 'bronze', 'bronze', 'silver', 'silver', 'gold'])
    expect(a.fork.silverAt).toBe(1000)
  })
  it('stages cannot be skipped', () => {
    expect(finishStage({}, 'fork', 'mixed')).toEqual({})
  })
  it('the next technique opens with the bronze of the one before', () => {
    const fork = TECHNIQUES.find((t) => t.id === 'fork')!
    expect(isOpen(TECHNIQUES[0], {})).toBe(true)
    expect(isOpen(fork, {})).toBe(false)
    expect(isOpen(fork, { guard: { done: 2 } })).toBe(true)
  })
  it('help never counts in the mixed round', () => {
    expect(passed('help', 3, 4)).toBe(true)
    expect(passed('alone', 1, 0)).toBe(true)
    expect(passed('alone', 2, 0)).toBe(false)
    expect(passed('alone', 0, 1)).toBe(false)
    expect(passed('mixed', 0, 0)).toBe(true)
    expect(passed('mixed', 1, 0)).toBe(false)
  })
})

describe('real world', () => {
  const fork = TECHNIQUES.find((t) => t.id === 'fork')!
  const rec = (uuid: string, t: number): GameRecord => ({ uuid, endTime: t, analyzedAt: 0, plies: 50, blunders: 0 })
  const pz = (gameUuid: string, category: Puzzle['category']) => ({ gameUuid, category }) as Puzzle
  it('needs REAL_GAMES games in a row after silver without that mistake', () => {
    const p = { done: 5, silverAt: 100_000 }
    const games = Array.from({ length: REAL_GAMES }, (_, i) => rec('g' + i, 200 + i))
    expect(realCheck(fork, p, games, []).ok).toBe(true)
    // the newest game has a missed fork: the run starts again
    expect(realCheck(fork, p, games, [pz('g' + (REAL_GAMES - 1), 'tactic')]).ok).toBe(false)
    // another kind of mistake does not count against the fork
    expect(realCheck(fork, p, games, [pz('g2', 'allowed-mate')]).ok).toBe(true)
    // games before silver do not count
    expect(realCheck(fork, p, games.map((g) => ({ ...g, endTime: 50 })), []).ok).toBe(false)
    expect(realCheck(fork, undefined, games, []).ok).toBe(false)
  })
})
