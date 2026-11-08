import { describe, expect, it } from 'vitest'
import { lichessGameAccuracy, moveAccuracy, scoreGame } from './accuracy'
import { gamePositions, type PositionEval } from './blunders'

const cp = (v: number): PositionEval => ({ score: { cp: v }, pv: [] })
const mate = (n: number): PositionEval => ({ score: { mate: n }, pv: [] })

// 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#
const { moves } = gamePositions('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#')
const evals = [cp(30), cp(-30), cp(40), cp(-60), cp(50), cp(-50), mate(1), mate(0)]

describe('moveAccuracy (Lichess formula)', () => {
  it('matches the published examples', () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 0)
    expect(moveAccuracy(10)).toBeCloseTo(64, 0) // "loses 10 % winning chance = 64 % accuracy"
    expect(moveAccuracy(20)).toBeCloseTo(40, 0)
    expect(moveAccuracy(100)).toBe(0)
  })
  it('never rewards a move for improving on the engine', () => {
    expect(moveAccuracy(-5)).toBeCloseTo(100, 0)
  })
})

describe('scoreGame', () => {
  it('Black: one blunder in three moves = 67 % safe, every number shown per move', () => {
    const g = scoreGame(moves, evals, 'b')
    expect(g.moves.map((m) => m.san)).toEqual(['e5', 'Nc6', 'Nf6'])
    expect(g.moves.map((m) => m.safe)).toEqual([true, true, false])
    expect(g.safePct).toBeCloseTo(66.7, 1)
    const nf6 = g.moves[2]
    expect(nf6.cpBefore).toBe(-50)
    expect(nf6.cpAfter).toBe(-1000) // mate in 1 against me, clamped
    expect(nf6.winLoss).toBeGreaterThan(40)
    // Worth knowing for Lu: allowing mate in 1 still scores about 13 % under the Lichess formula,
    // because the winning chance before was only ~45 %, so the drop is "only" ~45 points.
    expect(nf6.accuracy).toBeGreaterThan(10)
    expect(nf6.accuracy).toBeLessThan(15)
  })

  it('White: all moves safe = 100 %, and the Lichess number stays below 100 when moves lose a bit', () => {
    const g = scoreGame(moves, evals, 'w')
    expect(g.safePct).toBe(100)
    expect(g.lichess!).toBeGreaterThan(80)
    expect(g.lichess!).toBeLessThanOrEqual(100)
  })

  it('one big mistake pulls the Lichess number down more than the plain average', () => {
    const g = scoreGame(moves, evals, 'b')
    expect(g.lichess!).toBeLessThan(g.meanAccuracy!)
  })

  it('no moves → no numbers instead of fake ones', () => {
    expect(scoreGame([], [cp(0)], 'w')).toMatchObject({ safePct: null, lichess: null, meanAccuracy: null })
    expect(lichessGameAccuracy([50], [])).toBeNull()
  })
})
