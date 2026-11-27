import { useMemo, useState } from 'react'
import { ChapterPath, type ChapterLevel } from '../components/ChapterPath'
import { go } from '../hooks/useHashRoute'
import type { useRepertoire } from '../hooks/useRepertoire'
import { chapters } from '../lib/chapters'
import { chapterOf } from '../lib/cityBook'
import { guideFor } from '../lib/guide'
import { MIRROR, STATIONS, stationLines } from '../lib/king'
import { ARENA_KEYS, keyOf } from '../lib/openingRush'
import { openCity } from '../lib/travel'
import type { Puzzle } from '../lib/db'
import { useGames } from '../hooks/useGames'
import { bestChapter, type Kind, type PGame } from '../lib/progressStats'

// #/opening/<chapter key> – one opening as your own path (Lu, 27.11.2026: "wenn ich die Eröffnungen auswähle, will ich,
// dass da mein Ablauf kommt und die Geschichte"): on top the story (the city that tells this opening, and what the
// opening is about), below the path – learn every line, play it from memory, a Rush after every three lines and at
// the end. Opened from the White and Black pages; after a line "Overview" comes back here (returnTo origin).
const IMG = import.meta.env.BASE_URL + 'king/'
type Rep = ReturnType<typeof useRepertoire>
const read = (key: string): number => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '0') as number
  } catch {
    return 0
  }
}

const KIND_NAME: Record<Kind, string> = { h: 'Hung a piece', i: 'Ignored a threat', u: 'Left a piece undefended', t: 'Walked into a tactic', a: 'Allowed mate', f: 'Missed a free piece', m: 'Missed a tactic', M: 'Missed a mate', o: 'Other kinds' }

