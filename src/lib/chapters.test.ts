import { describe, expect, it } from 'vitest'
import { chapters } from './chapters'
import type { Line } from './pgn'

const line = (id: string, opening: string | undefined, side: 'w' | 'b', source: Line['source'] = 'builtin'): Line => ({ id, title: id, side, moves: [], source, opening })

describe('chapters', () => {
  it('groups by opening and side in a fixed order, imports last', () => {
    const out = chapters([
      line('a', "Queen's Gambit Declined", 'b'),
      line('i', undefined, 'w', 'import'),
      line('b', 'Italian Game', 'b'),
      line('c', 'Italian Game', 'w'),
      line('d', 'Scandinavian', 'w'),
      line('e', 'Italian Game', 'w'),
    ])
    expect(out.map((c) => c.title)).toEqual(['Italian Game', 'Scandinavian · vs 1...d5', 'Italian Game · as Black', "Queen's Gambit Declined · as Black", 'Your imports'])
    expect(out[0].lines.map((l) => l.id)).toEqual(['c', 'e'])
  })

  it('puts unknown openings after the known ones', () => {
    const out = chapters([line('x', 'Some Gambit', 'w'), line('y', 'Vienna Game', 'w')])
    expect(out.map((c) => c.key)).toEqual(['Vienna Game|w', 'Some Gambit|w'])
  })
})
