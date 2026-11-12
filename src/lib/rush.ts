// Square Rush (Lu, 12.11.): Hoppy calls a square, you move the piece there. Pure rules, tested in rush.test.ts.

export type RushPiece = 'N' | 'B' | 'R' | 'Q' | 'K' | 'P'
export const RUSH_ORDER: RushPiece[] = ['N', 'B', 'R', 'Q', 'K', 'P']
export const RUSH_NAMES: Record<RushPiece, string> = { N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King', P: 'Pawn' }
export const RUSH_SECONDS = 60
export const COMBO = 3 // three right in a row explode
export const COMBO_BONUS = 50
export const COMBO_TIME = 2000 // ms added for every explosion
export const MOVES_PER_PIECE = 5
export const PAWN_MOVES = 3

const FILES = 'abcdefgh'
export const sqName = (f: number, r: number) => FILES[f] + (r + 1)
export const sqCoords = (sq: string): [number, number] => [FILES.indexOf(sq[0]), +sq[1] - 1]

// every square the piece can reach on an empty board (a pawn only walks forward, two steps from its start)
export function rushMoves(p: RushPiece, f: number, r: number, black = false): string[] {
  const out: string[] = []
  const add = (df: number, dr: number, slide: boolean) => {
    let x = f + df
    let y = r + dr
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
      out.push(sqName(x, y))
      if (!slide) break
      x += df
      y += dr
    }
  }
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
  const line = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  if (p === 'N') for (const [a, b] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) add(a, b, false)
  if (p === 'B') for (const [a, b] of diag) add(a, b, true)
  if (p === 'R') for (const [a, b] of line) add(a, b, true)
  if (p === 'Q') for (const [a, b] of [...diag, ...line]) add(a, b, true)
  if (p === 'K') for (const [a, b] of [...diag, ...line]) add(a, b, false)
  if (p === 'P') {
    const dir = black ? -1 : 1
    add(0, dir, false)
    if (r === (black ? 6 : 1)) out.push(sqName(f, r + 2 * dir))
  }
  return out
}

// points for a right square: the longer the streak, the more
export const pointsFor = (streak: number) => 10 * streak
export const starsFor = (score: number) => (score >= 900 ? 3 : score >= 450 ? 2 : score >= 150 ? 1 : 0)
export const praise = (streak: number) => (streak >= 9 ? 'Brilliant!!' : streak >= 6 ? 'Excellent!' : 'Great!')
