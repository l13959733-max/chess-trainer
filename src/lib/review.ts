// "Your last game" (Lu, 28.11.2026: "eine Funktion, wo mein letztes Game geratet wird per Elo, Tipps gegeben und
// erklärt wird, warum Sachen nicht gut sind"). Stockfish in the browser checks every move of one finished game, then:
// how accurate both players were, how strong the game was (an estimate, see gameElo.ts), the key moments with the
// reason and the better move (lib/explain.ts – facts from the engine line, no AI), and tips from the kinds of mistakes.
import { scoreGame } from './accuracy'
import { clampScore, findBlunders, gamePositions, terminalScore, uciToSan, type PositionEval, type Score } from './blunders'
import { gameKey, myColor, type ChessComGame } from './chesscom'
import type { Puzzle } from './db'
import { evaluate, newGame } from './engine'
import { explainBest, explainMistake } from './explain'
import { CATEGORY, categorize, phaseOf, type Category } from './weakness'

export type MomentKind = 'blunder' | 'mistake' | 'inaccuracy'
export interface Moment {
  ply: number
  label: string // "14...Nf6"
  kind: MomentKind
  loss: number // winning chance lost, percentage points
  why: string[] // why the move was not good
  better: string // the better move, SAN
  betterWhy: string[]
  line: string[] // SAN from the start of the game through the opponent's answer, to replay
  category?: Category
  phase: 'opening' | 'middlegame' | 'endgame'
  // what a puzzle needs (Lu, 28.11.: "aus seinen Fehlern lernen" – the moments become exercises)
  fen: string
  played: string // SAN
  bestUci: string
  pv: string[] // UCI, from the best move
  scoreBefore: Score
  refutation?: { best: string; pv: string[]; score: Score }
  cpLoss: number
  missedMate: boolean
}
export interface Review {
  uuid: string
  url: string
  endTime: number
  side: 'w' | 'b'
  opponent: string
  myRating: number
  oppRating: number
  result: 'win' | 'draw' | 'loss'
  how: string
  accuracy: number | null // Lichess formula, my moves
  oppAccuracy: number | null
  safe: number | null // % of my moves that lose less than 2 pawns
  counts: Record<MomentKind, number>
  moments: Moment[] // in the order of the game
  tips: { title: string; rule: string; n: number }[]
  depth: number
  v: number // REVIEW_VERSION – older saved reviews are checked again
}
const REVIEW_VERSION = 2

// winning chance lost in percentage points – the same steps as the coach (lib/coach.ts verdict)
export const kindOf = (loss: number): MomentKind | null => (loss >= 30 ? 'blunder' : loss >= 20 ? 'mistake' : loss >= 10 ? 'inaccuracy' : null)
const DRAW = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']

