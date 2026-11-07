import { describe, expect, it } from 'vitest'
import { bookReport, shapeReport } from './check'
import type { Puzzle } from './db'
import { builtinLines } from './repertoire'

describe('chess check', () => {
  it('finds where you leave your book and which moves your book does not cover', () => {
    const r = bookReport(
      [
        { pgn: '1. e4 d5 2. e5 Bf5 *', color: 'w' }, // you leave: the book plays 2.exd5
        { pgn: '1. e4 Nf6 2. e5 Nd5 *', color: 'w' }, // the Alekhine is not in the book
        { pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 *', color: 'w' }, // all book
        { pgn: '1. e4 e5 2. Qh5 Nc6 *', color: 'b' }, // 2.Qh5 against you is not covered
      ],
      builtinLines,
    )
    expect(r.w.games).toBe(3)
    expect(r.w.youLeft).toBe(1)
    expect(r.w.youLeftAt[0]).toMatchObject({ moves: '1.e4 d5', played: 'e5' })
    expect(r.w.youLeftAt[0].book).toContain('exd5')
    expect(r.w.theyLeft).toBe(1)
    expect(r.w.gaps[0]).toMatchObject({ moves: '1.e4', played: 'Nf6' })
    expect(r.b.gaps[0]).toMatchObject({ moves: '1.e4 e5', played: 'Qh5' })
    expect(r.w.inBook).toBeGreaterThan(2)
  })

  it('counts mistakes per game and finds the most expensive habit', () => {
    const p = (category: Puzzle['category']) => ({ category }) as Puzzle
    const s = shapeReport(4, [p('hung-piece'), p('hung-piece'), p('ignored-threat'), p('free-piece')])
    expect(s.mistakes).toBe(1)
    expect(s.threats).toBe(0.75)
    expect(s.chances).toBe(0.25)
    expect(s.worst?.category).toBe('hung-piece')
  })
})
