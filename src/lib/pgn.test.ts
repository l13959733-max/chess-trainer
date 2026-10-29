import { describe, expect, it } from 'vitest'
import { parseComment, parsePgn, splitGames } from './pgn'

const TWO = `[Event "One"]
[Side "White"]

1. e4 {Center. [%cal Gd2d4,Rf1c4]} e5 2. Nf3 *

[Event "Two"]
[Side "Black"]

1. d4 d5 {Counter in the center.} 2. c4 e6 *`

describe('splitGames', () => {
  it('splits multiple games', () => {
    expect(splitGames(TWO)).toHaveLength(2)
  })
  it('empty input gives no games', () => {
    expect(splitGames('  \n ')).toEqual([])
  })
  it('handles Windows line endings', () => {
    expect(splitGames(TWO.replace(/\n/g, '\r\n'))).toHaveLength(2)
  })
})

describe('parsePgn', () => {
  const { lines, errors } = parsePgn(TWO)

  it('reads title and side', () => {
    expect(errors).toEqual([])
    expect(lines.map((l) => [l.title, l.side])).toEqual([['One', 'w'], ['Two', 'b']])
  })

  it('attaches comments to the right move', () => {
    expect(lines[0].moves[0].comment).toBe('Center.')
    expect(lines[0].moves[1].comment).toBeUndefined()
    expect(lines[1].moves[1]).toMatchObject({ san: 'd5', color: 'b', comment: 'Counter in the center.' })
  })

  it('reads arrows from [%cal]', () => {
    expect(lines[0].moves[0].arrows).toEqual([
      { color: 'G', from: 'd2', to: 'd4' },
      { color: 'R', from: 'f1', to: 'c4' },
    ])
  })

  it('stores the position before and after each move', () => {
    const m = lines[0].moves[0]
    expect(m.fenBefore.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP')).toBe(true)
    expect(m.fenAfter.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP')).toBe(true)
    expect(lines[0].moves[1].fenBefore).toBe(m.fenAfter)
  })

  it('IDs are stable and unique', () => {
    expect(parsePgn(TWO).lines.map((l) => l.id)).toEqual(lines.map((l) => l.id))
    expect(lines[0].id).not.toBe(lines[1].id)
  })

  it('reports illegal moves without losing the other lines', () => {
    const r = parsePgn(TWO + '\n\n[Event "Broken"]\n\n1. e4 e5 2. Ke3 *')
    expect(r.lines).toHaveLength(2)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toBe('Broken: illegal move Ke3')
  })

  it('uses the chosen side when there is no Side header', () => {
    expect(parsePgn('1. e4 c6 2. d4 d5 *', 'b').lines[0].side).toBe('b')
  })

  it('builds a title from the moves when there is no Event header', () => {
    expect(parsePgn('1. e4 c6 2. d4 d5 *').lines[0].title).toBe('e4 c6 d4 d5')
  })
})

describe('parseComment', () => {
  it('strips other annotations like [%clk]', () => {
    expect(parseComment('Good. [%clk 0:05:00]')).toEqual({ text: 'Good.', arrows: [] })
  })
})
