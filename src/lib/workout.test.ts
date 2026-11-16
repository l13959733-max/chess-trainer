import { describe, expect, it } from 'vitest'
import { allocate, interleave } from './workout'

describe('weakness workout', () => {
  // Lu's real numbers of 16.11. (My weaknesses screenshot)
  const lu = [
    ['hung-piece', 10], ['ignored-threat', 10], ['allowed-mate', 6], ['tactic', 3], ['left-undefended', 1],
    ['free-piece', 3], ['missed-tactic', 3], ['missed-mate', 1],
    ['other:positional', 12], ['other:king-attack', 9], ['other:later-loss', 3], ['other:development', 1],
  ].map(([key, total]) => ({ key: key as string, title: key as string, total: total as number }))

  it('12 tasks, every kind once when there are 12 kinds', () => {
    const a = allocate(lu)
    expect(a.reduce((s, k) => s + k.n, 0)).toBe(12)
    expect(a).toHaveLength(12)
    expect(a.every((k) => k.n === 1)).toBe(true)
  })

  it('frequent kinds get more places when there is room', () => {
    const a = allocate([{ key: 'a', title: 'a', total: 20 }, { key: 'b', title: 'b', total: 5 }, { key: 'c', title: 'c', total: 1 }])
    expect(a.map((k) => [k.key, k.n])).toEqual([['a', 9], ['b', 2], ['c', 1]]) // 20/26 of 12 = 9.2, 5/26 = 2.3, the rare one at least once
  })

  it('never more tasks than puzzles', () => {
    const a = allocate([{ key: 'a', title: 'a', total: 2 }, { key: 'b', title: 'b', total: 1 }])
    expect(a.map((k) => k.n)).toEqual([2, 1])
  })

  it('more kinds than places: the most frequent kinds', () => {
    const a = allocate(lu, 5)
    expect(a.map((k) => k.key)).toEqual(['other:positional', 'hung-piece', 'ignored-threat', 'other:king-attack', 'allowed-mate'])
  })

  it('mixed: the same kind does not come twice in a row when avoidable', () => {
    const out = interleave([['a1', 'a2', 'a3'], ['b1', 'b2'], ['c1']])
    expect(out).toHaveLength(6)
    for (let i = 1; i < out.length; i++) expect(out[i][0]).not.toBe(out[i - 1][0])
  })
})
