import { Chess, type Color, type Square } from 'chess.js'

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

// "Safety check": pieces of `color` that the opponent could win right now – attacked and either
// not protected at all or attacked by a cheaper piece. Lu's most common mistake (30.10. analysis)
// is leaving exactly these pieces where they are.
export function piecesInDanger(fen: string, color: Color): Square[] {
  const chess = new Chess(fen)
  const opp: Color = color === 'w' ? 'b' : 'w'
  const out: Square[] = []
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue
      const attackers = chess.attackers(p.square, opp)
      if (!attackers.length) continue
      const cheapest = Math.min(...attackers.map((sq) => VALUE[chess.get(sq)!.type]))
      const defended = chess.attackers(p.square, color).length > 0
      if (!defended || cheapest < VALUE[p.type]) out.push(p.square)
    }
  }
  return out
}
