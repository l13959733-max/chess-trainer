import { Chess } from 'chess.js'

export type Side = 'w' | 'b'

export interface LineArrow {
  from: string
  to: string
  color: 'G' | 'R' | 'Y' | 'B'
}

export interface LineMove {
  san: string
  from: string
  to: string
  promotion?: string
  color: Side
  fenBefore: string
  fenAfter: string
  comment?: string
  arrows: LineArrow[]
}

export interface Line {
  id: string
  title: string
  side: Side
  moves: LineMove[]
  source: 'builtin' | 'import'
  importId?: number
  opening?: string // [Opening "…"] header: the chapter on the overview
}

export interface ParseResult {
  lines: Line[]
  errors: string[]
}

// Short stable hash so a line keeps its ID across reloads (spaced repetition is keyed on it).
function hash(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// Reads [%cal Ge2e4,Rd1h5] from a comment and returns the text and arrows separately.
export function parseComment(raw: string): { text: string; arrows: LineArrow[] } {
  const arrows: LineArrow[] = []
  const text = raw
    .replace(/\[%cal\s+([^\]]*)\]/g, (_, list: string) => {
      for (const item of list.split(',')) {
        const m = item.trim().match(/^([GRYB])([a-h][1-8])([a-h][1-8])$/)
        if (m) arrows.push({ color: m[1] as LineArrow['color'], from: m[2], to: m[3] })
      }
      return ''
    })
    .replace(/\[%[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { text, arrows }
}

// Splits a PGN file with several games into one text per game.
export function splitGames(pgn: string): string[] {
  const text = pgn.replace(/\r\n?/g, '\n').trim()
  if (!text) return []
  const parts = text.split(/\n\s*\n(?=\[Event )/)
  return parts.map((p) => p.trim()).filter(Boolean)
}

export function parseGame(pgn: string, fallbackSide: Side, source: Line['source']): Line {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const headers = chess.getHeaders()
  const comments = new Map(chess.getComments().map((c) => [c.fen, c.comment]))
  const history = chess.history({ verbose: true })
  if (history.length === 0) throw new Error('contains no moves')

  const side: Side = headers.Side === 'Black' ? 'b' : headers.Side === 'White' ? 'w' : fallbackSide
  const title = headers.Event && headers.Event !== '?' ? headers.Event : history.slice(0, 6).map((m) => m.san).join(' ')

  const moves: LineMove[] = history.map((m) => {
    const raw = comments.get(m.after)
    const parsed = raw ? parseComment(raw) : { text: '', arrows: [] }
    return {
      san: m.san,
      from: m.from,
      to: m.to,
      promotion: m.promotion,
      color: m.color,
      fenBefore: m.before,
      fenAfter: m.after,
      comment: parsed.text || undefined,
      arrows: parsed.arrows,
    }
  })

  const opening = headers.Opening && headers.Opening !== '?' ? headers.Opening : undefined
  return { id: hash(side + title + moves.map((m) => m.san).join(' ')), title, side, moves, source, opening }
}

export function parsePgn(pgn: string, fallbackSide: Side = 'w', source: Line['source'] = 'import'): ParseResult {
  const lines: Line[] = []
  const errors: string[] = []
  splitGames(pgn).forEach((game, i) => {
    const name = game.match(/\[Event "([^"]*)"\]/)?.[1] || `Game ${i + 1}`
    try {
      lines.push(parseGame(game, fallbackSide, source))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${name}: ${msg.replace(/^Invalid move in PGN: (\S+)$/, 'illegal move $1')}`)
    }
  })
  return { lines, errors }
}
