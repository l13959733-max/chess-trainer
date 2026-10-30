import { Chess } from 'chess.js'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Every line in data/*.pgn must be legal, otherwise Lu learns wrong moves.
const dataDir = join(__dirname, '../../data')

for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.pgn'))) {
  const games = readFileSync(join(dataDir, file), 'utf8').split(/\n(?=\[Event )/).filter((g) => g.trim())

  describe(file, () => {
    it('contains lines', () => {
      expect(games.length).toBeGreaterThan(0)
    })

    for (const pgn of games) {
      const title = pgn.match(/\[Event "([^"]+)"\]/)?.[1] ?? '?'
      it(`${title}: all moves legal, Side header set`, () => {
        const chess = new Chess()
        expect(() => chess.loadPgn(pgn)).not.toThrow()
        expect(chess.history().length).toBeGreaterThan(0)
        expect(pgn).toMatch(/\[Side "(White|Black)"\]/)
      })
    }
  })
}

it("Légal's Mate really ends in checkmate", () => {
  const pgn = readFileSync(join(dataDir, 'repertoire_italian.pgn'), 'utf8').split(/\n(?=\[Event )/).find((g) => g.includes('Légal'))!
  const chess = new Chess()
  chess.loadPgn(pgn)
  expect(chess.isCheckmate()).toBe(true)
})

it('the Caro-Kann smothered mate trap really ends in checkmate', () => {
  const pgn = readFileSync(join(dataDir, 'caro_kann.pgn'), 'utf8').split(/\n(?=\[Event )/).find((g) => g.includes('Trap: Smothered'))!
  const chess = new Chess()
  chess.loadPgn(pgn)
  expect(chess.isCheckmate()).toBe(true)
})

it('the Siberian Trap really ends in checkmate', () => {
  const pgn = readFileSync(join(dataDir, 'sicilian.pgn'), 'utf8').split(/\n(?=\[Event )/).find((g) => g.includes('Siberian'))!
  const chess = new Chess()
  chess.loadPgn(pgn)
  expect(chess.isCheckmate()).toBe(true)
})
