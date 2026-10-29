import { describe, expect, it } from 'vitest'
import { checkMove, firstPlayerPly, isFinished } from './drill'
import { parsePgn } from './pgn'

const white = parsePgn('[Event "W"]\n[Side "White"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *').lines[0]
const black = parsePgn('[Event "B"]\n[Side "Black"]\n\n1. e4 c6 2. d4 d5 3. Nc3 *').lines[0]
const promo = parsePgn('[Event "P"]\n[SetUp "1"]\n[FEN "8/P6k/8/8/8/8/8/K7 w - - 0 1"]\n[Side "White"]\n\n1. a8=N *').lines[0]

describe('checkMove', () => {
  it('accepts the right move', () => {
    expect(checkMove(white.moves[2], 'g1', 'f3')).toBe('correct')
  })
  it('a legal but different move is wrong', () => {
    expect(checkMove(white.moves[2], 'b1', 'c3')).toBe('wrong')
  })
  it('reports illegal moves separately', () => {
    expect(checkMove(white.moves[2], 'e4', 'e6')).toBe('illegal')
  })
  it('accepts an underpromotion from the repertoire; a queen there is wrong', () => {
    expect(checkMove(promo.moves[0], 'a7', 'a8')).toBe('correct')
    expect(checkMove(promo.moves[0], 'a7', 'a8', 'q')).toBe('wrong')
  })
})

describe('flow', () => {
  it('White moves first; in Black lines the app moves first', () => {
    expect(firstPlayerPly(white)).toBe(0)
    expect(firstPlayerPly(black)).toBe(1)
  })
  it('the line ends after the player\'s last move', () => {
    expect(isFinished(white, 4)).toBe(false)
    expect(isFinished(white, 5)).toBe(true)
    // A Black line ending on a White move: after 2...d5 there is nothing left to do
    expect(isFinished(black, 4)).toBe(true)
  })
})
