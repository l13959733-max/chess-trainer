import { useEffect } from 'react'
import { ChapterPath, type ChapterLevel } from '../components/ChapterPath'
import { go } from '../hooks/useHashRoute'
import type { useRepertoire } from '../hooks/useRepertoire'
import { COURSE, courseLine } from '../lib/blackCourse'
import { loadBlack, saveBlack } from '../lib/openingRush'

// Hoppy's Black training #/black-course (Lu, 22.11.2026): learn the Scandinavian and the Queen's Gambit Declined on
// one path – learn a line, play it from memory, a Rush after each part. Steps: src/lib/blackCourse.ts.

type Rep = ReturnType<typeof useRepertoire>
const read = (key: string): number => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '0') as number
  } catch {
    return 0
  }
}

export function BlackCourse({ rep }: { rep: Rep }) {
  // taking the course means this is your Black system
  useEffect(() => {
    const b = loadBlack()
    if (!b.e4 && !b.d4) saveBlack({ e4: 'scandi', d4: 'qgd' })
  }, [])
  const levels: ChapterLevel[] = []
  let lines = 0
  let learned = 0
  for (const st of COURSE) {
    if (st.kind === 'line') {
      const l = courseLine(rep.lines, st.title)
      if (!l) continue
      lines++
      const known = rep.srs.has(l.id)
      if (known) learned++
      const cut = l.title.indexOf(': ')
      levels.push({
        key: 'line:' + l.id,
        title: cut > 0 ? l.title.slice(cut + 2) : l.title,
        sub: st.vs === 'e4' ? '♚ vs 1.e4 · Scandinavian' : `♚ vs 1.d4 · ${l.opening === 'London & 2.Nf3' ? 'London & co.' : "Queen's Gambit Declined"}`,
        done: known,
        say: known ? 'Play it again from memory.' : 'Learn this line move by move, then play it.',
        open: () => go((known ? 'drill/' : 'learn/') + l.id),
      })
    } else {
      const best = read('hoppy-orush-best/' + st.key)
      const pct = read('hoppy-orush-pct/' + st.key)
      const done = st.need === 'star' ? best >= 80 : pct >= 25
      levels.push({
        key: 'rush:' + st.key,
        title: st.title,
        sub: st.need === 'star' ? 'Rush · one star (80 points)' : 'Rush · Bronze belt (25 % mastered)',
        icon: '⚡',
        boss: st.need === 'bronze',
        done,
        say: st.need === 'star' ? 'Everything so far, mixed and on time. Get one star!' : 'The final test: every situation of your Black system.',
        open: () => go('opening-rush/' + st.key),
      })
    }
  }
  return (
    <div className="screen bc">
      <div className="rush-head">
        <button type="button" className="back" onClick={() => go('today')} aria-label="Back to Daily">←</button>
        <h1>Your Black training</h1>
      </div>
      <div className="bc-intro">
        <b>1...d5 against everything</b>
        <span>Against 1.e4: the <b>Scandinavian</b> (1.e4 d5). Against 1.d4: the <b>Queen's Gambit Declined</b> (1.d4 d5 2.c4 e6) – with ...c5 against the London and the quiet systems.</span>
        <span className="bc-count">{learned}/{lines} lines played</span>
      </div>
      <ChapterPath levels={levels} doneSay="Your Black system is ready for chess.com!" />
      <button type="button" className="or-pick" onClick={() => go('black')}>Other Black systems</button>
    </div>
  )
}
