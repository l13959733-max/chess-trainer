// SM-2 (SuperMemo 2) pro Linie.
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

// Fehler im Drill → SM-2-Qualität (0–5). Fehlerfrei = 5, ein Fehler = 3, mehr = 1 (Linie wird neu gelernt).
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
