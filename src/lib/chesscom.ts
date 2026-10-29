// Chess.com public API (no login needed). Requests run one after another, as chess.com asks.
export const USERNAME = 'l0o2'
const API = 'https://api.chess.com/pub/player/'

export interface ChessComGame {
  uuid: string
  url: string
  pgn: string
  end_time: number
  time_class: string
  rules: string
  rated: boolean
  white: { username: string; result: string; rating: number }
  black: { username: string; result: string; rating: number }
}

export async function fetchArchives(user = USERNAME): Promise<string[]> {
  const res = await fetch(`${API}${user}/games/archives`)
  if (!res.ok) throw new Error(`chess.com answered ${res.status} for the archive list`)
  return (await res.json()).archives as string[]
}

export async function fetchMonth(url: string): Promise<ChessComGame[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`chess.com answered ${res.status} for ${url.split('/games/')[1]}`)
  return (await res.json()).games as ChessComGame[]
}

// Only rapid and daily standard chess, as in the spec.
export function isTrainingGame(g: ChessComGame, user = USERNAME): boolean {
  const mine = [g.white.username, g.black.username].some((u) => u.toLowerCase() === user.toLowerCase())
  return mine && g.rules === 'chess' && (g.time_class === 'rapid' || g.time_class === 'daily') && !!g.pgn
}

export function myColor(g: ChessComGame, user = USERNAME): 'w' | 'b' {
  return g.white.username.toLowerCase() === user.toLowerCase() ? 'w' : 'b'
}