export async function reviewGame(g: ChessComGame, player: string, depth = 14, onPly?: (ply: number, plies: number) => void): Promise<Review> {
  const { moves, finalFen } = gamePositions(g.pgn)
  const side = myColor(g, player)
  const fens = [...moves.map((m) => m.fenBefore), finalFen]
  const evals: PositionEval[] = []
  newGame()
  for (let i = 0; i < fens.length; i++) {
    onPly?.(i, fens.length)
    const done = terminalScore(fens[i])
    evals.push(done ? { score: done, pv: [] } : await evaluate(fens[i], depth))
  }
  const mine = scoreGame(moves, evals, side)
  const theirs = scoreGame(moves, evals, side === 'w' ? 'b' : 'w')
  // the kind of a moment, with the same rules as the puzzles from your games (a missed mate counts as such)
  const missedMate = new Set(findBlunders(moves, evals, side).filter((b) => b.kind === 'missed-mate').map((b) => b.ply))
  const sans = moves.map((m) => m.san)
  const moments: Moment[] = []
  for (const m of mine.moves) {
    const kind = kindOf(m.winLoss)
    if (!kind || !evals[m.ply + 1]) continue
    const fen = moves[m.ply].fenBefore
    const no = Math.floor(m.ply / 2) + 1
    const after = evals[m.ply + 1]
    const why = explainMistake(fen, m.san, { score: after.score, pv: after.pv })
    const best = evals[m.ply]
    const better = best.best ? uciToSan(fen, best.best) ?? best.best : ''
    const category = kind !== 'inaccuracy' && best.best
      ? categorize({ fen, played: m.san, best: best.best, pv: best.pv, kind: missedMate.has(m.ply) ? 'missed-mate' : 'blunder', refutation: after.best ? { best: after.best, pv: after.pv, score: after.score } : undefined })
      : undefined
    moments.push({
      ply: m.ply,
      label: `${no}${side === 'w' ? '.' : '...'}${m.san}`,
      kind,
      loss: Math.round(m.winLoss),
      why: why.sentences,
      better,
      betterWhy: best.pv.length ? explainBest(fen, best.pv, best.score).sentences : [],
      line: [...sans.slice(0, m.ply), ...why.line.map((s) => s.san)],
      category,
      phase: phaseOf(fen),
      fen,
      played: m.san,
      bestUci: best.best ?? '',
      pv: best.pv,
      scoreBefore: best.score,
      refutation: after.best ? { best: after.best, pv: after.pv, score: after.score } : undefined,
      cpLoss: Math.round(m.cpLoss),
      missedMate: missedMate.has(m.ply),
    })
  }
  const counts = { blunder: 0, mistake: 0, inaccuracy: 0 }
  for (const x of moments) counts[x.kind]++
  // tips: the kinds of this game's mistakes and blunders (exactly the moments shown), most often first;
  // with only inaccuracies, one rule for quiet play
  const byCat = new Map<Category, number>()
  for (const x of moments) if (x.category) byCat.set(x.category, (byCat.get(x.category) ?? 0) + 1)
  const tips = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => ({ title: CATEGORY[c].title, rule: CATEGORY[c].rule, n }))
  if (!tips.length && moments.length) tips.push({ title: CATEGORY.other.title, rule: CATEGORY.other.rule, n: moments.length })
  const me = side === 'w' ? g.white : g.black
  const opp = side === 'w' ? g.black : g.white
  return {
    uuid: g.uuid,
    url: g.url,
    endTime: g.end_time,
    side,
    opponent: opp.username,
    myRating: me.rating,
    oppRating: opp.rating,
    result: me.result === 'win' ? 'win' : DRAW.includes(me.result) ? 'draw' : 'loss',
    how: me.result === 'win' ? opp.result : me.result,
    accuracy: mine.lichess,
    oppAccuracy: theirs.lichess,
    safe: mine.safePct,
    counts,
    moments,
    tips,
    depth,
    v: REVIEW_VERSION,
  }
}

// one review per game on this device (the analysis takes a minute – do it once)
const KEY = 'hoppy-reviews'
export function loadReview(uuid: string, depth: number): Review | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Review>
    const r = all[uuid]
    return r && r.depth >= depth && r.v === REVIEW_VERSION ? r : null
  } catch {
    return null
  }
}
export function saveReview(r: Review) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Review>
    all[r.uuid] = r
    const keep = Object.values(all).sort((a, b) => b.endTime - a.endTime).slice(0, 20)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep.map((x) => [x.uuid, x]))))
  } catch {
    // not kept – the page still shows it now
  }
}

// The game's mistakes and blunders as puzzles – the same shape and the same id as the puzzles the analyzer makes
// (lib/analyzer.ts), so a later analysis of the game does not add them twice. Inaccuracies are too small for a puzzle.
export function momentPuzzles(r: Review, player: string): Puzzle[] {
  return r.moments
    .filter((m) => m.kind !== 'inaccuracy' && m.bestUci)
    .map((m) => ({
      id: `${gameKey(player, r.uuid)}:${m.ply}`,
      ply: m.ply,
      fen: m.fen,
      played: m.played,
      best: m.bestUci,
      pv: m.pv,
      loss: Math.max(0, Math.min(m.cpLoss, clampScore({ cp: 1000 }))),
      kind: m.missedMate ? 'missed-mate' : 'blunder',
      player,
      gameUuid: r.uuid,
      gameUrl: r.url,
      endTime: r.endTime,
      opponent: r.opponent,
      myColor: r.side,
      scoreBefore: m.scoreBefore,
      bestSan: m.better,
      refutation: m.refutation,
      category: m.category,
    }))
}
