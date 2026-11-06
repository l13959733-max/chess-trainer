import { describe, expect, it } from 'vitest'
import { builtinLines } from './repertoire'
import { buildTree, moveLabel, movesLabel, nextChoice, openingsOf, percentFor } from './tree'

describe('opening map', () => {
  const white = buildTree(builtinLines, 'w')
  const child = (n: typeof white, san: string) => n.children.find((c) => c.path[c.path.length - 1] === san)!

  it('starts with 1.e4 and 1.d4 for White', () => {
    expect(white.children.map((c) => c.path[0]).sort()).toEqual(['d4', 'e4'])
  })

  it('offers all three systems against 1.d4 d5', () => {
    const d5 = child(child(white, 'd4'), 'd5')
    expect(d5.children.map((c) => c.path[2]).sort()).toEqual(['Bf4', 'Bg5', 'c4'])
    expect(openingsOf(child(d5, 'Bf4'))).toEqual(['London System'])
  })

  it('every line sits on exactly one leaf', () => {
    const leaves: string[] = []
    const walk = (n: typeof white) => (n.children.length ? n.children.forEach(walk) : leaves.push(...n.lines.map((l) => l.id)))
    walk(white)
    expect(leaves.sort()).toEqual(white.lines.map((l) => l.id).sort())
  })

  it('skips moves without a choice', () => {
    const tromp = child(child(white, 'd4'), 'Nf6')
    const { node, skipped } = nextChoice(tromp)
    expect(skipped).toEqual(['Bg5'])
    expect(node.children.length).toBeGreaterThan(1)
  })

  it('writes move numbers', () => {
    expect(moveLabel(['d4', 'd5', 'Bf4'])).toBe('2.Bf4')
    expect(moveLabel(['d4', 'd5'])).toBe('1...d5')
    expect(movesLabel(['d4', 'd5', 'Bf4', 'Nf6', 'e3'], 1)).toBe('1...d5 2.Bf4 Nf6 3.e3')
  })

  it('turns results into percent for the learner', () => {
    expect(percentFor({ white: 50, draws: 10, black: 40 }, 'w')).toEqual({ win: 50, draw: 10, loss: 40, games: 100 })
    expect(percentFor({ white: 50, draws: 10, black: 40 }, 'b')).toEqual({ win: 40, draw: 10, loss: 50, games: 100 })
  })
})
