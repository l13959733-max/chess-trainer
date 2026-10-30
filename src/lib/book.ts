import { Chess } from 'chess.js'
import type { Line } from './pgn'

// Opening book from the repertoire: the bot answers with moves from the lines, so a game against it
// practises exactly what is in the app. Positions are matched without the move counters.
const key = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

export function buildBook(lines: Line[]): Map<string, string[]> {
  const book = new Map<string, string[]>()
  for (const line of lines) {
    for (const m of line.moves) {
      const k = key(m.fenBefore)
      const list = book.get(k) ?? []
      const uci = m.from + m.to + (m.promotion ?? '')
      if (!list.includes(uci)) list.push(uci)
      book.set(k, list)
    }
  }
  return book
}

export function bookMove(book: Map<string, string[]>, fen: string, rand: () => number = Math.random): string | null {
  const list = book.get(key(fen))
  if (!list?.length) return null
  const uci = list[Math.floor(rand() * list.length)]
  // Only legal moves (a hand-written line could disagree with castling rights etc.)
  try {
    new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return uci
  } catch {
    return null
  }
}
