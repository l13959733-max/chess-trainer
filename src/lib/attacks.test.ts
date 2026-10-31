import { expect, it } from 'vitest'
import { THEMES } from './attacks'
import { builtinLines } from './repertoire'

it('every line named in Attacks & Traps exists', () => {
  const titles = new Set(builtinLines.map((l) => l.title))
  const missing = THEMES.flatMap((t) => [...t.attack, ...t.defense]).filter((x) => !titles.has(x))
  expect(missing).toEqual([])
})
