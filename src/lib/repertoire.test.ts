import { Chess } from 'chess.js'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Jede Linie in data/*.pgn muss legal sein, sonst lernt Lu falsche Züge.
const dataDir = join(__dirname, '../../data')

for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.pgn'))) {
  const games = readFileSync(join(dataDir, file), 'utf8').split(/\n(?=\[Event )/).filter((g) => g.trim())

  describe(file, () => {
    it('enthält Linien', () => {
      expect(games.length).toBeGreaterThan(0)
    })

    for (const pgn of games) {
      const title = pgn.match(/\[Event "([^"]+)"\]/)?.[1] ?? '?'
      it(`${title}: alle Züge legal, Side-Header gesetzt`, () => {
        const chess = new Chess()
        expect(() => chess.loadPgn(pgn)).not.toThrow()
        expect(chess.history().length).toBeGreaterThan(0)
        expect(pgn).toMatch(/\[Side "(White|Black)"\]/)
      })
    }
  })
}

it('Seekadettenmatt endet wirklich mit Matt', () => {
  const pgn = readFileSync(join(dataDir, 'repertoire_italienisch.pgn'), 'utf8').split(/\n(?=\[Event )/).find((g) => g.includes('Légal'))!
  const chess = new Chess()
  chess.loadPgn(pgn)
  expect(chess.isCheckmate()).toBe(true)
})
