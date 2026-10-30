// Hoppy-Bot: plays like a human of a given rating. Stockfish rates every legal move, then the bot
// picks a move from the quality class a human of that rating would play, with the same frequencies.
//
// Frequencies for 300–700 are MEASURED on 1,279 analysed rapid games of l0o2 (opponents' moves,
// by their rating; Stockfish depth 14, 30.10.2026). Higher ratings are ESTIMATES (extrapolated).
import { clampScore, type Score } from './blunders'

export interface Candidate {
  uci: string
  score: Score // from the bot's (side to move's) view
}

// Share of moves per class, in percent: best = engine's first choice; then by lost winning chance:
// near < 3, small 3–10, mistake 10–30, gross ≥ 30 percentage points. gift = how often a free piece
// or a won position after the opponent's gross error is taken.
interface Profile {
  rating: number
  best: number
  small: number
  mistake: number
  gross: number
  gift: number
  measured: boolean
}

const PROFILES: Profile[] = [
  { rating: 100, best: 22, small: 25, mistake: 19, gross: 10, gift: 60, measured: false },
  { rating: 300, best: 27.2, small: 23.9, mistake: 16.3, gross: 7.6, gift: 72, measured: true },
  { rating: 400, best: 31.3, small: 22.7, mistake: 16.5, gross: 6.7, gift: 72, measured: true },
  { rating: 500, best: 33.0, small: 21.3, mistake: 13.9, gross: 5.5, gift: 77, measured: true },
  { rating: 600, best: 34.1, small: 21.8, mistake: 12.9, gross: 4.6, gift: 80, measured: true },
  { rating: 700, best: 35.9, small: 20.4, mistake: 11.1, gross: 3.8, gift: 86, measured: true },
  { rating: 800, best: 37, small: 20, mistake: 10, gross: 3.3, gift: 88, measured: false },
  { rating: 1000, best: 40, small: 18, mistake: 8.5, gross: 2.5, gift: 91, measured: false },
  { rating: 1200, best: 43, small: 16, mistake: 7, gross: 1.8, gift: 94, measured: false },
  { rating: 1500, best: 48, small: 13, mistake: 5, gross: 1.2, gift: 97, measured: false },
  { rating: 2000, best: 56, small: 9, mistake: 3, gross: 0.5, gift: 99, measured: false },
  { rating: 2500, best: 65, small: 6, mistake: 1.5, gross: 0.2, gift: 100, measured: false },
]

export const MIN_RATING = PROFILES[0].rating
export const MAX_RATING = PROFILES[PROFILES.length - 1].rating
export const MEASURED_RANGE = [300, 799] as const

export function isMeasured(rating: number) {
  return rating >= MEASURED_RANGE[0] && rating <= MEASURED_RANGE[1]
}

export function profileFor(rating: number): Profile {
  const r = Math.max(MIN_RATING, Math.min(MAX_RATING, rating))
  const hi = PROFILES.findIndex((p) => p.rating >= r)
  if (PROFILES[hi].rating === r || hi === 0) return { ...PROFILES[hi], rating: r }
  const a = PROFILES[hi - 1], b = PROFILES[hi], t = (r - a.rating) / (b.rating - a.rating)
  const mix = (k: 'best' | 'small' | 'mistake' | 'gross' | 'gift') => a[k] + (b[k] - a[k]) * t
  return { rating: r, best: mix('best'), small: mix('small'), mistake: mix('mistake'), gross: mix('gross'), gift: mix('gift'), measured: isMeasured(r) }
}

// Winning chance in percent from a centipawn score (the usual logistic curve)
export function winChance(s: Score): number {
  const cp = clampScore(s)
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

type Klass = 'best' | 'near' | 'small' | 'mistake' | 'gross'
const ORDER: Klass[] = ['best', 'near', 'small', 'mistake', 'gross']

export function classify(cands: Candidate[]): Record<Klass, Candidate[]> {
  const sorted = [...cands].sort((x, y) => winChance(y.score) - winChance(x.score))
  const top = winChance(sorted[0].score)
  const out: Record<Klass, Candidate[]> = { best: [sorted[0]], near: [], small: [], mistake: [], gross: [] }
  for (const c of sorted.slice(1)) {
    const d = top - winChance(c.score)
    out[d < 3 ? 'near' : d < 10 ? 'small' : d < 30 ? 'mistake' : 'gross'].push(c)
  }
  return out
}

export interface PickInfo {
  uci: string
  klass: Klass | 'gift'
}

// `gift` = the opponent's last move was a gross error that the best move punishes.
export function pickMove(cands: Candidate[], rating: number, gift: boolean, rand: () => number = Math.random): PickInfo {
  if (!cands.length) throw new Error('no moves')
  const p = profileFor(rating)
  const classes = classify(cands)
  if (gift) {
    // Taking happens either on purpose (this branch) or by chance through the normal pick, so
    // the extra chance is scaled to make the total equal the measured rate.
    const extra = Math.max(0, (p.gift - p.best) / (100 - p.best))
    if (rand() < extra) return { uci: classes.best[0].uci, klass: 'gift' }
  }
  const weights: Record<Klass, number> = { best: p.best, near: 100 - p.best - p.small - p.mistake - p.gross, small: p.small, mistake: p.mistake, gross: p.gross }
  let roll = rand() * 100
  let klass: Klass = 'best'
  for (const k of ORDER) {
    roll -= weights[k]
    if (roll < 0) {
      klass = k
      break
    }
  }
  // An empty class falls back to the next better one that has moves
  let i = ORDER.indexOf(klass)
  while (!classes[ORDER[i]].length) i--
  klass = ORDER[i]
  const pool = classes[klass]
  // Human gross errors are usually "just" one piece, not absurd sacrifices: pick among the least bad
  const choice = klass === 'gross' ? pool.slice(0, 3) : pool
  return { uci: choice[Math.floor(rand() * choice.length)].uci, klass }
}

// Elo update for the player after a game against the bot (score 1 win, 0.5 draw, 0 loss).
// Faster at the start so the rating finds its level quickly.
export function updateRating(player: number, bot: number, score: number, gamesPlayed: number): number {
  const k = gamesPlayed < 10 ? 48 : 32
  const expected = 1 / (1 + 10 ** ((bot - player) / 400))
  return Math.round(Math.max(MIN_RATING, Math.min(MAX_RATING, player + k * (score - expected))))
}
