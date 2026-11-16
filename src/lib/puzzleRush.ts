// Puzzle Rush (BAUPLAN 34B, Lu 16.11.: "Puzzle auch auf Zeit, nach dem gleichen Konzept, Sounds … das macht Spaß"):
// 3 minutes, 3 lives, from easy to hard, your own mistakes mixed in. Pure rules here (tested in puzzleRush.test.ts);
// the screen is src/screens/PuzzleRush.tsx. It is the fun extra – it does not count for "safe moves in %".

export const PR_TIME = 180_000 // ms
export const PR_LIVES = 3
export const PR_COMBO = 3 // right in a row → explosion + bonus time
export const PR_BONUS_MS = 5_000
export const OWN_RATING = 800 // your own mistakes count like a middle puzzle
export const OWN_EVERY = 4 // every 4th task is one of your own mistakes (when there are any)

export interface RushState {
  end: number // ms timestamp
  lives: number
  score: number
  streak: number // right in a row
  combo: number // towards the next explosion
  solved: number
  missed: string[] // ids, in order
}

export const startRush = (now: number): RushState => ({ end: now + PR_TIME, lives: PR_LIVES, score: 0, streak: 0, combo: 0, solved: 0, missed: [] })

// harder puzzles give more: 10 under 700, then +10 per 200 rating points
export function pointsFor(rating: number): number {
  return 10 + 10 * Math.max(0, Math.floor((rating - 500) / 200))
}

export function solve(s: RushState, rating: number): { s: RushState; boom: boolean } {
  const combo = s.combo + 1
  const boom = combo >= PR_COMBO
  return {
    s: { ...s, score: s.score + pointsFor(rating), streak: s.streak + 1, combo: boom ? 0 : combo, solved: s.solved + 1, end: boom ? s.end + PR_BONUS_MS : s.end },
    boom,
  }
}

export function miss(s: RushState, id: string): RushState {
  return { ...s, lives: Math.max(0, s.lives - 1), streak: 0, combo: 0, missed: [...s.missed, id] }
}

export const timeLeft = (s: RushState, now: number) => Math.max(0, s.end - now)
export const isOver = (s: RushState, now: number) => s.lives <= 0 || timeLeft(s, now) <= 0

export function starsFor(score: number): number {
  return score >= 400 ? 3 : score >= 200 ? 2 : score >= 60 ? 1 : 0
}

export interface RushItem {
  id: string
  rating: number
  theme?: string // Lichess theme, for "Fork found!"
  own?: boolean // one of your own mistakes
}

// The order of a run: Lichess puzzles climbing in rating (a random one near each step, so every run is new),
// a puzzle missed in earlier runs comes back first (repetition), and every OWN_EVERY-th task is one of your own.
export function buildQueue(lichess: RushItem[], own: RushItem[], again: string[], rnd: () => number, length = 80): RushItem[] {
  const pool = [...lichess].sort((a, b) => a.rating - b.rating)
  const used = new Set<string>()
  const out: RushItem[] = []
  const back = again.map((id) => pool.find((p) => p.id === id)).filter((p): p is RushItem => !!p)
  const mine = [...own].sort(() => rnd() - 0.5)
  if (!pool.length) return mine.slice(0, length)
  const lo = pool[0].rating
  const hi = pool[pool.length - 1].rating
  for (let k = 0; out.length < length; k++) {
    if (mine.length && (out.length + 1) % OWN_EVERY === 0) {
      out.push(mine.shift()!)
      continue
    }
    if (back.length && out.length % 5 === 1) {
      const b = back.shift()!
      if (!used.has(b.id)) {
        used.add(b.id)
        out.push(b)
        continue
      }
    }
    // the next rating step, then a random unused puzzle among the 6 closest to it
    const target = lo + ((hi - lo) * Math.min(k, 60)) / 60
    const near = pool.filter((p) => !used.has(p.id)).sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target)).slice(0, 6)
    if (!near.length) break
    const p = near[Math.floor(rnd() * near.length)]
    used.add(p.id)
    out.push(p)
  }
  return out
}

// praise with information: what you found, not just "great"
const FOUND: Record<string, string> = {
  fork: 'Fork found!', pin: 'Pin found!', skewer: 'Skewer found!', hanging: 'Free piece taken!', discovered: 'Discovered attack!',
  removal: 'Defender removed!', deflection: 'Deflection!', attraction: 'Decoy!', intermezzo: 'In-between move!', combo: 'Combination!',
  mate1: 'Mate found!', mate2: 'Mate in two!', backrank: 'Back-rank mate!', smothered: 'Smothered mate!', arabian: 'Arabian mate!',
  anastasia: "Anastasia's mate!", hook: 'Hook mate!', pawnEnd: 'Pawn ending won!', rookEnd: 'Rook ending!', minorEnd: 'Endgame skill!',
  queenEnd: 'Queen ending!', convert: 'Advantage used!', defend: 'Held the fort!',
}
export const praiseFor = (it: RushItem) => (it.own ? 'Your own mistake – fixed!' : (it.theme && FOUND[it.theme]) || 'Found it!')

// missed Lichess puzzles come back in later runs until you solve them
export function remember(again: string[], missed: string[], solved: string[], max = 30): string[] {
  const keep = again.filter((id) => !solved.includes(id))
  return [...missed.filter((id) => !keep.includes(id)), ...keep].slice(0, max)
}
