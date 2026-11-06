import type { Line, Side } from './pgn'
import STATS from './opening-stats.json'

// The opening map: all built-in lines of one side merged into one tree of moves,
// so "Black plays X → you play Y" can be read off at every branching point.

export interface TreeNode {
  path: string[] // SAN moves from the start
  lines: Line[] // every line that passes through here
  children: TreeNode[] // most lines first
}

export function buildTree(lines: Line[], side: Side): TreeNode {
  const root: TreeNode = { path: [], lines: [], children: [] }
  for (const line of lines) {
    if (line.source === 'import' || line.side !== side) continue
    let node = root
    node.lines.push(line)
    for (const m of line.moves) {
      let child = node.children.find((c) => c.path[c.path.length - 1] === m.san)
      if (!child) {
        child = { path: [...node.path, m.san], lines: [], children: [] }
        node.children.push(child)
      }
      child.lines.push(line)
      node = child
    }
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => b.lines.length - a.lines.length)
    n.children.forEach(sort)
  }
  sort(root)
  return root
}

// Skip moves everyone plays the same way, down to the next real choice (or the end of the only line)
export function nextChoice(node: TreeNode): { node: TreeNode; skipped: string[] } {
  const skipped: string[] = []
  while (node.children.length === 1 && node.lines.length > 1) {
    node = node.children[0]
    skipped.push(node.path[node.path.length - 1])
  }
  return { node, skipped }
}

// "1.d4", "1...d5", "2.Bf4"
export function moveLabel(path: string[], ply = path.length - 1): string {
  const n = Math.floor(ply / 2) + 1
  return ply % 2 === 0 ? `${n}.${path[ply]}` : `${n}...${path[ply]}`
}

export function movesLabel(path: string[], from: number): string {
  return path
    .slice(from)
    .map((_, i) => {
      const ply = from + i
      return ply % 2 === 0 || i === 0 ? moveLabel(path, ply) : path[ply]
    })
    .join(' ')
}

export function openingsOf(node: TreeNode): string[] {
  return [...new Set(node.lines.map((l) => l.opening).filter((o): o is string => !!o))]
}

// Real game results after these moves (filled in by scripts/fetch-opening-stats.mjs from the Lichess database)
export interface MoveStats {
  white: number
  draws: number
  black: number
}
export const STATS_INFO = (STATS as { info?: string }).info ?? ''

export function statsFor(path: string[]): MoveStats | null {
  const s = (STATS as { positions?: Record<string, MoveStats> }).positions?.[path.join(' ')]
  return s && s.white + s.draws + s.black > 0 ? s : null
}

// Percent won / drawn / lost for the side that learns the line
export function percentFor(s: MoveStats, side: Side): { win: number; draw: number; loss: number; games: number } {
  const games = s.white + s.draws + s.black
  const [w, l] = side === 'w' ? [s.white, s.black] : [s.black, s.white]
  return { win: Math.round((100 * w) / games), draw: Math.round((100 * s.draws) / games), loss: Math.round((100 * l) / games), games }
}
