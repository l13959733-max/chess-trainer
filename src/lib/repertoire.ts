import { parsePgn, type Line } from './pgn'

// Every PGN file in data/ is bundled at build time.
const files = import.meta.glob('/data/*.pgn', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const builtinLines: Line[] = Object.values(files).flatMap((text) => parsePgn(text, 'w', 'builtin').lines)
