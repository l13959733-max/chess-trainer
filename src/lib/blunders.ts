import { Chess } from 'chess.js'
import type { Side } from './pgn'

// Engine score from the side to move's point of view
export type Score = { cp: number } | { mate: number }

export interface PositionEval {
  score: Score
  best?: string // UCI, e.g. "e2e4"
  pv: string[] // UCI
}

export interface GameMove {
  san: string
  uci: string
  color: Side
  fenBefore: string
}

export interface Blunder {
  ply: number
  fen: string // position before my move
  played: string // SAN
  best: string // UCI
  pv: string[] // UCI, starting with the best move
  loss: number // centipawns, clamped
  kind: 'blunder' | 'missed-mate'
  mateIn?: number
}

export const BLUNDER_CP = 200 // "more than 2 pawns"
export const MISSED_MATE_MAX = 3 // a missed mate counts when it was mate in 3 or faster
const CLAMP = 1000 // beyond ±10 pawns the game is decided either way

// Converts a score to a number from the side to move's view, clamped so that
// swings inside an already decided position don't count as blunders.
export function clampScore(s: Score): number {
  if ('mate' in s) return s.mate > 0 ? CLAMP : -CLAMP // mate 0 = side to move is mated
  return Math.max(-CLAMP, Math.min(CLAMP, s.cp))
}

// Evals for positions where the game is already over don't need an engine.
export function terminalScore(fen: string): Score | null {
  const c = new Chess(fen)
  if (c.isCheckmate()) return { mate: 0 }
  if (c.isDraw() || c.isStalemate()) return { cp: 0 }
  return null
}

// evals[i] is the evaluation of the position before move i (evals has moves.length + 1 entries).
export function findBlunders(moves: GameMove[], evals: PositionEval[], me: Side): Blunder[] {
  const out: Blunder[] = []
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i]
    if (m.color !== me || !evals[i] || !evals[i + 1]) continue
    const before = evals[i]
    const afterOpp = evals[i + 1].score // from the opponent's view
    if (before.best === m.uci) continue

    const loss = clampScore(before.score) - -clampScore(afterOpp)
    const hadMate = 'mate' in before.score && before.score.mate > 0 && before.score.mate <= MISSED_MATE_MAX
    const stillMate = 'mate' in afterOpp && afterOpp.mate <= 0
    const missedMate = hadMate && !stillMate

    if ((loss > BLUNDER_CP || missedMate) && before.best) {
      out.push({
        ply: i,
        fen: m.fenBefore,
        played: m.san,
        best: before.best,
        pv: before.pv.length ? before.pv : [before.best],
        loss,
        kind: missedMate ? 'missed-mate' : 'blunder',
        mateIn: missedMate && 'mate' in before.score ? before.score.mate : undefined,
      })
    }
  }
  return out
}

export function uciToSan(fen: string, uci: string): string | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  } catch {
    return null
  }
}

// Main line in SAN, stopping at the first move that doesn't parse.
export function pvToSan(fen: string, pv: string[], max = 5): string[] {
  const c = new Chess(fen)
  const out: string[] = []
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san)
    } catch {
      break
    }
  }
  return out
}

// All moves of a PGN game plus the final position.
export function gamePositions(pgn: string): { moves: GameMove[]; finalFen: string } {
  const c = new Chess()
  c.loadPgn(pgn)
  const moves = c.history({ verbose: true }).map((m) => ({
    san: m.san,
    uci: m.from + m.to + (m.promotion ?? ''),
    color: m.color,
    fenBefore: m.before,
  }))
  return { moves, finalFen: c.fen() }
}
