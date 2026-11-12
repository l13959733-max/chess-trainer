import { describe, expect, it } from 'vitest'
import { BOOK } from './cityBook'
import { MIRROR, STATIONS, stationById } from './king'

describe('city book', () => {
  it('every city of the journey has a chapter with a story', () => {
    for (const s of STATIONS) {
      const ch = BOOK[s.id]
      expect(ch, s.id).toBeDefined()
      expect(ch.story.length, s.id).toBeGreaterThan(0)
      expect(ch.headline.length, s.id).toBeGreaterThan(0)
    }
  })
  it('the Black part points to a real station of the former Mirror World', () => {
    for (const [id, ch] of Object.entries(BOOK)) {
      if (!ch.black) continue
      const st = stationById(ch.black)
      expect(st, id).toBeDefined()
      expect(MIRROR.includes(st!), id).toBe(true)
    }
  })
  it('no children\'s dialogue: the story never talks to Hoppy or Liam', () => {
    for (const ch of Object.values(BOOK)) for (const p of [...ch.story, ...(ch.board ?? [])]) expect(p).not.toMatch(/Hoppy|Liam|you two/)
  })
})
