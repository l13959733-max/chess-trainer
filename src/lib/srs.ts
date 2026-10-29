// SM-2 (SuperMemo 2) per line.
export interface SrsState {
  lineId: string
  ef: number
  interval: number
  reps: number
  due: number
  lastReviewed: number
  lastMistakes: number
}

const DAY = 24 * 60 * 60 * 1000

export function newState(lineId: string): SrsState {
  return { lineId, ef: 2.5, interval: 0, reps: 0, due: 0, lastReviewed: 0, lastMistakes: 0 }
}

// Drill mistakes → SM-2 quality (0–5). Flawless = 5, one mistake = 3, more = 1 (line is relearned).
export function qualityFromMistakes(mistakes: number): number {
  if (mistakes === 0) return 5
  if (mistakes === 1) return 3
  return 1
}

export function review(prev: SrsState, quality: number, now: number, mistakes = 0): SrsState {
  let { ef, interval, reps } = prev
  if (quality >= 3) {
    interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ef)
    reps += 1
  } else {
    reps = 0
    interval = 1
  }
  ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  return { ...prev, ef, interval, reps, due: now + interval * DAY, lastReviewed: now, lastMistakes: mistakes }
}

export function isDue(state: SrsState | undefined, now: number): boolean {
  return !!state && state.lastReviewed > 0 && state.due <= now
}

export function daysUntil(state: SrsState, now: number): number {
  return Math.max(0, Math.ceil((state.due - now) / DAY))
}

export interface LineResult {
  kind: 'new' | 'perfect' | 'mistakes'
  mistakes: number
  due: boolean
}

// What the learning path shows for a line: never played, last drill flawless, or last drill with mistakes.
export function lineResult(state: SrsState | undefined, now: number): LineResult {
  if (!state || !state.lastReviewed) return { kind: 'new', mistakes: 0, due: false }
  return { kind: state.lastMistakes ? 'mistakes' : 'perfect', mistakes: state.lastMistakes, due: isDue(state, now) }
}
