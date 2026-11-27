import { describe, expect, it } from 'vitest'
import { buildGames, clockBucket, openingFamily, sessions, stats, windows, type PGame } from './progressStats'
import type { ChessComGame } from './chesscom'
import type { GameRecord, Puzzle } from './db'

const pgn = (eco: string, clk: string[]) =>
  `[Event "Live Chess"]\n[TimeControl "600"]\n[ECOUrl "https://www.chess.com/openings/${eco}"]\n\n` +
  clk.map((c, i) => `${i % 2 ? '' : `${i / 2 + 1}. `}e4 {[%clk ${c}]}`).join(' ')

function game(uuid: string, end: number, white: string, result: 'win' | 'resigned' | 'agreed' | 'timeout', eco = 'Scandinavian-Defense-Mieses-Kotrc-Main-Line'): ChessComGame {
  const lu = { username: 'l0o2', rating: 650, result }
  const other = { username: 'x', rating: 700, result: result === 'win' ? 'resigned' : result === 'agreed' ? 'agreed' : 'win' }
  return {
    uuid, url: 'u', end_time: end, time_class: 'rapid', rules: 'chess', rated: true,
    pgn: pgn(eco, ['0:09:50', '0:09:40', '0:07:00', '0:06:00', '0:02:00', '0:01:00', '0:00:30', '0:00:20']),
    white: white === 'l0o2' ? lu : other, black: white === 'l0o2' ? other : lu,
  }
}

describe('opening family', () => {
  it('keeps the family and Accepted/Declined', () => {
    expect(openingFamily(pgn('Scandinavian-Defense-Mieses-Kotrc-Main-Line', []))).toBe('Scandinavian Defense')
    expect(openingFamily(pgn('Queens-Gambit-Declined-Exchange', []))).toBe('Queen’s Gambit Declined')
    expect(openingFamily(pgn('Vienna-Game', []))).toBe('Vienna Game')
    expect(openingFamily('no header')).toBe('Unknown')
  })
})

describe('clock buckets', () => {
  it('splits the time left into five steps', () => {
    expect([590, 400, 200, 100, 30].map((s) => clockBucket(s, 600))).toEqual([0, 1, 2, 3, 4])
  })
})

describe('buildGames', () => {
  const games = [game('a', 1000, 'l0o2', 'win'), game('b', 2000, 'x', 'resigned'), { ...game('c', 3000, 'l0o2', 'win'), time_class: 'blitz' }]
  const records: GameRecord[] = [{ uuid: 'a', endTime: 1000, analyzedAt: 1, plies: 8, blunders: 1 }]
  const puzzles = [
    { gameUuid: 'a', ply: 4, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', category: 'hung-piece', player: 'l0o2' },
    { gameUuid: 'b', ply: 3, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', category: 'tactic' }, // game b is not checked
  ] as unknown as Puzzle[]
  const G = buildGames(games, 'l0o2', records, puzzles)

  it('takes only rapid games, oldest first, with colour and result', () => {
    expect(G.map((g) => [g.color, g.result])).toEqual([['w', 'w'], ['b', 'l']])
  })
  it('counts my moves per clock step and keeps mistakes only from checked games', () => {
    expect(G[0].moves).toBe(4)
    expect(G[0].clockMoves).toEqual([1, 1, 0, 1, 1]) // 9:50, 7:00 (70 %), 2:00, 0:30 of 10 minutes
    expect(G[0].mistakes).toEqual([{ move: 3, kind: 'h', phase: 'o', clock: 3 }])
    expect(G[0].safe).toBe(75) // 1 big mistake in 4 moves
    expect(G[1].analysed).toBe(false)
    expect(G[1].mistakes).toEqual([])
  })
  it('stats count mistakes per checked game, results over all games', () => {
    const s = stats(G)
    expect(s.n).toBe(2)
    expect(s.checked).toBe(1)
    expect(s.win).toBe(0.5)
    expect(s.perGame).toBe(1)
    expect(s.kind(['h'])).toBe(1)
    expect(s.trouble).toBe(1)
  })
})

describe('windows and sessions', () => {
  const day = 86400
  const G = Array.from({ length: 10 }, (_, i) => ({ t: i * 10 * day } as PGame))
  it('compares the last 4 weeks with the 4 weeks before', () => {
    const w = windows(G, '4w')
    expect(w.now.map((g) => g.t / day)).toEqual([70, 80, 90])
    expect(w.before.map((g) => g.t / day)).toEqual([40, 50, 60])
  })
  it('games less than an hour apart are one session', () => {
    expect(sessions([{ t: 0 }, { t: 1800 }, { t: 9000 }] as PGame[]).map((s) => s.length)).toEqual([2, 1])
  })
})
