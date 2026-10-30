import type { Line, Side } from './pgn'

export interface Chapter {
  key: string
  title: string
  side: Side | null // null = mixed (imports)
  lines: Line[]
}

// Order on the overview: White openings from the first move on, then Black.
const ORDER: [string, Side][] = [
  ['Italian Game', 'w'],
  ['Vienna Game', 'w'],
  ["Bishop's Opening", 'w'],
  ['Scandinavian', 'w'],
  ['Other replies to 1.e4', 'w'],
  ['Scandinavian', 'b'],
  ['Italian Game', 'b'],
  ["Queen's Gambit Declined", 'b'],
]

const rank = (opening: string, side: Side) => {
  const i = ORDER.findIndex(([o, s]) => o === opening && s === side)
  return i < 0 ? ORDER.length : i
}

// Groups lines into chapters by opening and side. Imported lines get their own chapter at the end.
export function chapters(lines: Line[]): Chapter[] {
  const map = new Map<string, Chapter>()
  const imports: Line[] = []
  for (const line of lines) {
    if (line.source === 'import') {
      imports.push(line)
      continue
    }
    const opening = line.opening ?? 'More lines'
    const key = `${opening}|${line.side}`
    if (!map.has(key)) {
      const title = line.side === 'b' ? `${opening} · as Black` : opening === 'Scandinavian' ? 'Scandinavian · vs 1...d5' : opening
      map.set(key, { key, title, side: line.side, lines: [] })
    }
    map.get(key)!.lines.push(line)
  }
  const out = [...map.values()].sort((a, b) => rank(a.lines[0].opening ?? '', a.side!) - rank(b.lines[0].opening ?? '', b.side!))
  if (imports.length) out.push({ key: 'imports', title: 'Your imports', side: null, lines: imports })
  return out
}
