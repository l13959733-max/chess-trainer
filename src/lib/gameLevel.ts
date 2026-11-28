// How good was one game – for a player of your level? (Lu, 28.11.2026: "mein letztes Game per Elo geratet")
// Measured first, then decided: in Lu's 1,393 chess.com rapid games (both players, 2,268 games with at least 15 moves,
// our Stockfish depth 14, Lichess accuracy) accuracy rises with rating on average (≈63 % at 400, ≈74 % at 700), but
// ONE game says almost nothing about the rating (correlation 0.16; games of any accuracy came from players rated
// 620–650 on average). So no "Elo of this game" – instead: how many games of players around your rating had a lower
// accuracy. LEVELS[bin] = accuracy at 5 %, 10 %, … 95 % of all games of players rated bin−100 … bin+199.
export const LEVELS: Record<string, number[]> = {"300": [32.5, 36.1, 37.8, 44.7, 47.8, 52.2, 55.2, 57.1, 59.8, 62.2, 63.9, 66.8, 69.4, 71.9, 75.2, 77.2, 79.3, 81.3, 88.8], "400": [34.2, 38.1, 42.2, 48.1, 52.4, 55.6, 58.5, 61.2, 63.5, 65.5, 67.5, 69.7, 72.5, 74.3, 76.4, 78.5, 80.7, 84.0, 89.7], "500": [36.0, 40.5, 47.9, 53.0, 56.7, 59.8, 62.3, 64.9, 66.8, 68.9, 71.0, 73.3, 74.9, 76.5, 78.4, 79.9, 82.7, 85.9, 89.8], "600": [36.8, 42.3, 49.6, 54.6, 58.4, 61.2, 63.8, 66.1, 67.9, 70.2, 72.3, 74.0, 75.7, 77.5, 79.2, 80.9, 83.5, 86.5, 90.5], "700": [36.8, 43.3, 50.4, 55.7, 59.2, 61.8, 64.2, 66.5, 68.8, 70.7, 72.8, 74.4, 76.2, 77.9, 79.4, 81.3, 84.0, 86.8, 90.6], "800": [39.1, 48.4, 56.2, 59.8, 62.3, 65.6, 68.0, 70.7, 72.7, 73.6, 75.6, 78.0, 79.2, 80.8, 81.7, 84.7, 86.4, 89.2, 91.6]}
export const LEVEL_SOURCE = '2,268 chess.com rapid games of players rated 271–938 (Lu’s games, both sides)'

export function levelOf(acc: number, rating: number): { better: number; from: number; to: number; label: 'strong' | 'normal' | 'weak' } | null {
  const bins = Object.keys(LEVELS).map(Number).sort((a, b) => a - b)
  if (!bins.length) return null
  const bin = bins.reduce((b, x) => (Math.abs(x + 50 - rating) < Math.abs(b + 50 - rating) ? x : b), bins[0])
  const q = LEVELS[String(bin)]
  // share of games with a lower accuracy, between the 5 % steps
  let better = 0
  if (acc >= q[q.length - 1]) better = 97
  else if (acc > q[0]) {
    const i = q.findIndex((x) => x >= acc)
    better = 5 * i + (5 * (acc - q[i - 1])) / (q[i] - q[i - 1])
  } else better = 3
  const b = Math.round(better)
  return { better: b, from: bin - 100, to: bin + 199, label: b >= 75 ? 'strong' : b < 25 ? 'weak' : 'normal' }
}