export function OpeningPath({ id, rep, player, puzzles }: { id: string; rep: Rep; player: string; puzzles: Puzzle[] }) {
  const all = useMemo(() => chapters(rep.lines), [rep.lines])
  const ch = all.find((c) => c.key === id)
  const { G } = useGames(player, puzzles)
  const [pick] = useState(() => Math.random())
  // your real games in this opening (same rule as the cards on the White / Black page)
  const games = useMemo<PGame[]>(() => {
    if (!G || !ch?.side) return []
    const sameSide = all.filter((c) => c.side === ch.side)
    return G.filter((g) => g.color === ch.side && bestChapter(g.sans, sameSide) === ch.key)
  }, [G, all, ch])
  if (!ch || !ch.side) {
    return (
      <div className="screen"><div className="done"><div className="done-title">This opening is not in your book</div>
        <div className="done-actions"><button type="button" className="primary" onClick={() => go('proto')}>Back</button></div></div></div>
    )
  }
  const side = ch.side
  const white = side === 'w'
  // the story: every city (and Mirror World place) whose lines are this opening
  const ids = new Set(ch.lines.map((l) => l.id))
  const cities = [...STATIONS, ...MIRROR].filter((s) => s.lines?.side === side && stationLines(s, rep.lines).some((l) => ids.has(l.id)))
  const guide = guideFor(ch.lines[0].opening, side)
  // the Rush of this opening, if there is one
  const rushKey = [...new Set(ch.lines.map((l) => keyOf(l.opening ?? '', side)))].find((k) => ARENA_KEYS.includes(k))

  const levels: ChapterLevel[] = []
  const known = (lid: string) => rep.srs.has(lid)
  ch.lines.forEach((l, i) => {
    const k = known(l.id)
    const cut = l.title.indexOf(': ')
    levels.push({
      key: 'line:' + l.id,
      title: cut > 0 ? l.title.slice(cut + 2) : l.title,
      sub: `${white ? '♔' : '♚'} ${ch.title}`,
      done: k,
      say: k ? 'Play it again from memory.' : 'Learn this line move by move, then play it.',
      open: () => go((k ? 'drill/' : 'learn/') + l.id),
    })
    const last = i === ch.lines.length - 1
    if (rushKey && ((i + 1) % 3 === 0 || last)) {
      const best = read('hoppy-orush-best/' + rushKey)
      const pct = read('hoppy-orush-pct/' + rushKey)
      levels.push({
        key: `rush:${rushKey}:${i}`,
        title: last ? `${ch.title} Rush` : 'Rush · everything so far',
        sub: last ? 'The final test · Bronze belt (25 % mastered)' : 'On time · one star (80 points)',
        icon: '⚡',
        boss: last,
        done: last ? pct >= 25 : best >= 80,
        say: last ? 'The final test: every situation of this opening, on time.' : 'Everything so far, mixed and on time. Get one star!',
        open: () => go('opening-rush/' + rushKey),
      })
    }
  })
  const learned = ch.lines.filter((l) => known(l.id)).length
  const won = games.filter((g) => g.result === 'w').length, drawn = games.filter((g) => g.result === 'd').length, lost = games.length - won - drawn
  const A = games.filter((g) => g.analysed)
  const mpg = A.length ? A.reduce((n, g) => n + g.mistakes.length, 0) / A.length : null
  const kinds = new Map<Kind, number>()
  for (const m of A.flatMap((g) => g.mistakes)) kinds.set(m.kind, (kinds.get(m.kind) ?? 0) + 1)
  const topKind = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0]
  const lastFive = games.slice(-5)
  const knownLines = ch.lines.filter((l) => known(l.id))
  const randomLine = knownLines.length ? knownLines[Math.floor(pick * knownLines.length)] : undefined

  return (
    <div className={`screen opp ${white ? 'opp-w' : 'opp-b'}`}>
      <div className="opp-head">
        <button type="button" className="back" onClick={() => window.history.back()} aria-label="Back">←</button>
        <div>
          <div className="eyebrow">{white ? '♔ White' : '♚ Black'} · {learned}/{ch.lines.length} lines</div>
          <h2>{ch.title}</h2>
          <small>{ch.moves}</small>
        </div>
      </div>

      {cities.map((s) => (
        <button key={s.id} type="button" className="opp-story" onClick={() => openCity(s.id)} style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.7)), url(${IMG}${s.id}.jpg)` }}>
          <small>The story · {s.name}</small>
          <b>{chapterOf(s.id)?.headline ?? s.name}</b>
          <i>READ</i>
        </button>
      ))}
      {guide && (
        <details className="opp-about">
          <summary>{guide.about}</summary>
          {guide.ideas.length > 0 && <ul>{guide.ideas.map((x) => <li key={x}>{x}</li>)}</ul>}
          {guide.story?.map((p) => <p key={p}>{p}</p>)}
          {guide.fact && <p className="opp-fact">💡 {guide.fact}</p>}
        </details>
      )}

      <div className="opp-stats">
        <h3>How it goes in your games</h3>
        {games.length ? (
          <>
            <div className="opp-bar" role="img" aria-label={`won ${won}, draw ${drawn}, lost ${lost}`}>
              {won > 0 && <i style={{ flex: won, background: 'var(--b-green)' }}>{won}</i>}
              {drawn > 0 && <i style={{ flex: drawn, background: '#d9d4e6', color: '#3a3450' }}>{drawn}</i>}
              {lost > 0 && <i style={{ flex: lost, background: 'var(--b-red)' }}>{lost}</i>}
            </div>
            <div className="opp-nums">
              <span><b>{Math.round((100 * won) / games.length)}%</b>won · {games.length} {games.length === 1 ? 'game' : 'games'}</span>
              <span><b>{mpg == null ? '–' : mpg.toFixed(1)}</b>big mistakes / game</span>
              <span className="opp-last" aria-label="Your last games">{lastFive.map((g, i) => <i key={i} className={g.result}>{g.result === 'w' ? 'W' : g.result === 'd' ? '½' : 'L'}</i>)}</span>
            </div>
            {topKind && <p className="opp-kind">Your most common mistake here: <b>{KIND_NAME[topKind[0]]}</b> ({topKind[1]}×)</p>}
          </>
        ) : (
          <p className="opp-kind">{G ? 'No rapid games with this opening yet.' : 'Loading your games …'}</p>
        )}
        <span className="opp-learned"><i><em style={{ width: `${(100 * learned) / ch.lines.length}%` }} /></i>{learned} of {ch.lines.length} lines learned</span>
      </div>
      {randomLine && <button type="button" className="opp-random" onClick={() => go('drill/' + randomLine.id)}>🎲 A random line you know</button>}

      <h3 className="opp-h">Your path</h3>
      <ChapterPath levels={levels} doneSay={`You know every line of the ${ch.title}!`} />
    </div>
  )
}
