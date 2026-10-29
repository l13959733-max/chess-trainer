// Chess.com public API (no login needed). Requests run one after another, as chess.com asks.
export const USERNAME = 'l0o2' // Lu, the default player
const API = 'https://api.chess.com/pub/player/'
const PLAYER_KEY = 'chess-trainer-player'

// Whose games this device analyses (each phone can have its own player, e.g. Lu's girlfriend johanzii)
export function getPlayer(): string {
  try {
    return localStorage.getItem(PLAYER_KEY) || USERNAME
  } catch {
    return USERNAME
  }
}

export function setPlayer(name: string) {
  try {
    localStorage.setItem(PLAYER_KEY, name.trim().toLowerCase())
  } catch {
    // not saved; stays for this visit only through the caller's state
  }
}

// The chess.com username as chess.com spells it, or null when there is no such player
export async function findPlayer(name: string): Promise<string | null> {
  const res = await fetch(API + encodeURIComponent(name.trim().toLowerCase()))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`chess.com answered ${res.status}`)
  return ((await res.json()).username as string).toLowerCase()
}

// Storage keys: Lu's records keep their original keys, other players' records are prefixed
export function gameKey(player: string, uuid: string): string {
  return player === USERNAME ? uuid : `${player}:${uuid}`
}

export function ownerOfKey(key: string): string {
  const i = key.indexOf(':')
  return i === -1 ? USERNAME : key.slice(0, i)
}

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
