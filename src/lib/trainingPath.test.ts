import { describe, expect, it } from 'vitest'
import { addRed, buildPlan, longestStreak, safeShare, starsFromMistakes, viewPlan, type PlanInput } from './trainingPath'

const base: PlanInput = { date: '2026-11-13', linesDue: 0, mistakes: [], lostDue: 0 }

describe('today’s path', () => {
  it('starts with the Daily Threat Check and always has Square Rush', () => {
    expect(buildPlan(base).levels.map((l) => l.kind)).toEqual(['threat', 'rush'])
  })

  it('puts at most two own mistakes on the path, around the Threat Check', () => {
    const p = buildPlan({ ...base, linesDue: 3, mistakes: [1, 2, 3].map((i) => ({ id: 'g' + i, title: 'Fork' })), lostDue: 5 })
    expect(p.levels.map((l) => l.key)).toEqual(['threat', 'lines', 'mistake:g1', 'mistake:g2', 'rush'])
    expect(p.levels.filter((l) => l.red)).toHaveLength(2)
  })

  it('uses a Lost battle when there is no own chess.com mistake', () => {
    expect(buildPlan({ ...base, lostDue: 2 }).levels[1].kind).toBe('lost')
  })

  it('ends with treasure and boss', () => {
    const p = buildPlan({ ...base, treasure: 'x/1', boss: { city: 'barcelona', name: 'The Diagonal Bishop' } })
    expect(p.levels.slice(-2).map((l) => l.route)).toEqual(['play/puzzle/x%2F1', 'king/barcelona/boss'])
  })

  it('adds red levels after the chess.com check, once', () => {
    const p = buildPlan({ ...base, linesDue: 1, lostDue: 2 })
    const q = addRed(p, [{ id: 'a', title: 'Pin' }, { id: 'b', title: 'Fork' }])
    expect(q.levels.map((l) => l.key)).toEqual(['threat', 'lines', 'mistake:a', 'mistake:b', 'rush'])
    expect(addRed(q, [{ id: 'c', title: 'Pin' }])).toBe(q)
  })

  it('marks the first open level as now and locks the rest', () => {
    const p = buildPlan({ ...base, linesDue: 1 })
    const v = viewPlan(p, { threat: 3 })
    expect(v.map((l) => [l.stars, l.now, l.lock])).toEqual([[3, false, false], [null, true, false], [null, false, true]])
  })
})

describe('stars and safe moves', () => {
  it('gives three stars for no mistake', () => {
    expect([0, 1, 4].map(starsFromMistakes)).toEqual([3, 2, 1])
  })

  it('counts safe moves from plies and big mistakes', () => {
    expect(safeShare([{ plies: 40, blunders: 2 }, { plies: 21, blunders: 0 }])).toBeCloseTo(1 - 2 / 31)
    expect(safeShare([])).toBeNull()
  })

  it('finds the longest run of days, across months', () => {
    expect(longestStreak(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03', '2026-11-04'])).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
})
