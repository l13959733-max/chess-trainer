import { describe, expect, it } from 'vitest'
import { addTop, isRecord } from './rushFx'

describe('records', () => {
  it('the first run is no record, only beating a best is', () => {
    expect(isRecord(300, 0)).toBe(false)
    expect(isRecord(300, 300)).toBe(false)
    expect(isRecord(301, 300)).toBe(true)
  })

  it('keeps the 5 best runs, best first', () => {
    let top = [] as { score: number; at: number }[]
    for (const [score, at] of [[100, 1], [400, 2], [250, 3], [90, 4], [600, 5], [300, 6]]) top = addTop(top, { score, at })
    expect(top.map((r) => r.score)).toEqual([600, 400, 300, 250, 100])
  })

  it('a run of 0 points is not listed; with equal points the older run stays in front', () => {
    expect(addTop([], { score: 0, at: 1 })).toEqual([])
    expect(addTop([{ score: 200, at: 1 }], { score: 200, at: 2 }).map((r) => r.at)).toEqual([1, 2])
  })
})
