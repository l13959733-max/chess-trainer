import { describe, expect, it } from 'vitest'
import { computeStats } from './opponents'
import { builtinLines } from './repertoire'

const g = (color: 'w' | 'b', s: string) => ({ color, sans: s.split(' ') })

describe('opponent stats', () => {
  it("counts answers, finds the chapter and the player's own detours", () => {
    const stats = computeStats(
      [
        g('w', 'e4 d5 e5 c5 Nf3'), // Lu leaves the Scandinavian line with 2.e5 (line: 2.exd5)
        g('w', 'e4 d5 e5 Bf5 d4'),
        g('w', 'e4 d5 exd5 Qxd5 Nc3 Qa5'),
        g('w', 'e4 e5 Nf3 Nc6 Bc4 Bc5'),
        g('b', 'e4 d5 exd5 Qxd5 Nc3 Qa5'),
      ],
      builtinLines,
      () => false,
    )
    expect(stats.firstMoves.w[0]).toEqual({ san: 'd5', games: 3 })
    expect(stats.firstMoves.b[0]).toEqual({ san: 'e4', games: 1 })
    expect(stats.chapters[0].key).toBe('Scandinavian|w')
    expect(stats.chapters[0].games).toBe(3)
    expect(stats.detours[0]).toMatchObject({ played: 'e5', expected: 'exd5', games: 2, moveNo: '2.' })
  })
})

it('a game that fits several chapters equally is not counted for any of them', () => {
  const stats = computeStats([g('w', 'e4 e5 d4 exd4 Qxd4')], builtinLines, () => false)
  expect(stats.chapters).toEqual([])
  expect(stats.detours).toEqual([])
})
