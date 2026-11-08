// How well did someone play a game? Three ways to put it in one number, all from our own
// Stockfish evaluations (never from chess.com or Lichess servers), so Lu can compare them
// side by side on the test page and decide which one the app shows (BAUPLAN point 16).
//
// Input is the same as findBlunders(): evals[i] = evaluation of the position BEFORE move i,
// from the side to move's point of view (evals has moves.length + 1 entries).
import { BLUNDER_CP, clampScore, type GameMove, type PositionEval } from './blunders'
import type { Side } from './pgn'
import { winChance } from './bot'

// A move is "safe" when it gives away less than this (centipawns, clamped like the blunder trainer).
// Same line as the blunder trainer, so "safe moves" and "puzzles from my blunders" always agree.
export const SAFE_CP = BLUNDER_CP

export interface MoveScore {
  ply: number
  san: string
  cpBefore: number // mover's view, clamped
  cpAfter: number // mover's view, clamped
  cpLoss: number // >= 0
  winBefore: number // mover's winning chance in %, before the move
  winAfter: number // ... after the move
  winLoss: number // >= 0, percentage points
  accuracy: number // Lichess move accuracy, 0..100
  safe: boolean // cpLoss < SAFE_CP
}

export interface GameScore {
  moves: MoveScore[] // only the given side's moves, with every number in between (for the "show me" view)
  safePct: number | null // Lu's metric: share of safe moves in %
  lichess: number | null // Lichess-style game accuracy in %
  meanAccuracy: number | null // plain average of move accuracies, for comparison
}

// Lichess move accuracy from the drop in winning chance (lichess.org/page/accuracy)
export function moveAccuracy(winLoss: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, winLoss)) - 3.1669
  return Math.max(0, Math.min(100, a))
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function stdDev(xs: number[]): number {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

function harmonicMean(xs: number[]): number {
  // accuracy 0 would make it 0 straight away; Lichess avoids that the same way (tiny floor)
  return xs.length / xs.reduce((a, x) => a + 1 / Math.max(x, 0.01), 0)
}

// Game accuracy the way Lichess describes it: the average of (a) a mean weighted by how
// sharp the position was (std. deviation of the winning chances around each move) and
// (b) the harmonic mean, which punishes single big mistakes. Rebuilt from the public
// description, not copied 1:1 from their code: numbers can differ slightly from lichess.org.
export function lichessGameAccuracy(winsWhite: number[], moves: { accuracy: number; index: number }[]): number | null {
  if (!moves.length) return null
  const windowSize = Math.max(2, Math.min(8, Math.floor(winsWhite.length / 10)))
  const weightAt = (i: number) => {
    const start = Math.max(0, Math.min(i - Math.floor(windowSize / 2), winsWhite.length - windowSize))
    return Math.max(0.5, Math.min(12, stdDev(winsWhite.slice(start, start + windowSize))))
  }
  const weights = moves.map((m) => weightAt(m.index))
  const weighted = moves.reduce((a, m, k) => a + m.accuracy * weights[k], 0) / weights.reduce((a, b) => a + b, 0)
  const harmonic = harmonicMean(moves.map((m) => m.accuracy))
  return (weighted + harmonic) / 2
}

export function scoreGame(moves: GameMove[], evals: PositionEval[], side: Side): GameScore {
  const out: MoveScore[] = []
  const lichessMoves: { accuracy: number; index: number }[] = []
  // winning chance for White before every position, for the sharpness weights
  const winsWhite = evals.map((e, i) => {
    const w = winChance(e.score)
    const whiteToMove = i < moves.length ? moves[i].color === 'w' : moves.length > 0 && moves[moves.length - 1].color === 'b'
    return whiteToMove ? w : 100 - w
  })
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i]
    if (m.color !== side || !evals[i] || !evals[i + 1]) continue
    const cpBefore = clampScore(evals[i].score)
    const cpAfter = -clampScore(evals[i + 1].score)
    const winBefore = winChance(evals[i].score)
    const winAfter = 100 - winChance(evals[i + 1].score)
    const winLoss = Math.max(0, winBefore - winAfter)
    const cpLoss = Math.max(0, cpBefore - cpAfter)
    const accuracy = moveAccuracy(winLoss)
    out.push({ ply: i, san: m.san, cpBefore, cpAfter, cpLoss, winBefore, winAfter, winLoss, accuracy, safe: cpLoss < SAFE_CP })
    lichessMoves.push({ accuracy, index: i })
  }
  const n = out.length
  return {
    moves: out,
    safePct: n ? (100 * out.filter((x) => x.safe).length) / n : null,
    lichess: lichessGameAccuracy(winsWhite, lichessMoves),
    meanAccuracy: n ? mean(out.map((x) => x.accuracy)) : null,
  }
}
