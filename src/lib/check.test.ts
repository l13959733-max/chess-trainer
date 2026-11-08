import { describe, expect, it } from 'vitest'
import { bookReport, buildBook, compare, followBook, shapeReport } from './check'
import { romeDone } from './portal'
import type { Puzzle } from './db'
import { builtinLines } from './repertoire'

describe('chess check', () => {
  it('finds where you leave your book and which moves your book does not cover', () => {
    const r = bookReport(
      [
        { pgn: '1. e4 d5 2. e5 Bf5 *', color: 'w' }, // you leave: the book plays 2.exd5
        { pgn: '1. e4 a6 2. d4 b5 *', color: 'w' }, // St. George's Defense 1...a6 is not in the book
        { pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 *', color: 'w' }, // all book
        { pgn: '1. e4 e5 2. Bc4 Nf6 *', color: 'b' }, // 2.Bc4 against you is not covered
      ],
      builtinLines,
    )
    expect(r.w.games).toBe(3)
    expect(r.w.youLeft).toBe(1)
    expect(r.w.youLeftAt[0]).toMatchObject({ moves: '1.e4 d5', played: 'e5' })
    expect(r.w.youLeftAt[0].book).toContain('exd5')
    expect(r.w.theyLeft).toBe(1)
    expect(r.w.gaps[0]).toMatchObject({ moves: '1.e4', played: 'a6' })
    expect(r.b.gaps[0]).toMatchObject({ moves: '1.e4 e5', played: 'Bc4' })
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

describe('portal to the real world', () => {
  it('Rome quest: a real 1.e4 e5 game that follows the book', () => {
    const book = buildBook(builtinLines)
    const f = (pgn: string) => followBook({ pgn, color: 'w' }, book)
    expect(romeDone(f('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 *'))).toBe(true) // 4 own book moves
    expect(romeDone(f('1. e4 e5 2. Nf3 Qe7 3. Bc4 *'))).toBe(true) // the opponent left the book first
    expect(romeDone(f('1. e4 e5 2. Qh5 Nc6 3. Bc4 *'))).toBe(false) // you left the book with 2.Qh5
    expect(romeDone(f('1. e4 d5 2. exd5 Qxd5 3. Nc3 *'))).toBe(false) // not 1...e5
  })

  it('compare: the report shows start and now side by side', () => {
    const c = compare({ mistakes: 3.9, threats: 1.4, rating: 602 }, { games: 20, mistakes: 3.1, threats: 0.9, chances: 1 }, 640)
    expect(c.better).toBe(true)
    expect(c.mistakes).toEqual({ before: 3.9, now: 3.1 })
    expect(c.rating).toEqual({ before: 602, now: 640 })
  })
})
