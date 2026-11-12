// Now and then a scout of the Shadow Realm blocks the road (not more than every 15 minutes)
const AMBUSH_KEY = 'chess-trainer-ambush'
export function lastAmbush(): number {
  try {
    return Number(localStorage.getItem(AMBUSH_KEY) ?? 0)
  } catch {
    return 0
  }
}
export function markAmbush() {
  try {
    localStorage.setItem(AMBUSH_KEY, String(Date.now()))
  } catch {
    // not remembered: the next ride can be ambushed again
  }
}

// What you can be asked: only what the stations you beat have taught
export function canBeAmbushed(beaten: string[]): boolean {
  return beaten.filter((id) => ['kannauj', 'samarkand', 'rome', 'baghdad'].includes(id)).length >= 2
}

export function roadAmbush(beaten: string[]): boolean {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce || !canBeAmbushed(beaten) || Math.random() >= 0.35 || Date.now() - lastAmbush() <= 15 * 60 * 1000) return false
  markAmbush()
  return true
}
