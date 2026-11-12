import { Chess, type Square } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { LESSONS, fenAfter, lessonOf, when } from './lessons'
import { stationById } from './king'

const FILES = 'abcdefgh'
const onBoard = (sq: string) => /^[a-h][1-8]$/.test(sq)

describe('lessons', () => {
  for (const lesson of Object.values(LESSONS)) {
    describe(lesson.id, () => {
      it('belongs to a real station and lists the lesson as a game', () => {
        const s = stationById(lesson.station)
        expect(s).toBeTruthy()
        expect(s!.games.map((g) => g.id)).toContain(lesson.id)
        expect(lessonOf(lesson.station)?.id).toBe(lesson.id)
      })
      lesson.steps.forEach((st, i) => {
        it(`step ${i + 1} is real chess`, () => {
          const c = new Chess(fenAfter(st.moves))
          for (const [a, b] of [...(st.arrows ?? []), ...(st.ok.arrows ?? [])]) expect(onBoard(a) && onBoard(b)).toBe(true)
          for (const sq of [...(st.focus ?? []), ...(st.ok.good ?? [])]) expect(onBoard(sq)).toBe(true)
          if (st.kind === 'move') {
            expect(c.get(st.piece as Square)?.color).toBe(c.turn())
            const legal = c.moves()
            expect(legal).toContain(st.answer)
            const fromPiece = c.moves({ square: st.piece as Square })
            expect(fromPiece).toContain(st.answer)
            for (const san of Object.keys(st.others ?? {})) expect(legal).toContain(san)
          } else if (st.kind === 'tap') {
            const p = c.get(st.answer as Square)
            expect(p?.color).toBe(st.side)
            if (st.type) expect(p?.type).toBe(st.type)
            for (const sq of Object.keys(st.wrongs ?? {})) expect(c.get(sq as Square)?.color).toBe(st.side)
          } else {
            expect(st.options.filter((o) => o.ok)).toHaveLength(1)
            for (const o of st.options) if (!o.ok) expect(o.why).toBeTruthy()
          }
        })
      })
    })
  }

  it('Catalan: after 4…dxc4 the first piece on the g2–a8 diagonal is the pawn on b7, then the rook on a8', () => {
    const c = new Chess(fenAfter('1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4'))
    const seen: string[] = []
    for (let f = 5, r = 3; f >= 0 && r <= 8; f--, r++) {
      const p = c.get(`${FILES[f]}${r}` as Square)
      if (p) seen.push(`${FILES[f]}${r}${p.color}${p.type}`)
    }
    expect(seen.slice(0, 2)).toEqual(['b7bp', 'a8br'])
  })

  it('Catalan: from f1 the bishop can only go to g2 or h3', () => {
    const c = new Chess(fenAfter('1.d4 Nf6 2.c4 e6 3.g3 d5'))
    expect(c.moves({ square: 'f1' }).sort()).toEqual(['Bg2', 'Bh3'])
  })

  it('Italian: only the knight on f3 attacks e5, and only the king guards f7', () => {
    const c = new Chess(fenAfter('1.e4 e5 2.Nf3 Nc6'))
    expect(c.attackers('e5', 'w')).toEqual(['f3'])
    const start = new Chess()
    expect(start.attackers('f7', 'b')).toEqual(['e8'])
  })

  it('says today / yesterday / days ago', () => {
    const now = new Date(2026, 10, 13, 10).getTime()
    expect(when(now - 3600000, now)).toBe('today')
    expect(when(now - 86400000, now)).toBe('yesterday')
    expect(when(now - 3 * 86400000, now)).toBe('3 days ago')
  })
})
