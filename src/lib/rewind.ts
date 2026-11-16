// Strict drill (BAUPLAN 35, Lu 16.11.: "wenn man einen Fehler macht, zurückgesetzt ein paar Schritte – man muss
// sich wieder an die Reihenfolge genau erinnern"). After a mistake and the right move, the board goes back so that
// your last REWIND_STEPS own moves (the mistaken one included) have to be played again from memory.
// Not endless: the same spot sends you back at most MAX_RESETS times.

export const REWIND_STEPS = 3
export const MAX_RESETS = 2

// `colors`: who moves at each ply of the line; `side`: you; `ply`: where the mistake was (one of your plies).
// Returns the ply to go back to: the position before your REWIND_STEPS-th last own move, or the start of the line.
export function rewindTo(colors: ('w' | 'b')[], side: 'w' | 'b', ply: number, steps = REWIND_STEPS): number {
  const mine = colors.map((c, i) => (c === side && i <= ply ? i : -1)).filter((i) => i >= 0)
  const k = mine.length - steps
  return k <= 0 ? 0 : mine[k]
}

export const canRewind = (resets: number, max = MAX_RESETS) => resets < max

// the plies on the way back, one after another (for the visible rewind), from the current ply down to the target
export function rewindPath(from: number, to: number): number[] {
  const out: number[] = []
  for (let p = from - 1; p >= to; p--) out.push(p)
  return out
}
