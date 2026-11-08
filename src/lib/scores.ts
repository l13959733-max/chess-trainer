// Prototype for BAUPLAN point 16, step A: score finished chess.com games three ways
// (safe moves %, Lichess formula, chess.com's own number if the game was reviewed there)
// with our own Stockfish. Stored apart from the blunder analysis (localStorage), so the
// existing puzzles and analysed-game list are never touched.
import { scoreGame, type MoveScore } from './accuracy'
import { gamePositions, terminalScore, type PositionEval } from './blunders'
import { myColor, type ChessComGame } from './chesscom'
import { recentRapid } from './analyzer'
import { evaluate, newGame } from './engine'

export interface ScoredGame {
  uuid: string
  url: string
  endTime: number
  opponent: string
  side: 'w' | 'b'
  result: string // 'win' | 'resigned' | ... from chess.com, my side
  depth: number
  safePct: number | null
  lichess: number | null
  meanAccuracy: number | null
  chesscom: number | null // chess.com accuracy, only if the game was reviewed there
  moves: MoveScore[]
}

const KEY = 'chess-trainer-scores'

export function loadScores(): ScoredGame[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ScoredGame[]) : []
  } catch {
    return []
  }
}

function saveScores(list: ScoredGame[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.sort((a, b) => b.endTime - a.endTime).slice(0, 50)))
  } catch {
    /* storage full or blocked: the page still shows this session's results */
  }
}

export async function scoreOne(g: ChessComGame, player: string, depth: number, onPly?: (ply: number, plies: number) => void): Promise<ScoredGame> {
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
  const s = scoreGame(moves, evals, side)
  const acc = g.accuracies ? (side === 'w' ? g.accuracies.white : g.accuracies.black) : undefined
  return {
    uuid: g.uuid,
    url: g.url,
    endTime: g.end_time,
    opponent: side === 'w' ? g.black.username : g.white.username,
    side,
    result: side === 'w' ? g.white.result : g.black.result,
    depth,
    safePct: s.safePct,
    lichess: s.lichess,
    meanAccuracy: s.meanAccuracy,
    chesscom: typeof acc === 'number' ? acc : null,
    moves: s.moves,
  }
}

// Scores the newest finished rapid games that are not scored yet at this depth.
// Finished games only (fair play): chess.com's archive never contains running games.
export async function scoreRecent(
  player: string,
  count: number,
  depth: number,
  onProgress: (text: string) => void,
  shouldStop: () => boolean,
): Promise<ScoredGame[]> {
  const have = loadScores()
  const done = new Set(have.filter((x) => x.depth === depth).map((x) => x.uuid))
  onProgress('Loading your games from chess.com …')
  const games = (await recentRapid(player, count)).filter((g) => !done.has(g.uuid))
  let list = have
  for (let k = 0; k < games.length; k++) {
    if (shouldStop()) break
    const g = games[k]
    const scored = await scoreOne(g, player, depth, (ply, plies) => onProgress(`Game ${k + 1} of ${games.length}: move ${Math.ceil(ply / 2)} of ${Math.ceil(plies / 2)}`))
    list = [scored, ...list.filter((x) => !(x.uuid === scored.uuid && x.depth === depth))]
    saveScores(list)
  }
  return loadScores()
}
