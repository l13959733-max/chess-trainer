// The rapid rating over time, from chess.com's monthly archives (every game carries both ratings).
// Kept on the device for 6 hours, so opening the Journey page does not ask chess.com every time.
import { fetchArchives, fetchMonth } from './chesscom'
import { rapidHistory, type Point } from './growth'

const KEY = 'hoppy-rapid-history-'
const FRESH = 6 * 3600_000
const MONTHS = 12

export function cachedRapid(player: string): Point[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + player.toLowerCase()) ?? 'null')
    return v && Array.isArray(v.pts) ? v.pts : null
  } catch {
    return null
  }
}

export async function loadRapid(player: string): Promise<Point[]> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + player.toLowerCase()) ?? 'null')
    if (v && Date.now() - v.at < FRESH && Array.isArray(v.pts)) return v.pts
  } catch {
    // read again
  }
  const months = (await fetchArchives(player)).slice(-MONTHS)
  const games = (await Promise.all(months.map((m) => fetchMonth(m).catch(() => [])))).flat()
  const pts = rapidHistory(games, player)
  try {
    localStorage.setItem(KEY + player.toLowerCase(), JSON.stringify({ at: Date.now(), pts }))
  } catch {
    // not kept
  }
  return pts
}
