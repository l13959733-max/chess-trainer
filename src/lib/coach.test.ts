import { describe, expect, it } from 'vitest'
import { plans, verdict } from './coach'

describe('plans', () => {
  it('start position: develop and castle', () => {
    const p = plans('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')
    expect(p[0]).toMatch(/Bring out your knights and bishops/)
    expect(p.join(' ')).toMatch(/Castle soon/)
  })
  it('a piece in danger comes first', () => {
    // white knight e5 attacked by the d6 pawn
    const p = plans('rnb1kbnr/ppp2ppp/3p4/4N3/2B1P2q/6P1/PPPP1P1P/RNBQK2R w KQkq - 0 5', 'w')
    expect(p[0]).toMatch(/save your knight on e5/)
  })
})

describe('verdict', () => {
  const cands = [
    { uci: 'e2e4', score: { cp: 40 } },
    { uci: 'd2d4', score: { cp: 35 } },
    { uci: 'a2a3', score: { cp: -40 } },
    { uci: 'f2f3', score: { cp: -400 } },
  ]
  it('rates moves by lost winning chance', () => {
    expect(verdict(cands, 'e2e4')!.verdict).toBe('great')
    expect(verdict(cands, 'd2d4')!.verdict).toBe('great')
    expect(verdict(cands, 'a2a3')!.verdict).toBe('good')
    expect(verdict(cands, 'f2f3')!.verdict).toBe('blunder')
    expect(verdict(cands, 'f2f3')!.best.uci).toBe('e2e4')
  })
})

describe('reason', () => {
  it('names what a move does', async () => {
    const { reason } = await import('./coach')
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(reason(start, 'g1f3')).toMatch(/develops your knight/)
    expect(reason(start, 'e2e4')).toMatch(/center/)
    // white knight e5 attacked by the d6 pawn: moving it saves it
    expect(reason('rnb1kbnr/ppp2ppp/3p4/4N3/2B1P2q/6P1/PPPP1P1P/RNBQK2R w KQkq - 0 5', 'e5f3')).toMatch(/saves your knight/)
    // Nc7+ forks king and rook
    expect(reason('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7')).toMatch(/check/)
    expect(reason('r3k3/8/8/8/8/8/8/R3K3 w Q - 0 1', 'a1a8')).toMatch(/takes the rook/)
  })
})
