import type { Line, Side } from './pgn'

export interface Chapter {
  key: string
  title: string
  moves: string // the first moves that lead into it, e.g. "1.e4 e5 2.Nf3 Nc6 3.Bc4"
  group: string // section heading on the overview
  side: Side | null // null = mixed (imports)
  lines: Line[]
}

// The overview, in order: section → chapters. `opening` is the [Opening "…"] header of the lines.
const LAYOUT: { group: string; side: Side; chapters: { opening: string; title?: string; moves: string }[] }[] = [
  {
    group: 'White · 1.e4 e5',
    side: 'w',
    chapters: [
      { opening: 'Italian Game', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4' },
      { opening: 'Two Knights Defense', moves: '3.Bc4 Nf6 – grows out of the Italian' },
      { opening: 'Petrov Defense', moves: '1.e4 e5 2.Nf3 Nf6' },
      { opening: 'Philidor Defense', moves: '1.e4 e5 2.Nf3 d6' },
      { opening: 'Vienna Game', moves: '1.e4 e5 2.Nc3' },
      { opening: "Bishop's Opening", moves: '1.e4 e5 2.Bc4' },
    ],
  },
  {
    group: 'White · other answers to 1.e4',
    side: 'w',
    chapters: [
      { opening: 'Scandinavian', title: 'vs Scandinavian', moves: '1.e4 d5' },
      { opening: 'Caro-Kann', title: 'vs Caro-Kann', moves: '1.e4 c6' },
      { opening: 'French Defense', title: 'vs French', moves: '1.e4 e6' },
      { opening: 'Sicilian Defense', title: 'vs Sicilian', moves: '1.e4 c5 · Alapin, Smith-Morra, Wing Gambit' },
      { opening: 'Pirc & Modern', title: 'vs Pirc & Modern', moves: '1.e4 d6 · 1.e4 g6' },
      { opening: 'Nimzowitsch Defense', title: 'vs Nimzowitsch', moves: '1.e4 Nc6' },
      { opening: 'Other replies to 1.e4', title: 'vs other moves', moves: '1.e4 …' },
    ],
  },
  {
    group: 'Black · against 1.e4',
    side: 'b',
    chapters: [
      { opening: 'Scandinavian', moves: '1.e4 d5' },
      { opening: 'Caro-Kann', moves: '1.e4 c6' },
      { opening: 'Sicilian Dragon', moves: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6' },
      { opening: "Sicilian: White's other tries", title: 'Sicilian · other White moves', moves: 'Smith-Morra, Alapin, 3.Bb5+, Grand Prix' },
      { opening: 'Italian Game', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5' },
      { opening: 'Two Knights Defense', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6' },
      { opening: 'Philidor Defense', moves: '1.e4 e5 2.Nf3 d6' },
    ],
  },
  {
    group: 'Black · against 1.d4',
    side: 'b',
    chapters: [
      { opening: "Queen's Gambit Declined", moves: '1.d4 d5 2.c4 e6' },
      { opening: 'London & 2.Nf3', title: 'London System & 2.Nf3', moves: '1.d4 d5 2.Bf4 · 2.Nf3' },
    ],
  },
]

// Groups lines into chapters in the order above. Unknown openings go to "More lines" of their side,
// imported lines get their own chapter at the end.
export function chapters(lines: Line[]): Chapter[] {
  const out: Chapter[] = []
  const used = new Set<Line>()
  for (const g of LAYOUT) {
    for (const c of g.chapters) {
      const own = lines.filter((l) => l.source !== 'import' && l.side === g.side && l.opening === c.opening)
      own.forEach((l) => used.add(l))
      if (own.length) out.push({ key: `${c.opening}|${g.side}`, title: c.title ?? c.opening, moves: c.moves, group: g.group, side: g.side, lines: own })
    }
  }
  for (const side of ['w', 'b'] as const) {
    const rest = lines.filter((l) => l.source !== 'import' && l.side === side && !used.has(l))
    if (rest.length) out.push({ key: `more|${side}`, title: 'More lines', moves: '', group: side === 'w' ? 'White · more' : 'Black · more', side, lines: rest })
  }
  const imports = lines.filter((l) => l.source === 'import')
  if (imports.length) out.push({ key: 'imports', title: 'Your imports', moves: '', group: 'Imported', side: null, lines: imports })
  return out
}
