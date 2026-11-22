import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { sanLine, winsText, wrongText } from './explainWrong'

const after = (moves: string) => {
  const c = new Chess()
  for (const m of moves.split(' ')) c.move(m)
  return c.fen()
}

describe('why your move was wrong', () => {
  it('names a mate honestly', () => {
    const fen = after('f3 e5')
    const t = wrongText({ fen, wrong: 'g2g4', right: 'e2e4', kind: 'react', afterWrong: { score: { mate: 1 }, pv: ['d8h4'] }, afterRight: { score: { cp: 30 } } })
    expect(t).toBe('g4 is a mistake: Black answers Qh4# and it leads to mate. The line: 2...Qh4#. The right move was e4.')
  })
  it('says what the right move would have won', () => {
    // 1.d4 e5? 2.dxe5 Qh4?? – the right move 3.Nf3 wins the queen, 3.g3 does not
    const fen = after('d4 e5 dxe5 Qh4')
    const t = wrongText({ fen, wrong: 'a2a3', right: 'g1f3', kind: 'punish', afterWrong: { score: { cp: 0 }, pv: ['h4e4'] }, afterRight: { score: { cp: -900 }, pv: ['h4e4', 'f3e1'] } })
    expect(t).toContain('The right move was Nf3')
  })
  it('a move nearly as good is "not bad", with the book move', () => {
    const fen = after('d4 Nf6 c4 e6')
    const t = wrongText({ fen, wrong: 'b1c3', right: 'g2g3', kind: 'book', afterWrong: { score: { cp: -10 }, pv: ['f8b4'] }, afterRight: { score: { cp: -40 } } })
    expect(t).toBe('Nc3 is not bad – but your book move here is g3.')
  })
  it('counts what the engine line wins, trades cancel out', () => {
    const start = new Chess().fen()
    expect(winsText(start, ['e2e4', 'd7d5', 'e4d5', 'd8d5'], 'w')).toBe('')
    expect(winsText(start, ['e2e4', 'd7d5', 'e4d5', 'g8f6', 'b1c3'], 'w')).toBe('and wins a pawn')
    expect(sanLine(start, ['e2e4', 'e7e5', 'g1f3'], 3)).toBe('1.e4 e5 2.Nf3')
  })
})
