import { describe, expect, it } from 'vitest'
import { classify, pickMove, profileFor, updateRating, winChance, type Candidate } from './bot'

// A tiny seeded random generator so the statistics tests are repeatable
function rng(seed = 1) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

const cands: Candidate[] = [
  { uci: 'best', score: { cp: 50 } },
  { uci: 'near', score: { cp: 40 } },
  { uci: 'small', score: { cp: -20 } },
  { uci: 'mistake', score: { cp: -150 } },
  { uci: 'gross1', score: { cp: -500 } },
  { uci: 'gross2', score: { cp: -900 } },
  { uci: 'gross3', score: { mate: -2 } },
  { uci: 'gross4', score: { mate: -1 } },
]

describe('bot', () => {
  it('sorts moves into quality classes by lost winning chance', () => {
    const c = classify(cands)
    expect(c.best.map((x) => x.uci)).toEqual(['best'])
    expect(c.near.map((x) => x.uci)).toEqual(['near'])
    expect(c.small.map((x) => x.uci)).toEqual(['small'])
    expect(c.mistake.map((x) => x.uci)).toEqual(['mistake'])
    expect(c.gross.map((x) => x.uci)).toEqual(['gross1', 'gross2', 'gross3', 'gross4'])
  })

  it('uses the measured profile at 600 and interpolates between anchors', () => {
    expect(profileFor(600).gross).toBeCloseTo(4.6)
    expect(profileFor(650).gross).toBeCloseTo((4.6 + 3.8) / 2)
    expect(profileFor(600).measured).toBe(true)
    expect(profileFor(1500).measured).toBe(false)
  })

  it('makes gross errors about as often as the profile says', () => {
    const r = rng(7)
    let gross = 0, best = 0
    const n = 20000
    for (let i = 0; i < n; i++) {
      const k = pickMove(cands, 600, false, r).klass
      if (k === 'gross') gross++
      if (k === 'best') best++
    }
    expect(gross / n).toBeGreaterThan(0.035)
    expect(gross / n).toBeLessThan(0.057)
    expect(best / n).toBeGreaterThan(0.31)
    expect(best / n).toBeLessThan(0.37)
  })

  it('never picks the most absurd gross errors', () => {
    const r = rng(3)
    for (let i = 0; i < 5000; i++) expect(pickMove(cands, 100, false, r).uci).not.toBe('gross4')
  })

  it('takes gifts at the measured rate (80% at 600)', () => {
    const r = rng(11)
    let took = 0
    const n = 20000
    for (let i = 0; i < n; i++) if (pickMove(cands, 600, true, r).uci === 'best') took++
    expect(took / n).toBeGreaterThan(0.77)
    expect(took / n).toBeLessThan(0.83)
  })

  it('falls back to a better class when one is empty', () => {
    const only = [{ uci: 'a', score: { cp: 0 } }, { uci: 'b', score: { cp: -5 } }]
    const r = rng(5)
    for (let i = 0; i < 200; i++) expect(['a', 'b']).toContain(pickMove(only, 100, false, r).uci)
  })

  it('winning chance is 50% at equal and rises with the score', () => {
    expect(winChance({ cp: 0 })).toBeCloseTo(50)
    expect(winChance({ cp: 300 })).toBeGreaterThan(70)
    expect(winChance({ mate: 3 })).toBeGreaterThan(97)
  })

  it('rating moves up after a win and down after a loss', () => {
    expect(updateRating(600, 600, 1, 20)).toBe(616)
    expect(updateRating(600, 600, 0, 20)).toBe(584)
    expect(updateRating(600, 600, 0.5, 20)).toBe(600)
    expect(updateRating(600, 600, 1, 0)).toBe(624)
  })
})
