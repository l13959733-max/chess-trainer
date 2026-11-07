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
    expect(stationById('mirror-gate')?.name).toBe('The Mirror Gate')
    const chennai = STATIONS.find((s) => s.finale)!
    const all = STATIONS.filter((s) => !s.finale).map((s) => s.id)
    expect(isOpen(chennai, all)).toBe(true) // Chennai does not wait for the mirror
    expect(STATIONS.some((s) => s.id.startsWith('mirror'))).toBe(false)
  })

  it('beating a shadow counts for your title', () => {
    expect(titleOf(['mirror-gate'])).toBe(titleOf(['kannauj']))
  })
})
