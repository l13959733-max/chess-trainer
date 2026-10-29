import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { clampScore, findBlunders, gamePositions, pvToSan, terminalScore, uciToSan, type PositionEval } from './blunders'

const cp = (v: number, best = 'a1a1'): PositionEval => ({ score: { cp: v }, best, pv: [best] })
const mate = (n: number, best = 'a1a1'): PositionEval => ({ score: { mate: n }, best, pv: [best] })

// Short game: White = me. 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#
const PGN = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'
const { moves, finalFen } = gamePositions(PGN)

describe('clampScore', () => {
  it('clamps big swings and mates to ±1000', () => {
    expect([clampScore({ cp: 5000 }), clampScore({ cp: -50 }), clampScore({ mate: 3 }), clampScore({ mate: -2 }), clampScore({ mate: 0 })]).toEqual([
      1000, -50, 1000, -1000, -1000,
    ])
  })
})

describe('findBlunders', () => {
  it('finds a move that loses more than 2 pawns', () => {
    // Black (me) plays 3...Nf6 allowing mate: before -50 for me, after White has mate in 1
    const evals = [cp(30), cp(-30), cp(40), cp(-60), cp(50), cp(-50, 'd8e7'), mate(1, 'h5f7'), mate(0)]
    const b = findBlunders(moves, evals, 'b')
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ ply: 5, played: 'Nf6', best: 'd8e7', kind: 'blunder', loss: 950 })
  })

  it('ignores my moves that equal the engine move', () => {
    const evals = [cp(30), cp(-30), cp(40), cp(-60), cp(50), cp(-50, 'g8f6'), mate(1), mate(0)]
    expect(findBlunders(moves, evals, 'b')).toEqual([])
  })

  it('ignores small losses and swings inside a won position', () => {
    // White (me): +1500 → +1200 is no blunder (both clamp to 1000), 30 → -150 is only 1.8 pawns
    const evals = [cp(30), cp(150), cp(1500), cp(-1200), cp(50), cp(-50), cp(40), mate(0)]
    expect(findBlunders(moves, evals, 'w')).toEqual([])
  })

  it('counts a missed mate in 3 or less, even if still winning', () => {
    const evals = [cp(30), cp(-30), cp(40), cp(-60), mate(2, 'h5f7'), cp(-800), cp(40), mate(0)]
    const b = findBlunders(moves, evals, 'w')
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ ply: 4, kind: 'missed-mate', mateIn: 2, played: 'Bc4' })
  })

  it('a slower mate is not a missed mate', () => {
    const evals = [cp(30), cp(-30), cp(40), cp(-60), mate(2, 'h5f7'), mate(-3), cp(40), mate(0)]
    expect(findBlunders(moves, evals, 'w')).toEqual([])
  })

  it('a missed mate in 5 only counts through the 2-pawn rule', () => {
    const evals = [cp(30), cp(-30), cp(40), cp(-60), mate(5, 'h5f7'), cp(-900), cp(40), mate(0)]
    expect(findBlunders(moves, evals, 'w')).toEqual([])
  })
})

describe('helpers', () => {
  it('terminal positions', () => {
    expect(terminalScore(finalFen)).toEqual({ mate: 0 })
    expect(terminalScore(new Chess().fen())).toBeNull()
  })
  it('UCI to SAN and main line', () => {
    const start = new Chess().fen()
    expect(uciToSan(start, 'g1f3')).toBe('Nf3')
    expect(uciToSan(start, 'e2e5')).toBeNull()
    expect(pvToSan(start, ['e2e4', 'e7e5', 'g1f3', 'zzzz', 'b8c6'])).toEqual(['e4', 'e5', 'Nf3'])
  })
  it('game moves carry color, UCI and position', () => {
    expect(moves).toHaveLength(7)
    expect(moves[6]).toMatchObject({ san: 'Qxf7#', uci: 'h5f7', color: 'w' })
  })
})
