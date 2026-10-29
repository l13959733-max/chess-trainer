import { describe, expect, it } from 'vitest'
import { parseComment, parsePgn, splitGames, toGerman } from './pgn'

const TWO = `[Event "Eins"]
[Side "White"]

1. e4 {Zentrum. [%cal Gd2d4,Rf1c4]} e5 2. Nf3 *

[Event "Zwei"]
[Side "Black"]

1. d4 d5 {Gegenzentrum.} 2. c4 e6 *`

describe('splitGames', () => {
  it('trennt mehrere Partien', () => {
    expect(splitGames(TWO)).toHaveLength(2)
  })
  it('leere Eingabe ergibt keine Partien', () => {
    expect(splitGames('  \n ')).toEqual([])
  })
  it('kommt mit Windows-Zeilenenden klar', () => {
    expect(splitGames(TWO.replace(/\n/g, '\r\n'))).toHaveLength(2)
  })
})

describe('parsePgn', () => {
  const { lines, errors } = parsePgn(TWO)

  it('liest Titel und Seite', () => {
    expect(errors).toEqual([])
    expect(lines.map((l) => [l.title, l.side])).toEqual([['Eins', 'w'], ['Zwei', 'b']])
  })

  it('ordnet Kommentare dem richtigen Zug zu', () => {
    expect(lines[0].moves[0].comment).toBe('Zentrum.')
    expect(lines[0].moves[1].comment).toBeUndefined()
    expect(lines[1].moves[1]).toMatchObject({ san: 'd5', color: 'b', comment: 'Gegenzentrum.' })
  })

  it('liest Pfeile aus [%cal]', () => {
    expect(lines[0].moves[0].arrows).toEqual([
      { color: 'G', from: 'd2', to: 'd4' },
      { color: 'R', from: 'f1', to: 'c4' },
    ])
  })

  it('speichert Stellung vor und nach jedem Zug', () => {
    const m = lines[0].moves[0]
    expect(m.fenBefore.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP')).toBe(true)
    expect(m.fenAfter.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP')).toBe(true)
    expect(lines[0].moves[1].fenBefore).toBe(m.fenAfter)
  })

  it('IDs sind stabil und eindeutig', () => {
    expect(parsePgn(TWO).lines.map((l) => l.id)).toEqual(lines.map((l) => l.id))
    expect(lines[0].id).not.toBe(lines[1].id)
  })

  it('meldet illegale Züge als Fehler, ohne andere Linien zu verlieren', () => {
    const r = parsePgn(TWO + '\n\n[Event "Kaputt"]\n\n1. e4 e5 2. Ke3 *')
    expect(r.lines).toHaveLength(2)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toBe('Kaputt: ungültiger Zug Ke3')
  })

  it('ohne Side-Header gilt die gewählte Seite', () => {
    expect(parsePgn('1. e4 c6 2. d4 d5 *', 'b').lines[0].side).toBe('b')
  })

  it('ohne Event-Header wird der Titel aus den Zügen gebildet', () => {
    expect(parsePgn('1. e4 c6 2. d4 d5 *').lines[0].title).toBe('e4 c6 d4 d5')
  })
})

describe('parseComment', () => {
  it('entfernt andere Annotationen wie [%clk]', () => {
    expect(parseComment('Gut. [%clk 0:05:00]')).toEqual({ text: 'Gut.', arrows: [] })
  })
})

describe('toGerman', () => {
  it.each([
    ['Nf3', 'Sf3'], ['Bxf7+', 'Lxf7+'], ['Qb3', 'Db3'], ['Rfe1', 'Tfe1'], ['Kxf7', 'Kxf7'],
    ['e8=Q#', 'e8=D#'], ['O-O', 'O-O'], ['exd5', 'exd5'], ['b4', 'b4'],
  ])('%s → %s', (en, de) => {
    expect(toGerman(en)).toBe(de)
  })
})
