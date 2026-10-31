import { describe, expect, it } from 'vitest'
import { chapters } from './chapters'
import { branchMove, guideFor } from './guide'
import { builtinLines } from './repertoire'

describe('guide', () => {
  it('every chapter of the built-in repertoire has a description', () => {
    const missing = chapters(builtinLines).filter((c) => !guideFor(c.lines[0].opening, c.side)).map((c) => c.key)
    expect(missing).toEqual([])
  })

  it('branchMove finds where a line leaves its neighbours', () => {
    const mk = (s: string) => ({ moves: s.split(' ').map((san, i) => ({ san, color: (i % 2 ? 'b' : 'w') as 'w' | 'b' })) })
    const a = mk('e4 d5 exd5 Qxd5 Nc3 Qa5')
    const b = mk('e4 d5 exd5 Qxd5 Nc3 Qd6')
    const c = mk('e4 d5 exd5 Nf6')
    expect(branchMove(b, [a, b, c])).toBe('3...Qd6')
    expect(branchMove(c, [a, b, c])).toBe('2...Nf6')
    expect(branchMove(a, [a])).toBeNull()
  })
})
