import { Chess } from 'chess.js'
import { dailyPuzzle } from './threatcheck'

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' }

// the daily position after your move, seen from your side
export function dailyBoard(day: number) {
  const p = dailyPuzzle(day)
  const c = new Chess(p.fen)
  const me = c.turn()
  c.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4), promotion: p.moves[0][4] })
  const san = c.history()[0]
  const rows = c.board()
  const cells: { key: string; dark: boolean; glyph: string; white: boolean }[] = []
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const r = me === 'w' ? i : 7 - i
      const f = me === 'w' ? j : 7 - j
      const sq = rows[r][f]
      cells.push({ key: `${r}${f}`, dark: (r + f) % 2 === 1, glyph: sq ? GLYPH[sq.type] : '', white: sq?.color === 'w' })
    }
  return { cells, them: me === 'w' ? 'Black' : 'White', san: (me === 'w' ? '' : '…') + san }
}

