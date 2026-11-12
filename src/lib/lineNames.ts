import LINE_NAMES from './line-names.json'
import POSITION_NAMES from './position-names.json'
import type { Line } from './pgn'

// Real opening names from the open Lichess opening table (CC0), made by scripts/name-lines.mjs.
// Run the script again after adding lines.
const LINES = LINE_NAMES as Record<string, string>
const POSITIONS = POSITION_NAMES as Record<string, string>
const epd = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

// the full name of a whole line, e.g. "Catalan Opening: Open Defense, Classical Line"
export const lineName = (l: Pick<Line, 'side' | 'title'>): string | null => LINES[l.side + '|' + l.title] ?? null

// the name without its family when the family is already shown (e.g. under the heading "Catalan")
export function shortName(l: Pick<Line, 'side' | 'title'>, family?: string): string | null {
  const full = lineName(l)
  if (!full) return null
  const [fam, rest] = full.split(': ')
  return rest && family && fam.startsWith(family.split(' ')[0]) ? rest : full
}

// the name of the position on the board: the last named position up to this move of the line
export function nameAt(line: Line, ply: number): string | null {
  let name: string | null = null
  for (let i = 0; i < Math.min(ply, line.moves.length); i++) name = POSITIONS[epd(line.moves[i].fenAfter)] ?? name
  return name
}
