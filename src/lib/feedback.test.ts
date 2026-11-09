import { describe, expect, it } from 'vitest'
import { feedback, onGlow, type Glow } from './feedback'

describe('glow on the right move', () => {
  it('lights the square green or gold – and never after a hint', () => {
    const seen: [string, Glow][] = []
    const off = onGlow((square, kind) => seen.push([square, kind]))
    feedback.glow('d4')
    feedback.glow('f7', 'gold')
    feedback.glow('e5', 'good', true)
    feedback.glow('g5', 'gold', true)
    off()
    feedback.glow('a1')
    expect(seen).toEqual([
      ['d4', 'good'],
      ['f7', 'gold'],
    ])
  })
})
