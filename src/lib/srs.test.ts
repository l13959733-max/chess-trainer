import { describe, expect, it } from 'vitest'
import { daysUntil, isDue, newState, qualityFromMistakes, review } from './srs'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 9, 29)

describe('SM-2', () => {
  it('Intervalle 1 → 6 → 16 bei fehlerfreien Wiederholungen', () => {
    let s = review(newState('x'), 5, T0)
    expect(s.interval).toBe(1)
    s = review(s, 5, T0 + DAY)
    expect(s.interval).toBe(6)
    s = review(s, 5, T0 + 7 * DAY)
    // Intervall nutzt den Ease-Faktor vor dieser Wiederholung: round(6 * 2,7) = 16; danach ef = 2,8
    expect(s.interval).toBe(16)
    expect(s.ef).toBeCloseTo(2.8)
  })

  it('schlechte Wiederholung setzt zurück auf morgen', () => {
    let s = review(review(review(newState('x'), 5, T0), 5, T0), 5, T0)
    s = review(s, 1, T0)
    expect(s).toMatchObject({ reps: 0, interval: 1, due: T0 + DAY })
  })

  it('Ease-Faktor fällt nie unter 1,3', () => {
    let s = newState('x')
    for (let i = 0; i < 20; i++) s = review(s, 0, T0)
    expect(s.ef).toBe(1.3)
  })

  it('Fehler → Qualität', () => {
    expect([0, 1, 2, 5].map(qualityFromMistakes)).toEqual([5, 3, 1, 1])
  })

  it('neue Linien sind nicht "fällig", wiederholte erst ab Fälligkeit', () => {
    expect(isDue(newState('x'), T0)).toBe(false)
    expect(isDue(undefined, T0)).toBe(false)
    const s = review(newState('x'), 5, T0)
    expect(isDue(s, T0 + DAY - 1)).toBe(false)
    expect(isDue(s, T0 + DAY)).toBe(true)
    expect(daysUntil(s, T0)).toBe(1)
  })
})
