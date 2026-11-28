// Learning together (Lu, 28.11.2026: "zusammen spielen und lernen; die App soll sich so verbreiten, dass Freunde sie
// einander schicken"). Two pure pieces: the streak two friends keep together, and a challenge link that carries one
// position – a friend opens it in the browser and solves it, no account, no server.
import { Chess } from 'chess.js'

// Days in a row (ending today, or yesterday while today is still open) on which BOTH practised. Dates = YYYY-MM-DD.
export function togetherStreak(mine: string[], theirs: string[], today: string): number {
  const both = new Set(mine.filter((d) => theirs.includes(d)))
  const day = new Date(today + 'T12:00:00Z')
  if (!both.has(today)) day.setUTCDate(day.getUTCDate() - 1)
  let n = 0
  while (both.has(day.toISOString().slice(0, 10))) {
    n++
    day.setUTCDate(day.getUTCDate() - 1)
  }
  return n
}

export interface Challenge {
  fen: string // the position, the side to move is the one who solves
  best: string[] // UCI: the solution (first move; more moves = the line)
  played?: string // what the sender played in the game (SAN)
  from: string // the sender's name
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

export function encodeChallenge(c: Challenge): string {
  return b64(JSON.stringify({ f: c.fen, b: c.best.slice(0, 5), p: c.played, n: c.from.slice(0, 30) }))
}

// null when the link is broken or the position / solution is not legal
export function decodeChallenge(text: string): Challenge | null {
  try {
    const o = JSON.parse(unb64(text)) as { f?: unknown; b?: unknown; p?: unknown; n?: unknown }
    if (typeof o.f !== 'string' || !Array.isArray(o.b) || !o.b.length || typeof o.n !== 'string') return null
    const c = new Chess(o.f)
    for (const u of o.b) {
      if (typeof u !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) return null
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    }
    return { fen: o.f, best: o.b as string[], played: typeof o.p === 'string' ? o.p : undefined, from: o.n }
  } catch {
    return null
  }
}

export const challengeLink = (c: Challenge) => `${window.location.origin}${window.location.pathname}#/challenge/${encodeChallenge(c)}`

// the phone's share sheet (WhatsApp & co.), else copy the text and the link
export async function share(text: string, url: string): Promise<'shared' | 'copied' | 'closed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Hoppy', text, url })
      return 'shared'
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    return 'copied'
  } catch {
    return 'closed'
  }
}
export const inviteLink = (code: string) => `${window.location.origin}${window.location.pathname}#/watch/join/${code}`
