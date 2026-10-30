import { describe, expect, it } from 'vitest'
import { chapters } from './chapters'
import type { Line } from './pgn'
import { builtinLines } from './repertoire'

const line = (id: string, opening: string | undefined, side: 'w' | 'b', source: Line['source'] = 'builtin'): Line => ({ id, title: id, side, moves: [], source, opening })

describe('chapters', () => {
  it('sorts into sections and chapters in a fixed order, imports last', () => {
    const out = chapters([
      line('a', "Queen's Gambit Declined", 'b'),
      line('i', undefined, 'w', 'import'),
      line('b', 'Italian Game', 'b'),
      line('c', 'Two Knights Defense', 'w'),
      line('d', 'Scandinavian', 'w'),
      line('e', 'Italian Game', 'w'),
    ])
    expect(out.map((c) => `${c.group} / ${c.title}`)).toEqual([
      'White · 1.e4 e5 / Italian Game',
      'White · 1.e4 e5 / Two Knights Defense',
      'White · other answers to 1.e4 / vs Scandinavian',
      'Black · against 1.e4 / Italian Game',
      "Black · against 1.d4 / Queen's Gambit Declined",
      'Imported / Your imports',
    ])
  })

  it('unknown openings go to "More lines" of their side', () => {
    const out = chapters([line('x', 'Some Gambit', 'w'), line('y', 'Vienna Game', 'w')])
    expect(out.map((c) => c.title)).toEqual(['Vienna Game', 'More lines'])
  })

  it('every built-in line has a known chapter (no "More lines")', () => {
    expect(chapters(builtinLines).filter((c) => c.title === 'More lines').flatMap((c) => c.lines.map((l) => l.title))).toEqual([])
  })
})
