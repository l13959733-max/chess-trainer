import { describe, expect, it } from 'vitest'
import { decodeChallenge, encodeChallenge, togetherStreak } from './together'

describe('the streak two friends keep together', () => {
  it('counts the days both practised, up to today', () => {
    expect(togetherStreak(['2026-11-26', '2026-11-27', '2026-11-28'], ['2026-11-27', '2026-11-28'], '2026-11-28')).toBe(2)
  })
  it('while today is still open, it counts up to yesterday', () => {
    expect(togetherStreak(['2026-11-27', '2026-11-28'], ['2026-11-26', '2026-11-27'], '2026-11-28')).toBe(1)
  })
  it('a day where only one practised breaks it', () => {
    expect(togetherStreak(['2026-11-25', '2026-11-27'], ['2026-11-25', '2026-11-26', '2026-11-27'], '2026-11-27')).toBe(1)
    expect(togetherStreak([], ['2026-11-27'], '2026-11-27')).toBe(0)
  })
  it('works across a month', () => {
    expect(togetherStreak(['2026-11-30', '2026-12-01'], ['2026-11-30', '2026-12-01'], '2026-12-01')).toBe(2)
  })
})

describe('a challenge link', () => {
  const c = { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', best: ['g8f6'], played: 'd6', from: 'Lu' }
  it('carries the position, the solution and the name', () => {
    expect(decodeChallenge(encodeChallenge(c))).toEqual(c)
  })
  it('survives names with umlauts and spaces', () => {
    expect(decodeChallenge(encodeChallenge({ ...c, from: 'Jörg Müller' }))!.from).toBe('Jörg Müller')
  })
  it('a broken or illegal link gives nothing', () => {
    expect(decodeChallenge('nonsense')).toBe(null)
    expect(decodeChallenge(encodeChallenge({ ...c, best: ['e2e4'] }))).toBe(null) // White's pawn, Black to move
  })
})
