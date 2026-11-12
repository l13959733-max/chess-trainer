import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { parsePgn } from './pgn'
import { lineName, nameAt, shortName } from './lineNames'

const lines = readdirSync('data')
  .filter((f) => f.endsWith('.pgn'))
  .flatMap((f) => parsePgn(readFileSync('data/' + f, 'utf8'), 'w', 'builtin').lines)

describe('real opening names', () => {
  it('every built-in line has a name from the Lichess table', () => {
    const missing = lines.filter((l) => !lineName(l)).map((l) => l.title)
    expect(missing).toEqual([])
  })
  it('the Open Catalan is named, and the name grows with the moves', () => {
    const l = lines.find((x) => x.title === 'Catalan: Open 4...dxc4')!
    expect(lineName(l)).toBe('Catalan Opening: Open Defense')
    expect(shortName(l, 'Catalan')).toBe('Open Defense')
    expect(nameAt(l, 0)).toBeNull()
    expect(nameAt(l, l.moves.length)).toContain('Catalan Opening')
  })
})
