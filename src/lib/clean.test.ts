import { expect, it } from 'vitest'
import { cleanGames, isClean, shadowStrikes, shine } from './clean'
import type { GameRecord, Puzzle } from './db'

const rec = (uuid: string, endTime: number, blunders: number): GameRecord => ({ uuid, endTime, analyzedAt: 0, plies: 60, blunders })

it('a clean game is an analysed game without a big mistake', () => {
  const r = [rec('a', 100, 0), rec('b', 200, 2), rec('x:c', 300, 0)]
  expect(cleanGames(r).map((g) => g.uuid)).toEqual(['x:c', 'a'])
  expect(cleanGames(r, 150_000).map((g) => g.uuid)).toEqual(['x:c'])
  expect(isClean(r, 'c')).toBe(true)
  expect(isClean(r, 'b')).toBe(false)
  expect(isClean(r, 'zzz')).toBeNull()
})

it('the map gets brighter up to 20 clean games', () => {
  expect(shine(0)).toBe(0)
  expect(shine(10)).toBe(0.5)
  expect(shine(40)).toBe(1)
})

it('counts games where a threat was missed, only with enough games', () => {
  const r = Array.from({ length: 12 }, (_, i) => rec('g' + i, i, i % 3 ? 1 : 0))
  const p = (gameUuid: string, category: Puzzle['category']) => ({ gameUuid, category }) as Puzzle
  // newest ten games: g2 … g11; g11 and g5 had a threat missed, g4 only a missed chance, g0 is too old
  const out = shadowStrikes(r, [p('g11', 'ignored-threat'), p('g5', 'hung-piece'), p('g4', 'free-piece'), p('g0', 'hung-piece')])
  expect(out).toEqual({ games: 10, struck: 2 })
  expect(shadowStrikes(r.slice(0, 4), [])).toBeNull()
})
