import { describe, expect, it } from 'vitest'
import { explainBest, explainMistake } from './explain'

// Real puzzle from Lu's game vs Tom1pouce: Black played 11...Nxe5?, best was 11...Ne7
const TOM = 'r2qk2r/ppp2pp1/2nbpn1p/3pN3/3P1B2/P1NPP3/1P3PPP/R2QR1K1 b kq - 3 11'

describe('explainMistake', () => {
  it('finds the pawn fork after Nxe5 dxe5 and the material lost', () => {
    const e = explainMistake(TOM, 'Nxe5', { score: { cp: 542 }, pv: ['d4e5', 'd6e7', 'e5f6', 'e7f6', 'd3d4', 'c7c6'] })
    const text = e.sentences.join(' ')
    expect(text).toContain('White answers dxe5 and takes your knight on e5')
    expect(text).toContain('your bishop on d6 and your knight on f6 at the same time – a fork')
    expect(text).toContain('2 pawns down')
    expect(e.line.map((s) => s.san)).toEqual(['Nxe5', 'dxe5', 'Be7', 'exf6', 'Bxf6', 'd4', 'c6'])
  })

  it('reports a forced mate', () => {
    // Black to move plays ...g6?? and allows Qxf7#-style mate: use the scholar's mate setup
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'
    const e = explainMistake(fen, 'Nf6', { score: { mate: 1 }, pv: ['h5f7'] })
    expect(e.sentences[0]).toBe('After Nf6, White can force checkmate in 1: Qxf7#.')
  })

  it('names a free piece', () => {
    // White plays Bc4-b5?? into ...a6? No – simpler: White moves the queen to d5 where the knight on f6 takes it
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 4 4'
    const e = explainMistake(fen, 'Qg4', { score: { cp: 900 }, pv: ['f6g4'] })
    expect(e.sentences[0]).toBe('Black answers Nxg4 and takes your queen on g4 – after your move it was not protected any more.')
    expect(e.sentences.join(' ')).toContain('9 pawns down')
  })

  it('finds a pin to the king', () => {
    // After 1.e4 e5 2.Nf3 Nc6 3.d4? exd4 4.Nxd4?? — use a direct pin: Bb5 pins the c6 knight in front of the king on e8
    const fen = 'r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4'
    const e = explainMistake(fen, 'Nc3', { score: { cp: 0 }, pv: ['c8g4'] })
    // Bg4 pins the f3 knight to the queen on d1
    expect(e.sentences.join(' ')).toContain('It pins your knight on f3: if it moves, your queen on d1 is lost.')
  })
})

describe("more motifs (real positions from Lu's games)", () => {
  it('a capture answered by a much bigger recapture is not called a trade', () => {
    const fen = 'r3k2r/pp2qpp1/3ppn1p/1N1p4/5B2/P2PP3/1P3PPP/R2QR1K1 b kq - 1 14'
    const e = explainMistake(fen, 'Rc8', { score: { cp: 337 }, pv: ['b5d6', 'e7d6', 'f4d6'] })
    expect(e.sentences[0]).toBe('White answers Nxd6+ with check and takes your pawn on d6.')
    expect(e.sentences.join(' ')).toContain('your rook on c8 and your king on e8 at the same time – a fork')
    expect(e.sentences.join(' ')).not.toContain('trapped')
  })
  it('a trade is called a trade, not a loss', () => {
    const fen = 'r1bqk1nr/pp2bpp1/2n4p/2p5/2Bp4/3P1N2/PPP2PPP/RNBQR1K1 b kq - 3 9'
    const e = explainMistake(fen, 'Be6', { score: { cp: 200 }, pv: ['c4e6', 'f7e6', 'c1f4', 'g8f6'] })
    expect(e.sentences[0]).toBe('White trades with Bxe6, fxe6.')
  })
  it('names a single attack, and only calls a piece trapped when it has no way out', () => {
    const fen = '2kr3r/pp5p/7b/1N1p4/8/2N5/PPR1BPPP/6K1 w - - 0 21'
    const e = explainMistake(fen, 'Nxa7+', { score: { cp: 225 }, pv: ['c8b8', 'c3b5', 'd5d4'] })
    expect(e.sentences.join(' ')).toContain('It attacks your knight on a7.')
    expect(e.sentences.join(' ')).not.toContain('trapped') // it can go back to b5
    const d4 = explainMistake('1k1r3r/Np5p/7b/3p4/8/2N5/PPR1BPPP/6K1 w - - 1 22', 'Nab5', { score: { cp: 248 }, pv: ['d5d4', 'c3e4', 'd4d3'] })
    expect(d4.sentences.join(' ')).toContain('It attacks your knight on c3.')
  })
})

describe('explainBest', () => {
  it('describes a quiet best move', () => {
    const e = explainBest(TOM, ['c6e7', 'd1f3', 'a8b8'], { cp: -32 })
    expect(e.sentences.join(' ')).toContain('Ne7 keeps your pieces safe and keeps the game balanced')
  })
  it('describes a winning capture', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P1Q1/2N5/PPPP1PPP/R1B1KBNR b KQkq - 5 4'
    const e = explainBest(fen, ['f6g4'], { cp: 900 })
    expect(e.sentences.join(' ')).toBe('Nxg4 takes the queen on g4. After Nxg4 you win a queen – 9 pawns up.')
  })
  it('describes a mate', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4'
    expect(explainBest(fen, ['h5f7'], { mate: 1 }).sentences[0]).toBe('Qxf7# leads to checkmate in 1: Qxf7#.')
  })
})
