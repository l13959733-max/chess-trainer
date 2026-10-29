import { Chess } from 'chess.js'
import type { Line, LineMove } from './pgn'

export type MoveCheck = 'correct' | 'wrong' | 'illegal'

// Prüft einen Zug des Spielers gegen den erwarteten Repertoire-Zug.
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

// Index des ersten Zugs, den der Spieler selbst machen muss (bei Schwarz-Linien spielt die App zuerst).
export function firstPlayerPly(line: Line): number {
  const i = line.moves.findIndex((m) => m.color === line.side)
  return i === -1 ? line.moves.length : i
}

// Die Linie gilt als beendet, wenn nach `ply` kein Zug der eigenen Seite mehr kommt.
export function isFinished(line: Line, ply: number): boolean {
  return !line.moves.slice(ply).some((m) => m.color === line.side)
}
