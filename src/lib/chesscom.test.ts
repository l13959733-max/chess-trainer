import { describe, expect, it } from 'vitest'
import { isTrainingGame, myColor, type ChessComGame } from './chesscom'

const game = (over: Partial<ChessComGame>): ChessComGame => ({
  uuid: 'x', url: '', pgn: '1. e4 *', end_time: 0, time_class: 'rapid', rules: 'chess', rated: true,
  white: { username: 'L0o2', result: 'win', rating: 600 }, black: { username: 'other', result: 'resigned', rating: 600 },
  ...over,
})

describe('chess.com filter', () => {
  it('keeps rapid and daily standard games of the player', () => {
    expect(isTrainingGame(game({}))).toBe(true)
    expect(isTrainingGame(game({ time_class: 'daily' }))).toBe(true)
  })
  it('drops blitz, bullet, variants and other players', () => {
    expect(isTrainingGame(game({ time_class: 'blitz' }))).toBe(false)
    expect(isTrainingGame(game({ time_class: 'bullet' }))).toBe(false)
    expect(isTrainingGame(game({ rules: 'chess960' }))).toBe(false)
    expect(isTrainingGame(game({ white: { username: 'a', result: '', rating: 0 } }))).toBe(false)
  })
  it('finds my color case-insensitively', () => {
    expect(myColor(game({}))).toBe('w')
    expect(myColor(game({ white: { username: 'x', result: '', rating: 0 }, black: { username: 'l0O2', result: '', rating: 0 } }))).toBe('b')
  })
})
