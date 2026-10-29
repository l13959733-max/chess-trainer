// Turns SAN into words a voice can read: "Nxf7+" → "Knight takes f7, check".
const PIECES: Record<string, string> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }

function suffix(mark: string | undefined): string {
  return mark === '+' ? ', check' : mark === '#' ? ', checkmate' : ''
}

export function sanToSpeech(san: string): string {
  const castle = san.match(/^O-O(-O)?([+#])?$/)
  if (castle) return (castle[1] ? 'Castles queenside' : 'Castles kingside') + suffix(castle[2])

  const m = san.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?([+#])?$/)
  if (!m) return san
  const [, piece, fromFile, fromRank, capture, to, promo, mark] = m
  const from = (fromFile ?? '') + (fromRank ?? '')

  let words: string
  if (piece) {
    words = PIECES[piece] + (from ? ` from ${from}` : '') + (capture ? ' takes ' : ' to ') + to
  } else {
    words = capture ? `${fromFile} takes ${to}` : to
  }
  if (promo) words += `, promotes to a ${PIECES[promo]}`
  return words + suffix(mark)
}

// Every sentence the app may read for a set of lines: each explanation, and the correction
// ("The right move is …") for each of the player's own moves in a drill.
export function voiceTexts(lines: { side: 'w' | 'b'; moves: { san: string; color: 'w' | 'b'; comment?: string }[] }[]): string[] {
  const out = new Set<string>()
  for (const line of lines) {
    for (const m of line.moves) {
      if (m.comment) out.add(explanationText(m.san, m.comment))
      if (m.color === line.side) out.add(explanationText(m.san, m.comment, 'The right move is'))
    }
  }
  return [...out]
}

// The sentence read aloud for a move and its explanation.
export function explanationText(san: string, comment: string | undefined, prefix = ''): string {
  const move = sanToSpeech(san)
  const head = prefix ? `${prefix} ${move[0].toLowerCase()}${move.slice(1)}` : move
  return comment ? `${head}. ${comment}` : `${head}.`
}
