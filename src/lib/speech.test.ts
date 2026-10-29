import { describe, expect, it } from 'vitest'
import { explanationText, sanToSpeech } from './speech'

describe('sanToSpeech', () => {
  it.each([
    ['e4', 'e4'],
    ['exd5', 'e takes d5'],
    ['Nf3', 'Knight to f3'],
    ['Bxf7+', 'Bishop takes f7, check'],
    ['Nbd2', 'Knight from b to d2'],
    ['Rfe1', 'Rook from f to e1'],
    ['R1a3', 'Rook from 1 to a3'],
    ['Qh4#', 'Queen to h4, checkmate'],
    ['O-O', 'Castles kingside'],
    ['O-O-O+', 'Castles queenside, check'],
    ['e8=Q', 'e8, promotes to a Queen'],
    ['axb8=N+', 'a takes b8, promotes to a Knight, check'],
    ['Kxf7', 'King takes f7'],
  ])('%s → %s', (san, words) => {
    expect(sanToSpeech(san)).toBe(words)
  })

  it('leaves unknown text unchanged', () => {
    expect(sanToSpeech('--')).toBe('--')
  })
})

describe('explanationText', () => {
  it('joins move and comment', () => {
    expect(explanationText('Bc4', 'Aims at f7.')).toBe('Bishop to c4. Aims at f7.')
  })
  it('works without a comment', () => {
    expect(explanationText('e5', undefined)).toBe('e5.')
  })
  it('adds a lead-in for corrections', () => {
    expect(explanationText('Nf3', undefined, 'The right move is')).toBe('The right move is knight to f3.')
  })
})
