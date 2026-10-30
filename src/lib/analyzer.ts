// Background analysis of Lu's chess.com games: newest first, one position at a time,
// pausable, and resumable because every finished game is stored.
import { Chess } from 'chess.js'
import { findBlunders, gamePositions, terminalScore, uciToSan, type PositionEval } from './blunders'
import { fetchArchives, fetchMonth, gameKey, getPlayer, isTrainingGame, myColor, type ChessComGame } from './chesscom'
import { getAnalyzedGameIds, saveAnalyzedGame, type Puzzle } from './db'
import { evaluate, newGame } from './engine'

export const DEPTH = 14
const BOT_GAME_DEPTH = 12 // quicker, right after the game

export interface AnalyzerState {
  status: 'idle' | 'loading' | 'running' | 'paused' | 'done' | 'error'
  total: number // rapid + daily games on chess.com
  analyzed: number
  found: number // puzzles found in this run
  current?: { opponent: string; date: string; ply: number; plies: number }
  error?: string
  player?: string
}

let state: AnalyzerState = { status: 'idle', total: 0, analyzed: 0, found: 0 }
const listeners = new Set<(s: AnalyzerState) => void>()
let stopRequested = false
let wakeLock: { release: () => Promise<void> } | null = null

function set(patch: Partial<AnalyzerState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l(state))
}

export function subscribe(fn: (s: AnalyzerState) => void): () => void {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

export function getState() {
  return state
}

// Switching players: stop and forget the counts of the previous player
export async function reset() {
  pause()
  for (let i = 0; i < 50 && (state.status === 'running' || state.status === 'loading'); i++) await new Promise((r) => setTimeout(r, 100))
  set({ status: 'idle', total: 0, analyzed: 0, found: 0, current: undefined, error: undefined, player: undefined })
}

export function pause() {
  if (state.status === 'running' || state.status === 'loading') stopRequested = true
}

// Keep the phone screen on while analysing (optional; ignored where unsupported)
async function holdScreen(on: boolean) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await (navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen')
    } else if (!on && wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch {
    wakeLock = null
  }
}

async function analyzeGame(g: ChessComGame, player: string): Promise<Puzzle[]> {
  const { moves, finalFen } = gamePositions(g.pgn)
  const me = myColor(g, player)
  const opponent = me === 'w' ? g.black.username : g.white.username
  const date = new Date(g.end_time * 1000).toLocaleDateString('en-GB')
  const fens = [...moves.map((m) => m.fenBefore), finalFen]
  const evals: PositionEval[] = []
  newGame()
  for (let i = 0; i < fens.length; i++) {
    if (stopRequested) throw new Error('paused')
    set({ current: { opponent, date, ply: i, plies: fens.length } })
    const done = terminalScore(fens[i])
    evals.push(done ? { score: done, pv: [] } : await evaluate(fens[i], DEPTH))
  }
  return findBlunders(moves, evals, me).map((b) => ({
    ...b,
    id: `${gameKey(player, g.uuid)}:${b.ply}`,
    player,
    gameUuid: g.uuid,
    gameUrl: g.url,
    endTime: g.end_time,
    opponent,
    myColor: me,
    scoreBefore: evals[b.ply].score,
    bestSan: uciToSan(b.fen, b.best) ?? b.best,
  }))
}

export async function start() {
  if (state.status === 'running' || state.status === 'loading') return
  stopRequested = false
  set({ status: 'loading', error: undefined, found: 0 })
  holdScreen(true)
  try {
    const player = getPlayer()
    set({ player })
    const done = await getAnalyzedGameIds(player)
    const archives = (await fetchArchives(player)).reverse() // newest month first
    const todo: ChessComGame[] = []
    let total = 0
    for (const url of archives) {
      if (stopRequested) throw new Error('paused')
      const games = (await fetchMonth(url)).filter((g) => isTrainingGame(g, player)).sort((a, b) => b.end_time - a.end_time)
      total += games.length
      todo.push(...games.filter((g) => !done.has(g.uuid)))
    }
    set({ status: 'running', total, analyzed: total - todo.length })

    for (const g of todo) {
      const puzzles = await analyzeGame(g, player)
      await saveAnalyzedGame(
        { uuid: gameKey(player, g.uuid), endTime: g.end_time, analyzedAt: Date.now(), plies: state.current?.plies ?? 0, blunders: puzzles.length },
        puzzles,
      )
      set({ analyzed: state.analyzed + 1, found: state.found + puzzles.length })
    }
    set({ status: 'done', current: undefined })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'paused') set({ status: 'paused', current: undefined })
    else set({ status: 'error', error: msg, current: undefined })
  } finally {
    stopRequested = false
    holdScreen(false)
  }
}

// A finished game against Hoppy-Bot: find the player's mistakes and store them as puzzles.
// Uses the same engine queue as the background analysis (they take turns).
export async function analyzeBotGame(
  game: { id: string; startFen: string; moves: string[]; me: 'w' | 'b'; botRating: number },
  onProgress?: (done: number, total: number) => void,
): Promise<Puzzle[]> {
  const player = getPlayer()
  const c = new Chess(game.startFen)
  const moves = game.moves.map((uci) => {
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return { san: m.san, uci, color: m.color, fenBefore: m.before }
  })
  const fens = [...moves.map((m) => m.fenBefore), c.fen()]
  const evals: PositionEval[] = []
  for (let i = 0; i < fens.length; i++) {
    onProgress?.(i, fens.length)
    const done = terminalScore(fens[i])
    evals.push(done ? { score: done, pv: [] } : await evaluate(fens[i], BOT_GAME_DEPTH))
  }
  const now = Math.floor(Date.now() / 1000)
  const puzzles: Puzzle[] = findBlunders(moves, evals, game.me).map((b) => ({
    ...b,
    id: `bot-${player}:${game.id}:${b.ply}`,
    player,
    source: 'bot',
    gameUuid: game.id,
    gameUrl: '',
    endTime: now,
    opponent: `Hoppy-Bot ${game.botRating}`,
    myColor: game.me,
    scoreBefore: evals[b.ply].score,
    bestSan: uciToSan(b.fen, b.best) ?? b.best,
  }))
  await saveAnalyzedGame({ uuid: `bot-${player}:${game.id}`, endTime: now, analyzedAt: Date.now(), plies: moves.length, blunders: puzzles.length }, puzzles)
  return puzzles
}
