import { describe, expect, it } from 'vitest'
import { pointsFor, rushMoves, sqCoords, sqName, starsFor } from './rush'

describe('square rush', () => {
  it('names squares like the board', () => {
    expect(sqName(0, 0)).toBe('a1')
    expect(sqName(6, 1)).toBe('g2')
    expect(sqCoords('f3')).toEqual([5, 2])
  })
  it('knight from g1 reaches f3, h3 and e2', () => {
    expect(rushMoves('N', 6, 0).sort()).toEqual(['e2', 'f3', 'h3'])
  })
  it('bishop on g2 sees the long diagonal', () => {
    const m = rushMoves('B', 6, 1)
    for (const sq of ['f3', 'e4', 'd5', 'c6', 'b7', 'a8', 'h1', 'h3', 'f1']) expect(m).toContain(sq)
    expect(m).toHaveLength(9)
  })
  it('rook and queen on an empty board', () => {
    expect(rushMoves('R', 0, 0)).toHaveLength(14)
    expect(rushMoves('Q', 3, 3)).toHaveLength(27)
    expect(rushMoves('K', 0, 0).sort()).toEqual(['a2', 'b1', 'b2'])
  })
  it('pawns walk forward, two steps from the start', () => {
    expect(rushMoves('P', 4, 1).sort()).toEqual(['e3', 'e4'])
    expect(rushMoves('P', 4, 2)).toEqual(['e4'])
    expect(rushMoves('P', 4, 6, true).sort()).toEqual(['e5', 'e6'])
    expect(rushMoves('P', 4, 7)).toEqual([])
  })
  it('points and stars', () => {
    expect(pointsFor(1)).toBe(10)
    expect(pointsFor(4)).toBe(40)
    expect(starsFor(100)).toBe(0)
    expect(starsFor(900)).toBe(3)
  })
})
