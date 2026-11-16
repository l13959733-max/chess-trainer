import { describe, expect, it } from 'vitest'
import { OWN_EVERY, PR_BONUS_MS, PR_LIVES, PR_TIME, buildQueue, isOver, miss, pointsFor, praiseFor, remember, solve, startRush, starsFor, timeLeft } from './puzzleRush'

// a fixed "random" so the tests are repeatable
const seq = (...v: number[]) => {
  let i = 0
  return () => v[i++ % v.length]
}

describe('puzzle rush rules', () => {
  it('3 minutes and 3 lives', () => {
    const s = startRush(1000)
    expect(timeLeft(s, 1000)).toBe(PR_TIME)
    expect(s.lives).toBe(PR_LIVES)
    expect(isOver(s, 1000 + PR_TIME)).toBe(true)
  })

  it('a wrong move takes a life and ends the streak; no lives = over', () => {
    let s = solve(startRush(0), 600).s
    s = miss(s, 'a')
    expect([s.lives, s.streak, s.combo, s.missed]).toEqual([2, 0, 0, ['a']])
    s = miss(miss(s, 'b'), 'c')
    expect(s.lives).toBe(0)
    expect(isOver(s, 0)).toBe(true)
  })

  it('harder puzzles give more points', () => {
    expect([pointsFor(494), pointsFor(700), pointsFor(900), pointsFor(1350)]).toEqual([10, 20, 30, 50])
  })

  it('3 right in a row: explosion and 5 seconds more', () => {
    let s = startRush(0)
    s = solve(s, 500).s
    s = solve(s, 500).s
    const r = solve(s, 500)
    expect(r.boom).toBe(true)
    expect(r.s.combo).toBe(0)
    expect(r.s.end).toBe(PR_TIME + PR_BONUS_MS)
    expect(r.s.streak).toBe(3)
  })

  it('stars', () => {
    expect([starsFor(0), starsFor(60), starsFor(200), starsFor(400)]).toEqual([0, 1, 2, 3])
  })
})

describe('the order of a run', () => {
  const lichess = Array.from({ length: 40 }, (_, i) => ({ id: 'l' + i, rating: 500 + i * 20, theme: 'fork' }))
  const own = [{ id: 'o1', rating: 800, own: true }, { id: 'o2', rating: 800, own: true }]

  it('climbs from easy to hard', () => {
    const q = buildQueue(lichess, [], [], seq(0), 30)
    expect(q[0].rating).toBeLessThan(q[q.length - 1].rating)
    expect(new Set(q.map((x) => x.id)).size).toBe(q.length) // no puzzle twice
  })

  it('every 4th task is your own mistake while there are any', () => {
    const q = buildQueue(lichess, own, [], seq(0.3), 12)
    expect(q[OWN_EVERY - 1].own).toBe(true)
    expect(q[2 * OWN_EVERY - 1].own).toBe(true)
    expect(q.filter((x) => x.own)).toHaveLength(2)
  })

  it('a puzzle missed before comes back early', () => {
    const q = buildQueue(lichess, [], ['l35'], seq(0), 10)
    expect(q.findIndex((x) => x.id === 'l35')).toBe(1)
  })

  it('praise says what was found', () => {
    expect(praiseFor({ id: 'x', rating: 600, theme: 'fork' })).toBe('Fork found!')
    expect(praiseFor({ id: 'y', rating: 800, own: true })).toBe('Your own mistake – fixed!')
  })

  it('missed puzzles are remembered until solved', () => {
    expect(remember(['a', 'b'], ['c'], ['a'])).toEqual(['c', 'b'])
  })
})
