// "Your opponents": what people actually play against this player (recent chess.com games),
// which chapters that means, and where the player leaves the lines they learned.
import { Chess } from 'chess.js'
import { chapters } from './chapters'
import { fetchArchives, fetchMonth, type ChessComGame } from './chesscom'
import type { Line, Side } from './pgn'

export interface GameOpening {
  color: Side
  sans: string[] // the first moves of the game
}

export interface ChapterHit {
  key: string
  title: string
  side: Side
  games: number
  learned: number // lines of the chapter played at least once
  total: number
}

export interface Detour {
  lineId: string
  lineTitle: string
  moveNo: string // e.g. "2."
  played: string
  expected: string
  games: number
}

export interface OpponentStats {
  games: number
  firstMoves: { w: { san: string; games: number }[]; b: { san: string; games: number }[] }
  chapters: ChapterHit[]
  detours: Detour[]
}

const PLIES = 16

export function openingOf(g: ChessComGame, player: string): GameOpening | null {
  try {
    const c = new Chess()
    c.loadPgn(g.pgn)
    const sans = c.history().slice(0, PLIES)
    if (sans.length < 2) return null
    return { color: g.white.username.toLowerCase() === player.toLowerCase() ? 'w' : 'b', sans }
  } catch {
    return null
  }
}

// The built-in lines that share the most moves with the game (at least 2 plies), for the player's color
function bestLines(o: GameOpening, lines: Line[]): { lines: Line[]; common: number } | null {
  let best: { lines: Line[]; common: number } | null = null
  for (const l of lines) {
    if (l.side !== o.color || l.source !== 'builtin') continue
    let i = 0
    while (i < o.sans.length && i < l.moves.length && o.sans[i] === l.moves[i].san) i++
    if (i < 2) continue
    if (!best || i > best.common) best = { lines: [l], common: i }
    else if (i === best.common) best.lines.push(l)
  }
  return best
}

export function computeStats(openings: GameOpening[], lines: Line[], learned: (lineId: string) => boolean): OpponentStats {
  const first = { w: new Map<string, number>(), b: new Map<string, number>() }
  const perChapter = new Map<string, number>()
  const detours = new Map<string, Detour>()
  const chapterOf = new Map<string, string>()
  const chs = chapters(lines.filter((l) => l.source === 'builtin'))
  for (const ch of chs) for (const l of ch.lines) chapterOf.set(l.id, ch.key)

  for (const o of openings) {
    // As White: Black's answer to the first move. As Black: White's first move.
    const key = o.color === 'w' ? o.sans[1] : o.sans[0]
    first[o.color].set(key, (first[o.color].get(key) ?? 0) + 1)
    const hit = bestLines(o, lines)
    if (!hit) continue
    // Only count it when the game clearly belongs to one chapter (e.g. 1.e4 e5 2.d4 fits none of them)
    const chs = new Set(hit.lines.map((l) => chapterOf.get(l.id)))
    if (chs.size === 1) {
      const ch = [...chs][0]
      if (ch) perChapter.set(ch, (perChapter.get(ch) ?? 0) + 1)
    }
    // The player left the lines with their own move, and all matching lines agree on the right move
    const nexts = new Set(hit.lines.map((l) => l.moves[hit.common]?.san))
    const line = hit.lines[0]
    const next = line.moves[hit.common]
    if (nexts.size === 1 && next && hit.common < o.sans.length && next.color === o.color) {
      const id = `${next.fenBefore}:${o.sans[hit.common]}`
      const d = detours.get(id) ?? {
        lineId: line.id,
        lineTitle: line.title,
        moveNo: `${Math.floor(hit.common / 2) + 1}.${next.color === 'b' ? '..' : ''}`,
        played: o.sans[hit.common],
        expected: next.san,
        games: 0,
      }
      d.games++
      detours.set(id, d)
    }
  }
  const sorted = (m: Map<string, number>) => [...m.entries()].map(([san, games]) => ({ san, games })).sort((a, b) => b.games - a.games)
  return {
    games: openings.length,
    firstMoves: { w: sorted(first.w), b: sorted(first.b) },
    chapters: chs
      .filter((c) => perChapter.get(c.key))
      .map((c) => ({ key: c.key, title: c.title, side: c.side!, games: perChapter.get(c.key)!, learned: c.lines.filter((l) => learned(l.id)).length, total: c.lines.length }))
      .sort((a, b) => b.games - a.games),
    detours: [...detours.values()].filter((d) => d.games >= 2).sort((a, b) => b.games - a.games).slice(0, 5),
  }
}

const CACHE = 'chess-trainer-opponents'
const MAX_AGE = 12 * 60 * 60 * 1000

// Recent games (last 3 months, no bullet), cached on the device for 12 hours
export async function recentOpenings(player: string, force = false): Promise<GameOpening[]> {
  const key = `${CACHE}:${player}`
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; openings: GameOpening[] } | null
      if (c && Date.now() - c.at < MAX_AGE) return c.openings
    } catch {
      // ignore
    }
  }
  const archives = (await fetchArchives(player)).slice(-3)
  const games: ChessComGame[] = []
  for (const url of archives) games.push(...(await fetchMonth(url)))
  const openings = games.filter((g) => g.rules === 'chess' && g.time_class !== 'bullet').map((g) => openingOf(g, player)).filter((o): o is GameOpening => !!o)
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), openings }))
  } catch {
    // too big or blocked: just not cached
  }
  return openings
}
