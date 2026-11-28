// How strong was one game? (Lu, 28.11.2026: "mein letztes Game per Elo geratet")
// There is no published formula from accuracy to Elo (chess.com's "game rating" is secret, forum formulas are not
// tested). So this is OUR OWN measurement: in Lu's chess.com rapid games, both players' accuracy (Lichess formula,
// our Stockfish, depth 14) next to their real rating. CURVE = the typical rating of players who played a game with
// that accuracy; SPREAD = how much it varies (middle half of the games). Only valid inside RANGE – outside it the
// page says so instead of guessing. Filled by the calibration run (see the commit that sets the numbers).
export const CURVE: [number, number][] = [] // [accuracy %, rating]
export const SPREAD = 0
export const RANGE: [number, number] = [0, 0]
export const SOURCE = ''

export function estimateElo(acc: number): { elo: number; low: number; high: number; note: string } | null {
  if (CURVE.length < 2) return null
  const pts = CURVE
  let elo: number
  if (acc <= pts[0][0]) elo = pts[0][1]
  else if (acc >= pts[pts.length - 1][0]) elo = pts[pts.length - 1][1]
  else {
    const i = pts.findIndex((p) => p[0] >= acc)
    const [a0, e0] = pts[i - 1], [a1, e1] = pts[i]
    elo = e0 + ((acc - a0) / (a1 - a0)) * (e1 - e0)
  }
  const r = Math.round(elo / 10) * 10
  const clipped = r <= RANGE[0] || r >= RANGE[1]
  return {
    elo: r,
    low: Math.round((r - SPREAD) / 10) * 10,
    high: Math.round((r + SPREAD) / 10) * 10,
    note: `Estimate from ${SOURCE}. One game says little – the range shows how much games of the same accuracy vary.${clipped ? ` Outside ${RANGE[0]}–${RANGE[1]} we have no data, so the number stops at the edge.` : ''}`,
  }
}
