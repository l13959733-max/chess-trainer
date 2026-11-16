import { describe, expect, it } from 'vitest'
import { canRewind, rewindPath, rewindTo } from './rewind'

// a line of 12 plies, White starts
const line: ('w' | 'b')[] = Array.from({ length: 12 }, (_, i) => (i % 2 ? 'b' : 'w'))

describe('strict drill rewind', () => {
  it('as White: a mistake on your 5th move (ply 8) goes back to your 3rd move (ply 4)', () => {
    // your moves: plies 0,2,4,6,8 – replay 4, 6 and 8
    expect(rewindTo(line, 'w', 8)).toBe(4)
  })

  it('as Black: a mistake on ply 9 goes back to ply 5 (replay 5, 7, 9)', () => {
    expect(rewindTo(line, 'b', 9)).toBe(5)
  })

  it('near the start of the line: back to move 1', () => {
    expect(rewindTo(line, 'w', 2)).toBe(0) // only two own moves so far
    expect(rewindTo(line, 'w', 4)).toBe(0) // exactly three: plies 0, 2, 4
    expect(rewindTo(line, 'b', 3)).toBe(0)
  })

  it('the same spot at most twice', () => {
    expect([canRewind(0), canRewind(1), canRewind(2)]).toEqual([true, true, false])
  })

  it('the visible way back goes ply by ply', () => {
    expect(rewindPath(9, 4)).toEqual([8, 7, 6, 5, 4])
  })
})
