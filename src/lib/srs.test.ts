import { describe, expect, it } from 'vitest'
import { daysUntil, isDue, lineResult, newState, qualityFromMistakes, review } from './srs'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 9, 29)

describe('SM-2', () => {
  it('intervals 1 → 6 → 16 for flawless reviews', () => {
    let s = review(newState('x'), 5, T0)
    expect(s.interval).toBe(1)
    s = review(s, 5, T0 + DAY)
    expect(s.interval).toBe(6)
    s = review(s, 5, T0 + 7 * DAY)
    // The interval uses the ease factor from before this review: round(6 * 2.7) = 16; afterwards ef = 2.8
    expect(s.interval).toBe(16)
    expect(s.ef).toBeCloseTo(2.8)
  })

  it('a bad review resets to tomorrow', () => {
    let s = review(review(review(newState('x'), 5, T0), 5, T0), 5, T0)
    s = review(s, 1, T0)
    expect(s).toMatchObject({ reps: 0, interval: 1, due: T0 + DAY })
  })

  it('ease factor never drops below 1.3', () => {
    let s = newState('x')
    for (let i = 0; i < 20; i++) s = review(s, 0, T0)
    expect(s.ef).toBe(1.3)
  })

  it('mistakes → quality', () => {
    expect([0, 1, 2, 5].map(qualityFromMistakes)).toEqual([5, 3, 1, 1])
  })

  it('new lines are not due; reviewed lines are due from their due date', () => {
    expect(isDue(newState('x'), T0)).toBe(false)
    expect(isDue(undefined, T0)).toBe(false)
    const s = review(newState('x'), 5, T0)
    expect(isDue(s, T0 + DAY - 1)).toBe(false)
    expect(isDue(s, T0 + DAY)).toBe(true)
    expect(daysUntil(s, T0)).toBe(1)
  })
})

describe('lineResult', () => {
  it('new, perfect and with mistakes', () => {
    expect(lineResult(undefined, T0)).toEqual({ kind: 'new', mistakes: 0, due: false })
    expect(lineResult(review(newState('x'), 5, T0, 0), T0)).toEqual({ kind: 'perfect', mistakes: 0, due: false })
    expect(lineResult(review(newState('x'), 1, T0, 2), T0 + DAY)).toEqual({ kind: 'mistakes', mistakes: 2, due: true })
  })
  it('the latest drill counts: mistakes then a perfect run shows perfect', () => {
    const s = review(review(newState('x'), 1, T0, 3), 5, T0 + DAY, 0)
    expect(lineResult(s, T0 + DAY).kind).toBe('perfect')
  })
})
