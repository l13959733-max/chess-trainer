import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { builtinLines } from './repertoire'
import { CROSSROADS, FORKS, GRAIN, LEWIS, LORD_FOG, MATES, QUEEN_TACTICS, RIDDLES, ROOK_MATES, STATIONS, TURK, isOpen, lineRounds, stationLines, type BoardRound } from './king'

const play = (r: BoardRound) => {
  const c = new Chess(r.fen)
  const m = c.move({ from: r.from, to: r.to })
  return { c, m }
}

describe('King of Chess', () => {
  it("Lord Fog's answers are legal and are the moves from the London lines", () => {
    const london = builtinLines.filter((l) => l.opening === 'London System')
    for (const r of LORD_FOG) {
      expect(play(r).m.san).toBe(r.san)
      const placement = r.fen.split(' ')[0]
      const inLine = london.some((l) => l.moves.some((m) => m.fenBefore.split(' ')[0] === placement && m.san === r.san))
      const inComment = london.some((l) => l.moves.some((m) => m.comment?.includes(r.san)))
      expect(r.fromComment ? inComment : inLine).toBe(true)
    }
  })

  it('every mate is checkmate, every fork gives check', () => {
    for (const r of [...MATES, ...ROOK_MATES, QUEEN_TACTICS[1], QUEEN_TACTICS[2]]) {
      const { c, m } = play(r)
      expect(m.san).toBe(r.san)
      expect(c.isCheckmate()).toBe(true)
    }
    for (const r of [...FORKS, QUEEN_TACTICS[0]]) {
      const { c, m } = play(r)
      expect(m.san).toBe(r.san)
      expect(c.inCheck()).toBe(true)
      expect(c.isCheckmate()).toBe(false)
    }
  })

  it('crossroads offer legal moves, and the right ones are in the White repertoire', () => {
    const white = builtinLines.filter((l) => l.side === 'w')
    for (const x of CROSSROADS) {
      const placement = x.fen.split(' ')[0]
      for (const o of x.options) {
        const san = o.san.replace(/^\d+\./, '')
        expect(() => new Chess(x.fen).move(san)).not.toThrow()
        const known = white.some((l) => l.moves.some((m) => m.fenBefore.split(' ')[0] === placement && m.san === san))
        expect(known).toBe(!!o.ok)
      }
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

  it('quiz answers are among the options; the grain sums are right', () => {
    for (const q of [...GRAIN, ...LEWIS, ...TURK, ...STATIONS.flatMap((s) => s.boss.quiz ?? [])]) expect(q.options).toContain(q.answer)
    expect(2 ** 4).toBe(16)
    expect(2 ** 10).toBe(1024)
    expect((2n ** 64n - 1n).toString()).toBe('18446744073709551615')
  })

  it('stations with lines find them in the repertoire', () => {
    for (const s of STATIONS.filter((x) => x.lines)) {
      const { opening, side, title } = s.lines!
      const found = builtinLines.filter((l) => l.opening === opening && l.side === side && (!title || l.title.includes(title)))
      expect(found.length, s.id).toBeGreaterThan(0)
    }
  })

  it('Chennai opens only when every other boss is beaten', () => {
    const chennai = STATIONS.find((s) => s.id === 'chennai')!
    const others = STATIONS.filter((s) => !s.finale).map((s) => s.id)
    expect(isOpen(chennai, others.slice(1))).toBe(false)
    expect(isOpen(chennai, others)).toBe(true)
    expect(STATIONS.filter((s) => !isOpen(s, [])).map((s) => s.id)).toEqual(['chennai'])
  })

  it("line bosses only ask positions with one answer in the station's book", () => {
    for (const s of STATIONS.filter((x) => x.lines)) {
      const lines = stationLines(s, builtinLines)
      for (let k = 0; k < 20; k++)
        for (const r of lineRounds(lines, 4)) {
          const place = r.fen.split(' ')[0]
          const moves = new Set(lines.flatMap((l) => l.moves.filter((m) => m.color === l.side && m.fenBefore.split(' ')[0] === place).map((m) => m.san)))
          expect([...moves], s.id).toEqual([r.san])
          expect(new Chess(r.fen).move({ from: r.from, to: r.to }).san).toBe(r.san)
        }
      expect(lineRounds(lines, 4).length, s.id).toBeGreaterThanOrEqual(Math.min(4, lines.length))
    }
  })
})
