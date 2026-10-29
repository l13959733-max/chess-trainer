import { Chess } from 'chess.js'
import type { Line, LineMove } from './pgn'

export type MoveCheck = 'correct' | 'wrong' | 'illegal'

// Checks a player move against the expected repertoire move.
export function checkMove(expected: LineMove, from: string, to: string, promotion?: string): MoveCheck {
  const chess = new Chess(expected.fenBefore)
  let san: string
  try {
    san = chess.move({ from, to, promotion: promotion ?? (from === expected.from && to === expected.to ? expected.promotion : 'q') }).san
  } catch {
    return 'illegal'
  }
  return san === expected.san ? 'correct' : 'wrong'
}

// Index of the first move the player makes (in Black lines the app moves first).
export function firstPlayerPly(line: Line): number {
  const i = line.moves.findIndex((m) => m.color === line.side)
  return i === -1 ? line.moves.length : i
}

// The line is finished when no move of the player's side follows `ply`.
export function isFinished(line: Line, ply: number): boolean {
  return !line.moves.slice(ply).some((m) => m.color === line.side)
}
