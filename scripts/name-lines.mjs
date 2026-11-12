// Gives every built-in line its real opening name from the open Lichess opening table (CC0):
// https://github.com/lichess-org/chess-openings – the deepest named position the line reaches (also by transposition).
// Usage: node scripts/name-lines.mjs   → writes src/lib/line-names.json  { "w|<line title>": "Catalan Opening: Open Defense, Classical Line" }
//                                         and src/lib/position-names.json { "<position>": name } for every named position on our lines (live name under the board)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'

const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master/'
const epd = (fen) => fen.split(' ').slice(0, 4).join(' ')
const names = new Map()
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const tsv = await (await fetch(BASE + f + '.tsv')).text()
  for (const row of tsv.trim().split('\n').slice(1)) {
    const [, name, pgn] = row.split('\t')
    const c = new Chess()
    for (const san of pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/)) c.move(san)
    const k = epd(c.fen())
    const old = names.get(k)
    if (!old || name.length > old.length) names.set(k, name)
  }
}
const out = {}
const seen = {}
for (const file of readdirSync('data').filter((f) => f.endsWith('.pgn'))) {
  const games = readFileSync('data/' + file, 'utf8').split(/\n(?=\[Event )/)
  for (const g of games) {
    const title = /\[Event "([^"]*)"\]/.exec(g)?.[1]
    if (!title) continue
    const side = /\[Side "Black"\]/i.test(g) ? 'b' : 'w'
    const c = new Chess()
    try {
      c.loadPgn(g)
    } catch {
      continue
    }
    const moves = c.history()
    const w = new Chess()
    let best = names.get(epd(w.fen()))
    for (const m of moves) {
      w.move(m)
      const here = names.get(epd(w.fen()))
      if (here) seen[epd(w.fen())] = here
      best = here ?? best
    }
    if (best) out[side + '|' + title] = best
  }
}
writeFileSync('src/lib/line-names.json', JSON.stringify(out, null, 1) + '\n')
writeFileSync('src/lib/position-names.json', JSON.stringify(seen) + '\n')
console.log(Object.keys(out).length, 'lines named,', Object.keys(seen).length, 'named positions')
