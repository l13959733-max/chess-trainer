import { describe, expect, it } from 'vitest'
import { MIRROR, STATIONS, isOpen, lineRounds, mirrorOpen, stationById, stationLines, titleOf } from './king'
import { builtinLines } from './repertoire'

describe('Mirror World (Act 2)', () => {
  it('every mirror station teaches real Black lines and has enough boss questions with one answer', () => {
    for (const s of MIRROR) {
      const lines = stationLines(s, builtinLines)
      expect(lines.length, s.id).toBeGreaterThan(2)
      expect(lines.every((l) => l.side === 'b'), s.id).toBe(true)
      const rounds = lineRounds(lines, 5)
      expect(rounds.length, s.id).toBe(5)
      // the asked move is Black's move in the position
      expect(rounds.every((r) => r.fen.split(' ')[1] === 'b'), s.id).toBe(true)
    }
  })

  it('opens after Rome, can be found by id, and does not block Chennai', () => {
    expect(mirrorOpen(['kannauj', 'samarkand'])).toBe(false)
    expect(mirrorOpen(['kannauj', 'samarkand', 'rome'])).toBe(true)
    expect(stationById('mirror-gate')?.name).toBe('The Mirror North')
    const chennai = STATIONS.find((s) => s.finale)!
    const all = STATIONS.filter((s) => !s.finale).map((s) => s.id)
    expect(isOpen(chennai, all)).toBe(true) // Chennai does not wait for the mirror
    expect(STATIONS.some((s) => s.id.startsWith('mirror'))).toBe(false)
  })

  it('beating a shadow counts for your title', () => {
    expect(titleOf(['mirror-gate'])).toBe(titleOf(['kannauj']))
  })
})

describe('reputation: the world sees Liam rise', () => {
  it('starts as a barefoot boy and ends as a legend', async () => {
    const { reputation } = await import('./king')
    expect(reputation([]).greet).toMatch(/barefoot/)
    expect(reputation(['kannauj']).boss).toMatch(/street kid/)
    expect(reputation(['a', 'b', 'c']).greet).toMatch(/heard of you/)
    expect(reputation(Array.from({ length: 12 }, (_, i) => 's' + i)).greet).toMatch(/honour/)
  })
})

describe('How do you react? Crossroads from your own book', () => {
  it('right answers are your book moves, wrong ones are legal moves your book does not play there', async () => {
    const { Chess } = await import('chess.js')
    const { bookCrossroads } = await import('./king')
    const strip = (san: string) => san.replace(/^\d+\.(\.\.)?/, '')
    let stations = 0
    for (const s of [...STATIONS, ...MIRROR].filter((x) => x.lines)) {
      const lines = stationLines(s, builtinLines)
      const rounds = bookCrossroads(lines, 6)
      if (rounds.length >= 3) stations++
      for (const r of rounds) {
        const legal = new Chess(r.fen).moves()
        const book = new Set(lines.flatMap((l) => l.moves.filter((m) => m.fenBefore.split(' ').slice(0, 4).join(' ') === r.fen.split(' ').slice(0, 4).join(' ')).map((m) => m.san)))
        expect(r.options.length, r.q).toBe(3)
        expect(r.options.some((o) => o.ok), r.q).toBe(true)
        for (const o of r.options) {
          expect(legal, `${s.id}: ${r.q} ${o.san}`).toContain(strip(o.san))
          expect(book.has(strip(o.san)), `${s.id}: ${r.q} ${o.san}`).toBe(!!o.ok)
        }
      }
    }
    expect(stations).toBeGreaterThanOrEqual(10)
  })
})

describe('the Mirror World is guided', () => {
  it('opens after Rome, then one shadow after another', () => {
    const open = (beaten: string[]) => MIRROR.filter((s) => isOpen(s, beaten)).map((s) => s.id)
    expect(open(['kannauj', 'samarkand'])).toEqual([])
    expect(open(['kannauj', 'samarkand', 'rome'])).toEqual(['mirror-gate'])
    expect(open(['kannauj', 'samarkand', 'rome', 'mirror-gate'])).toEqual(['mirror-gate', 'mirror-fortress'])
    expect(MIRROR.map((s) => s.lines?.opening).flat()).toEqual(['Scandinavian', "Queen's Gambit Declined", 'London & 2.Nf3', 'Caro-Kann', 'French Defense', 'Slav Defense', "King's Indian Defense"])
  })
})
