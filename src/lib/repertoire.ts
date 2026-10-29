import { parsePgn, type Line } from './pgn'

// Alle PGN-Dateien aus data/ werden beim Build eingebunden.
const files = import.meta.glob('/data/*.pgn', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const builtinLines: Line[] = Object.values(files).flatMap((text) => parsePgn(text, 'w', 'builtin').lines)
