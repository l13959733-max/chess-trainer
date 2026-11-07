// The portal to the real world: quests you solve in your real chess.com games, and the report
// after every 20 rapid games. Only finished games are read – the app never helps during a game.
import { followBook, type Followed } from './check'
import { fetchArchives, fetchMonth, isTrainingGame, type ChessComGame } from './chesscom'

export const REPORT_EVERY = 20

export interface RealQuest {
  id: 'guard' | 'rome'
  after: string // the station whose boss opens it
  title: string
  text: string
  games: number
  chestnuts: number
}

export const REAL_QUESTS: RealQuest[] = [
  {
    id: 'guard',
    after: 'kannauj',
    title: 'Three games with the guard',
    text: 'Play 3 rapid games on chess.com. Before every move ask: what is attacked, what is guarded? Afterwards you see how many pieces you left hanging.',
    games: 3,
    chestnuts: 30,
  },
  {
    id: 'rome',
    after: 'rome',
    title: 'Your Italian in a real game',
    text: 'Play White and open 1.e4. When your opponent answers 1…e5, play the moves from your book – at least 4 of your own moves, or until your opponent leaves the book.',
    games: 1,
    chestnuts: 30,
  },
]

// Rapid games that ended after `since` (newest first)
export async function rapidSince(player: string, since: number): Promise<ChessComGame[]> {
  const out: ChessComGame[] = []
  const first = new Date(since)
  const firstMonth = first.getUTCFullYear() * 12 + first.getUTCMonth()
  for (const url of (await fetchArchives(player)).reverse()) {
    const [y, m] = url.split('/').slice(-2).map(Number)
    if (y * 12 + (m - 1) < firstMonth) break
    const games = (await fetchMonth(url)).filter((g) => isTrainingGame(g, player) && g.time_class === 'rapid' && g.end_time * 1000 >= since)
    out.push(...games)
  }
  return out.sort((a, b) => b.end_time - a.end_time)
}

// Rome: a White game 1.e4 e5 where you stayed in your book for 4 of your own moves,
// or never left it before your opponent did
export function romeDone(f: Followed | null): boolean {
  if (!f || f.sans[0] !== 'e4' || f.sans[1] !== 'e5') return false
  if (f.left?.who === 'you') return f.plies >= 8
  return f.plies >= 8 || f.left?.who === 'they'
}

export function followAsWhite(g: { pgn: string }, book: Parameters<typeof followBook>[1]): Followed | null {
  return followBook({ pgn: g.pgn, color: 'w' }, book)
}
