// "Clean shine": a finished chess.com game without a big mistake earns a mark, and the world map
// gets a little brighter with every one. Plus the honest number of how often the Shadow struck
// (a threat of the opponent not seen) – both only from games the analysis has really read.
import type { GameRecord, Puzzle } from './db'
import { CATEGORY } from './weakness'

export const SHINE_FULL = 20 // clean games for the brightest map

const uuidOf = (key: string) => (key.includes(':') ? key.slice(key.indexOf(':') + 1) : key)

// Clean = analysed, and no blunder or missed mate of yours
export function cleanGames(records: GameRecord[], since = 0): GameRecord[] {
  return records.filter((g) => g.blunders === 0 && g.plies > 0 && g.endTime * 1000 >= since).sort((a, b) => b.endTime - a.endTime)
}

export function isClean(records: GameRecord[], uuid: string): boolean | null {
  const r = records.find((g) => uuidOf(g.uuid) === uuid)
  return r ? r.blunders === 0 : null
}

// 0 … 1: how bright the map is
export function shine(clean: number): number {
  return Math.min(clean, SHINE_FULL) / SHINE_FULL
}

// In how many of your last `n` analysed games did you miss a threat of your opponent?
export function shadowStrikes(records: GameRecord[], puzzles: Puzzle[], n = 10): { games: number; struck: number } | null {
  const last = [...records].sort((a, b) => b.endTime - a.endTime).slice(0, n)
  if (last.length < 5) return null
  const hit = new Set(puzzles.filter((p) => p.category && CATEGORY[p.category].family === 'opponent').map((p) => p.gameUuid))
  return { games: last.length, struck: last.filter((g) => hit.has(uuidOf(g.uuid))).length }
}
