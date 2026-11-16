import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { categorize, otherKindOf, phaseOf } from './weakness'

// Real positions from Lu's games (30.10.2026 analysis)
describe('categorize', () => {
  it('queen moved to a square where a pawn takes it = piece left hanging', () => {
    const fen = 'rnb1kb1r/pp3ppp/2p1p2n/3pP3/3P1P1q/2P4P/PP2K3/RNBQ1BNR b kq - 2 8'
    const after = new Chess(fen)
    after.move('Qg4+')
    expect(categorize({ fen, played: 'Qg4+', best: 'b7b6', pv: ['b7b6'], kind: 'blunder', refutation: { best: 'h3g4', pv: ['h3g4', 'h6g4', 'e2e1'], score: { cp: 850 } } })).toBe('hung-piece')
  })

  it('a piece that was already attacked and stays there = threat not seen', () => {
    // 7.Qe2? leaves f2 to the knight on g4 (Nxf2 forks queen... wins the rook)
    const fen = 'rnbqk2r/p2p1ppp/2p5/1pb1p3/4P1n1/1BNP4/PPP2PPP/R1BQK1NR w KQkq - 1 7'
    expect(categorize({ fen, played: 'Qe2', best: 'd1g4', pv: ['d1g4', 'e8g8'], kind: 'blunder', refutation: { best: 'g4f2', pv: ['g4f2', 'g1f3', 'f2h1'], score: { cp: 300 } } })).toBe('ignored-threat')
  })

  it('opponent can mate = checkmate allowed', () => {
    const fen = 'rnbkr3/p2p1ppp/2p5/1p6/3b4/1B6/PPPP1PPP/RNB1R1K1 w - - 4 13'
    expect(categorize({ fen, played: 'Bxf7', best: 'e1e8', pv: ['e1e8'], kind: 'blunder', refutation: { best: 'e8e1', pv: ['e8e1'], score: { mate: 1 } } })).toBe('allowed-mate')
  })

  it('best move wins a rook, the opponent just goes on = free piece not taken', () => {
    const fen = 'r4rk1/pp3ppp/8/8/4R1n1/3P4/PP3qPP/RN1Q3K b - - 1 16'
    expect(categorize({ fen, played: 'Qf6', best: 'f2b2', pv: ['f2b2', 'e4g4', 'b2a1'], kind: 'blunder', refutation: { best: 'd1e2', pv: ['d1e2'], score: { cp: 0 } } })).toBe('free-piece')
  })

  it("when both happened, the opponent's side counts first (as in the analysis)", () => {
    // 16...Qf6 missed Qxb2xa1 AND left the knight on g4 to the rook
    const fen = 'r4rk1/pp3ppp/8/8/4R1n1/3P4/PP3qPP/RN1Q3K b - - 1 16'
    expect(categorize({ fen, played: 'Qf6', best: 'f2b2', pv: ['f2b2', 'e4g4', 'b2a1'], kind: 'blunder', refutation: { best: 'e4g4', pv: ['e4g4'], score: { cp: 400 } } })).toBe('ignored-threat')
  })

  it('missed mate stays missed mate', () => {
    expect(categorize({ fen: '7r/pp3k2/1b3pp1/1P1p4/2NP1n1r/2P2B2/PB3P2/R3RK2 b - - 0 26', played: 'dxc4', best: 'h4h1', pv: [], kind: 'missed-mate' })).toBe('missed-mate')
  })
})

describe('phaseOf', () => {
  it('opening, middlegame and endgame', () => {
    expect(phaseOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('opening')
    expect(phaseOf('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 20')).toBe('middlegame')
    expect(phaseOf('8/5pk1/6p1/3R4/8/6P1/5PK1/3r4 w - - 0 40')).toBe('endgame')
  })
})

describe('otherKindOf', () => {
  const start = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' // 1.e4 e5
  it('engine develops, you push a side pawn = development missed', () => {
    expect(otherKindOf({ fen: start, played: 'h4', best: 'g1f3' })).toBe('development')
  })
  it('you develop too = not development', () => {
    expect(otherKindOf({ fen: start, played: 'Nc3', best: 'g1f3' })).toBe('positional')
  })
  it("the opponent's best line gives check = king came under attack", () => {
    // 1.e4 e5 2.f3? – Black answers Qh4+
    expect(otherKindOf({ fen: start, played: 'f3', best: 'g1f3', refutation: { best: 'd8h4', pv: ['d8h4', 'g2g3'], score: { cp: 250 } } })).toBe('king-attack')
  })
  it('the line wins material only after more than 4 moves = lost a bit later', () => {
    // 2.Qg4? d5 3.exd5 Bxg4: the line ends with Black winning the queen
    expect(otherKindOf({ fen: start, played: 'Qg4', best: 'g1f3', refutation: { best: 'd7d5', pv: ['d7d5', 'e4d5', 'c8g4'], score: { cp: 800 } } })).toBe('later-loss')
  })
  it('later than move 12, nothing of the above = position got worse', () => {
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2QK2R w KQ - 0 13'
    expect(otherKindOf({ fen, played: 'a3', best: 'e1g1' })).toBe('positional')
  })
})
