import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { POOL, dailyPuzzle, dayNumber, shareText, squares } from './threatcheck'

describe('daily threat check', () => {
  it('counts local days from 9 November 2026', () => {
    expect(dayNumber(new Date(2026, 10, 9, 0, 1))).toBe(1)
    expect(dayNumber(new Date(2026, 10, 9, 23, 59))).toBe(1)
    expect(dayNumber(new Date(2026, 10, 10, 8))).toBe(2)
    expect(dayNumber(new Date(2027, 0, 1, 12))).toBe(54)
  })

  it('every day of the cycle has its own puzzle, and both moves are legal', () => {
    const n = POOL.length
    expect(n).toBeGreaterThan(100)
    const seen = new Set<string>()
    for (let day = 1; day <= n; day++) {
      const p = dailyPuzzle(day)
      seen.add(p.id)
      const c = new Chess(p.fen)
      for (const u of p.moves.slice(0, 2)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    }
    expect(seen.size).toBe(n)
    expect(dailyPuzzle(n + 1).id).toBe(dailyPuzzle(1).id)
  })

  it('the share text tells how fast, never the move', () => {
    const p = dailyPuzzle(1)
    const c = new Chess(p.fen)
    c.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) })
    const answer = c.move({ from: p.moves[1].slice(0, 2), to: p.moves[1].slice(2, 4), promotion: p.moves[1][4] }).san
    const text = shareText(1, { ok: true, secs: 9 }, 'https://example.org/#/threat-check')
    expect(text).toBe('Hoppy · Daily Threat Check #1\n🟩🟩🟩 spotted in 9 s\nCan you spot it? https://example.org/#/threat-check')
    expect(text).not.toContain(answer)
    expect(squares({ ok: true, secs: 25 })).toBe('🟩🟩⬜')
    expect(squares({ ok: true, secs: 31 })).toBe('🟩⬜⬜')
    expect(shareText(2, { ok: false, secs: 40 }, 'x')).toContain('🟥 the Shadow got me')
  })
})
