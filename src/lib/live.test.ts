import { describe, expect, it } from 'vitest'
import { isNewer, isNewerDrill, isOver, isPlayingNow, newRoomCode, normalizeCode, roomTopic, seal, unseal, withHelp, type LiveDrill, type LiveGame, type LiveState } from './live'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const game = (moves: string[] = [], extra: Partial<LiveGame> = {}): LiveGame => ({ id: 'g1', title: 'T', startFen: START, moves, me: 'w', botRating: 600, rated: true, ...extra })
const state = (extra: Partial<LiveState> = {}): LiveState => ({ owner: 'a', ownerName: 'A', driver: 'a', driverName: 'A', rev: 1, ts: 1000, game: game(), ...extra })

describe('invite codes', () => {
  it('are accepted however they were pasted', () => {
    const code = newRoomCode()
    expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/)
    expect(normalizeCode(code)).toBe(code)
    expect(normalizeCode(` ${code.toLowerCase().replaceAll('-', ' ')}\n`)).toBe(code)
  })
  it('reject anything else', () => {
    expect(normalizeCode('')).toBeNull()
    expect(normalizeCode('ABCD-EFGH')).toBeNull()
    expect(normalizeCode('ABCD-EFGH-JKLM-NPQ0')).toBeNull() // 0 is not in the alphabet
  })
})

describe('encryption', () => {
  it('only the same code opens a message', async () => {
    const a = newRoomCode()
    const sealed = await seal(a, state())
    expect(await unseal(a, sealed)).toEqual(state())
    expect(await unseal(newRoomCode(), sealed)).toBeNull()
  })
  it('a changed message is refused', async () => {
    const a = newRoomCode()
    const sealed = await seal(a, state())
    sealed[20] ^= 1
    expect(await unseal(a, sealed)).toBeNull()
  })
  it('the topic does not contain the code', async () => {
    const a = newRoomCode()
    expect(await roomTopic(a)).toBe(await roomTopic(a))
    expect(await roomTopic(a)).not.toContain(a)
    expect(await roomTopic(a)).not.toBe(await roomTopic(newRoomCode()))
  })
})

describe('which state wins', () => {
  it('takes the higher revision, never an old one', () => {
    expect(isNewer(undefined, state())).toBe(true)
    expect(isNewer(state({ rev: 1 }), state({ rev: 2, ts: 1 }))).toBe(true)
    expect(isNewer(state({ rev: 2 }), state({ rev: 1, ts: 9999 }))).toBe(false)
  })
  it('both devices agree when they act at the same moment', () => {
    const x = state({ rev: 5, driver: 'x' })
    const y = state({ rev: 5, driver: 'y' })
    expect(isNewer(x, y)).not.toBe(isNewer(y, x))
  })
  it('the same message from the second broker changes nothing', () => {
    expect(isNewer(state(), state())).toBe(false)
  })
  it('a sign of life counts, a new game goes by time', () => {
    expect(isNewer(state({ ts: 1000 }), state({ ts: 2000 }))).toBe(true)
    expect(isNewer(state({ ts: 2000 }), state({ rev: 1, ts: 3000, game: game([], { id: 'g2' }) }))).toBe(true)
    expect(isNewer(state({ ts: 2000, rev: 9 }), state({ rev: 1, ts: 1000, game: game([], { id: 'g2' }) }))).toBe(false)
  })
})

describe('playing for someone', () => {
  it('marks the new plies and ends the rating', () => {
    const before = game(['e2e4', 'e7e5'])
    const after = withHelp(before, game(['e2e4', 'e7e5', 'g1f3', 'b8c6']))
    expect(after.helped).toEqual([2, 3])
    expect(after.rated).toBe(false)
  })
  it('forgets plies that were taken back', () => {
    const before = game(['e2e4', 'e7e5', 'g1f3', 'b8c6'], { helped: [2, 3] })
    expect(withHelp(before, game(['e2e4', 'e7e5'])).helped).toEqual([])
  })
})

describe('game status', () => {
  it('sees the end of a game', () => {
    expect(isOver(game(['f2f3', 'e7e5', 'g2g4', 'd8h4']))).toBe(true)
    expect(isOver(game(['e2e4']))).toBe(false)
    expect(isOver(game(['e2e4'], { resigned: true }))).toBe(true)
  })
  it('someone silent for over a minute has left', () => {
    expect(isPlayingNow(state({ ts: 1000 }), 1000 + 60_000)).toBe(true)
    expect(isPlayingNow(state({ ts: 1000 }), 1000 + 120_000)).toBe(false)
  })
})

describe('drills', () => {
  const drill = (extra: Partial<LiveDrill> = {}): LiveDrill => ({ owner: 'a', ownerName: 'A', rev: 1, ts: 1000, title: 'Italian', side: 'w', fen: START, ply: 0, total: 10, mistakes: 0, done: false, ...extra })
  it('travel encrypted like games', async () => {
    const code = newRoomCode()
    expect(await unseal<LiveDrill>(code, await seal(code, drill()))).toEqual(drill())
  })
  it('the latest from the owner wins, also within the same millisecond', () => {
    expect(isNewerDrill(undefined, drill())).toBe(true)
    expect(isNewerDrill(drill({ ts: 2000 }), drill({ ts: 1000, rev: 9 }))).toBe(false)
    expect(isNewerDrill(drill({ rev: 1 }), drill({ rev: 2 }))).toBe(true)
    expect(isNewerDrill(drill({ rev: 2 }), drill({ rev: 2 }))).toBe(false)
  })
})
