import { expect, it } from 'vitest'
import { bookMove, buildBook } from './book'
import { parsePgn } from './pgn'

const pgn = `[Event "A"]
[Side "White"]

1. e4 e5 2. Nf3 Nc6 *

[Event "B"]
[Side "Black"]

1. e4 d5 2. exd5 Qxd5 *`

it('answers book positions with moves from the lines, and nothing outside them', () => {
  const book = buildBook(parsePgn(pgn).lines)
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  expect(bookMove(book, start)).toBe('e2e4')
  const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
  const seen = new Set([0.1, 0.9].map((r) => bookMove(book, afterE4, () => r)))
  expect(seen).toEqual(new Set(['e7e5', 'd7d5']))
  expect(bookMove(book, '8/8/8/8/8/8/8/K6k w - - 0 1')).toBeNull()
})
