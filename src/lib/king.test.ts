import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { builtinLines } from './repertoire'
import {
  bareSan,
  openingName,
  CROSSROADS, FORKS, GRAIN, GUARD, GUARD_BOSS, LEWIS, LORD_FOG, MATES, QUEEN_TACTICS, RIDDLES, ROME_REACT, ROME_THREATS, ROME_TRAPS, ROOK_MATES, SAFE, STATIONS, TURK,
  isOpen, lineRounds, nextStation, stationLines, titleOf, type BoardRound,
} from './king'

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
    for (const s of STATIONS.filter((x) => x.lines)) expect(stationLines(s, builtinLines).length, s.id).toBeGreaterThan(0)
  })

  it('Chennai opens only when every other boss is beaten', () => {
    const chennai = STATIONS.find((s) => s.id === 'chennai')!
    const others = STATIONS.filter((s) => !s.finale).map((s) => s.id)
    expect(isOpen(chennai, others.slice(1))).toBe(false)
    expect(isOpen(chennai, others)).toBe(true)
  })

  it('the journey is guided: cities open one after another, beaten cities stay open', () => {
    const open = (beaten: string[]) => STATIONS.filter((s) => isOpen(s, beaten)).map((s) => s.id)
    expect(open([])).toEqual(['kannauj'])
    expect(open(['kannauj'])).toEqual(['kannauj', 'samarkand'])
    expect(open(['kannauj', 'samarkand', 'rome', 'baghdad'])).toContain('persia')
    expect(open(['kannauj', 'samarkand', 'rome', 'baghdad'])).not.toContain('north')
    // an old save with a city beaten out of order: that city stays open, the next gap opens
    expect(open(['valencia'])).toEqual(['kannauj', 'valencia'])
    // every city's "next" is the one the route opens
    let beaten: string[] = []
    for (let k = 0; k < STATIONS.length - 1; k++) {
      const n = nextStation(beaten.at(-1) ?? 'kannauj', beaten) ?? STATIONS.find((s) => s.id === 'kannauj')!
      const target = k === 0 ? 'kannauj' : n.id
      expect(isOpen(STATIONS.find((s) => s.id === target)!, beaten), target).toBe(true)
      beaten = [...beaten, target]
    }
    expect(beaten.length).toBe(STATIONS.length - 1)
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

  it('the guard: captures take a piece nobody guards, the rest is mate', () => {
    for (const r of [...GUARD, ...GUARD_BOSS]) {
      const { c, m } = play(r)
      expect(m.san, r.fen).toBe(r.san)
      if (c.isCheckmate()) continue
      expect(m.captured, r.fen).toBeTruthy()
      expect(c.isAttacked(m.to, 'b'), r.fen).toBe(false)
      // the only capture on the board: no other way to "take something"
      expect(new Chess(r.fen).moves({ verbose: true }).filter((x) => x.captured).length, r.fen).toBe(1)
    }
  })

  it('is it safe? – the answer is right', () => {
    for (const q of SAFE) {
      const c = new Chess(q.fen)
      const m = c.move({ from: q.move![0], to: q.move![1] })
      expect(q.answer).toBe(c.isAttacked(m.to, 'b') ? 'No' : 'Yes')
      expect(q.options).toContain(q.answer)
    }
  })

  it("Rome: the right answers are exactly the moves of Lu's White book", () => {
    const white = builtinLines.filter((l) => l.side === 'w')
    for (const x of ROME_REACT) {
      const placement = x.fen.split(' ')[0]
      expect(white.some((l) => l.moves.some((m) => m.fenBefore.split(' ')[0] === placement)), x.q).toBe(true)
      for (const o of x.options) {
        const san = o.san.replace(/^\d+\./, '')
        expect(() => new Chess(x.fen).move(san), x.q + ' ' + san).not.toThrow()
        const known = white.some((l) => l.moves.some((m) => m.fenBefore.split(' ')[0] === placement && m.san === san))
        expect(known, x.q + ' ' + san).toBe(!!o.ok)
      }
    }
  })

  it('Rome: every trap move is a move of Lu in that line', () => {
    for (const t of ROME_TRAPS) {
      const line = builtinLines.find((l) => l.title === t.line)
      expect(line, t.line).toBeTruthy()
      expect(line!.moves.some((m) => m.color === line!.side && m.san === t.san), t.line + ' ' + t.san).toBe(true)
    }
  })

  it("Rome: the threats are the opponent's legal moves", () => {
    for (const r of ROME_THREATS) {
      expect(r.fen.split(' ')[1]).toBe('b')
      expect(play(r).m.san).toBe(r.san)
    }
  })

  it('the road: guard, forks, the first opening, mates – then the rest', () => {
    expect(nextStation('kannauj', ['kannauj'])?.id).toBe('samarkand')
    expect(nextStation('samarkand', ['kannauj', 'samarkand'])?.id).toBe('rome')
    expect(nextStation('rome', ['kannauj', 'samarkand', 'rome'])?.id).toBe('baghdad')
    expect(nextStation('baghdad', ['kannauj', 'samarkand', 'rome', 'baghdad'])?.id).toBe('persia')
  })

  it('titles grow with the bosses: Pawn, Pawn Star, … King of Chess', () => {
    expect(titleOf([])).toBe('Pawn')
    expect(titleOf(['kannauj'])).toBe('Pawn Star')
    expect(titleOf(['kannauj', 'rome', 'persia'])).toBe('Rook-ie')
    expect(titleOf(STATIONS.filter((s) => !s.finale).map((s) => s.id))).toBe("Queen's Champion")
    expect(titleOf(['chennai'])).toBe('King of Chess')
  })
})

describe('The name of the position (How do you react?)', () => {
  const fenAfter = (sans: string) => { const g = new Chess(); for (const m of sans.split(' ')) g.move(m); return g.fen() }
  it('names one opening, stays silent while several openings share the position', () => {
    expect(openingName(fenAfter('e4 e5 Nf3 Nc6 Bb5'), builtinLines)).toBe('Ruy Lopez')
    expect(openingName(fenAfter('e4 e5 Nf3 Nc6'), builtinLines)).toBeNull()
    expect(openingName(fenAfter('e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7'), builtinLines)).toMatch(/Fried Liver/)
    expect(openingName(fenAfter('a4 h5'), builtinLines)).toBeNull()
  })
  it('strips the move number', () => {
    expect(bareSan('3.Bb5')).toBe('Bb5')
    expect(bareSan('5...Nf6')).toBe('Nf6')
    expect(bareSan('O-O')).toBe('O-O')
  })
})

describe('Lichess puzzles (CC0)', () => {
  it('every puzzle plays out legally, mates end in mate', async () => {
    const data = (await import('../data/lichess-puzzles.json')).default as Record<string, { id: string; fen: string; moves: string[]; rating: number }[]>
    for (const [theme, list] of Object.entries(data)) {
      expect(list.length, theme).toBeGreaterThanOrEqual(20)
      for (const p of list) {
        const c = new Chess(p.fen)
        for (const u of p.moves) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
        if (['mate1', 'backrank', 'mate2', 'smothered'].includes(theme)) expect(c.isCheckmate(), theme + ' ' + p.id).toBe(true)
      }
    }
  })
})
