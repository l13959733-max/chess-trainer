import { describe, expect, it } from 'vitest'
import { LEVELS, levelOf } from './gameLevel'

describe('how good a game was for your level', () => {
  it('has measured steps for the ratings Lu plays against', () => {
    expect(Object.keys(LEVELS)).toContain('600')
    for (const q of Object.values(LEVELS)) expect([...q].sort((a, b) => a - b)).toEqual(q) // rising
  })
  it('the median game is in the middle, very low and very high ones at the ends', () => {
    const q = LEVELS['600']
    expect(levelOf(q[9], 650)!.better).toBe(50)
    expect(levelOf(5, 650)).toMatchObject({ better: 3, label: 'weak' })
    expect(levelOf(99.9, 650)).toMatchObject({ better: 97, label: 'strong' })
  })
  it('compares with players around your rating', () => {
    expect(levelOf(70, 650)).toMatchObject({ from: 500, to: 799 })
    expect(levelOf(70, 420)).toMatchObject({ from: 300, to: 599 })
  })
})
