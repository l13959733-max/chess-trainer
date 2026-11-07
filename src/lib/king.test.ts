import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { builtinLines } from './repertoire'
import { LORD_FOG, RIDDLES, STATIONS } from './king'

describe('King of Chess', () => {
  it("Lord Fog's answers are legal and are the moves from the London lines", () => {
    const london = builtinLines.filter((l) => l.opening === 'London System')
    for (const r of LORD_FOG) {
      const c = new Chess(r.fen)
      expect(c.move({ from: r.from, to: r.to }).san).toBe(r.san)
      const placement = r.fen.split(' ')[0]
      const inLine = london.some((l) => l.moves.some((m) => m.fenBefore.split(' ')[0] === placement && m.san === r.san))
      const inComment = london.some((l) => l.moves.some((m) => m.comment?.includes(r.san)))
      expect(r.fromComment ? inComment : inLine).toBe(true)
    }
  })

  it('the riddles follow the shatranj elephant: exactly two squares diagonally', () => {
    const jumps = (sq: string) => {
      const f = sq.charCodeAt(0) - 97
      const r = Number(sq[1])
      return [[2, 2], [2, -2], [-2, 2], [-2, -2]].map(([df, dr]) => [f + df, r + dr]).filter(([x, y]) => x >= 0 && x < 8 && y >= 1 && y <= 8).map(([x, y]) => String.fromCharCode(97 + x) + y)
    }
    expect(jumps('g5')).toContain(RIDDLES[0].options.find((o) => o.ok)!.text)
    expect(jumps('d4')).not.toContain(RIDDLES[1].options.find((o) => o.ok)!.text)
    for (const o of RIDDLES[1].options.filter((x) => !x.ok)) expect(jumps('d4')).toContain(o.text)
  })

  it('stage 1 opens exactly Kannauj, Persia and London', () => {
    expect(STATIONS.filter((s) => s.open).map((s) => s.id)).toEqual(['kannauj', 'persia', 'london'])
  })
})
