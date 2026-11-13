import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { BottomBar } from '../components/BottomBar'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { usePuzzles } from '../hooks/usePuzzles'
import type { useRepertoire } from '../hooks/useRepertoire'
import { fetchRapidRating } from '../lib/chesscom'
import { STATIONS, loadKing, route, stationById } from '../lib/king'
import { chapterOf } from '../lib/cityBook'
import { lessonOf, loadDiary, when } from '../lib/lessons'
import { nextCity, openCity } from '../lib/travel'
import { getName } from '../lib/profile'
import { isDue } from '../lib/srs'
import { dailyPuzzle, dayNumber, loadResults } from '../lib/threatcheck'
import { pathProgress } from '../lib/trainingToday'

// The start page (Lu, 12.11.: Pinterest model in our book look, "alles auf eine Handy-Seite"): the journey as the hero,
// then four cards (quote, journey, daily, Square Rush), a training strip and the bottom bar with Hoppy in the middle.
// 13.11. (prototype "Hoppy Mix"): a big Hoppy who says where he is, "Practice now" straight into the city's lesson,
// and Hoppy's diary instead of the quote once there is a first entry.
// One phone screen, no scrolling. The painted map lives at #/journey.

const IMG = import.meta.env.BASE_URL + 'king/'
const MAP_W = 1800
const MAP_H = 764
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' }

function rushBest(): number {
  try {
    return JSON.parse(localStorage.getItem('hoppy-rush-best') ?? '0') || 0
  } catch {
    return 0
  }
}

// the daily position after your move, seen from your side
function dailyBoard(day: number) {
  const p = dailyPuzzle(day)
  const c = new Chess(p.fen)
  const me = c.turn()
  c.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4), promotion: p.moves[0][4] })
  const san = c.history()[0]
  const rows = c.board()
  const cells: { key: string; dark: boolean; glyph: string; white: boolean }[] = []
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const r = me === 'w' ? i : 7 - i
      const f = me === 'w' ? j : 7 - j
      const sq = rows[r][f]
      cells.push({ key: `${r}${f}`, dark: (r + f) % 2 === 1, glyph: sq ? GLYPH[sq.type] : '', white: sq?.color === 'w' })
    }
  return { cells, them: me === 'w' ? 'Black' : 'White', san: (me === 'w' ? '' : '…') + san }
}

export function HomeHub({ rep, progress, puzzles, player }: { rep: ReturnType<typeof useRepertoire>; progress: ReturnType<typeof useProgress>; puzzles: ReturnType<typeof usePuzzles>; player: string }) {
  const [king] = useState(loadKing)
  const [now] = useState(() => Date.now())
  const [rating, setRating] = useState<number | null>(null)
  const [best] = useState(rushBest)
  const name = getName() ?? 'Traveller'
  const cities = route().map((id) => stationById(id)!).filter(Boolean)
  const next = nextCity(king.beaten)
  const bosses = STATIONS.filter((s) => !s.finale).length
  const beaten = king.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length
  const day = dayNumber()
  const daily = useMemo(() => dailyBoard(day), [day])
  const result = loadResults()[day]
  const linesDue = rep.lines.filter((l) => isDue(rep.srs.get(l.id), now)).length
  const mistakes = puzzles.due.length + puzzles.fresh.length
  const hour = new Date(now).getHours()
  const hello = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,'

  useEffect(() => {
    let gone = false
    fetchRapidRating(player)
      .then((r) => !gone && setRating(r))
      .catch(() => {})
    return () => {
      gone = true
    }
  }, [player])

  const chapter = next ? cities.indexOf(next) + 1 : cities.length
  // the hero shows the painted map around the next city
  const mx = next ? (next.x / MAP_W) * 100 : 50
  const my = next ? (next.y / MAP_H) * 100 : 50
  const ring = 163.4 * (1 - beaten / Math.max(bosses, 1))
  const lesson = next ? lessonOf(next.id) : undefined
  // Lu, 13.11.: the story always comes first – until it is read, the button opens the chapter's cover
  const storyOpen = !!next && !king.got.includes(`${next.id}/talk`)
  const lessonOpen = !storyOpen && !!next && !!lesson && !king.got.includes(`${next.id}/${lesson.id}`)
  const [diary] = useState(loadDiary)
  const [path] = useState(pathProgress)
  const headline = next ? chapterOf(next.id)?.headline : undefined
  const say = !next
    ? 'We travelled the whole world!'
    : diary[0] && when(diary[0].at, now) === 'today' && !lessonOpen
      ? `I wrote it in my diary! On we go in ${next.name}.`
      : `I’m in ${next.name}!${headline ? ` Today’s chapter: “${headline}”.` : ''}`
  function cta() {
    if (storyOpen) {
      try {
        sessionStorage.removeItem('hoppy-book-page-' + next!.id) // open on the cover, not on a page left earlier
      } catch {
        // nothing remembered
      }
    }
    if (lessonOpen) go(`king/${next!.id}/${lesson!.id}`)
    else if (next) openCity(next.id) // the city's book chapter, always from its cover (Lu, 13.11.)
    else go('journey')
  }

  return (
    <div className="hub">
      <header className="hub-top">
        <div className="hub-hi">
          <small>{hello}</small>
          <b>{name}</b>
        </div>
        <div className="hub-chips">
          <span className="hub-chip" title="Days in a row">🔥 {progress.streak}</span>
          <span className="hub-chip" title="Chestnuts">🌰 {king.coins}</span>
        </div>
      </header>

      <div
        className="hub-hero"
        role="button"
        tabIndex={0}
        onClick={() => go('journey')}
        onKeyDown={(e) => e.key === 'Enter' && go('journey')}
        aria-label={next ? `Open the world map – next: ${next.name}` : 'Open the world map'}
      >
        <span className="hub-map" style={{ backgroundImage: `url(${IMG}worldmap.jpg)`, backgroundPosition: `${mx}% ${my}%` }} />
        <span className="hub-say">{say}</span>
        <span className="hub-peek" aria-hidden="true"><Mascot mood="cheer" /></span>
        <span className="hub-in">
          {next ? (
            <span className="hub-kick">
              <img src={`${IMG}stamp-${next.id}.jpg`} alt="" />
              Next: Chapter {chapter} · {next.name}, {next.year}
            </span>
          ) : (
            <span className="hub-kick">The whole world travelled</span>
          )}
          <span className="hub-h1">
            One move at a time.
            <br />
            <span>Around the world.</span>
          </span>
          <span className="hub-cta">
            <button
              type="button"
              className="hub-gold"
              onClick={(e) => {
                e.stopPropagation()
                cta()
              }}
            >
              {storyOpen ? (
                <>Begin the chapter <small>· {next!.name}</small></>
              ) : lessonOpen ? (
                <>Practice now <small>· {lesson!.steps.length} tasks · {lesson!.minutes} min</small></>
              ) : next ? (
                <>Continue <small>· {next.name}</small></>
              ) : (
                'Open the world map'
              )}
            </button>
          </span>
        </span>
      </div>

      <div className="hub-bento">
        {diary.length > 0 ? (
          <article className="hub-card hub-quote hub-diary">
            <h3>Hoppy’s diary</h3>
            <ol>
              {diary.slice(0, 2).map((d) => (
                <li key={d.id}>
                  <small>{d.city} · {when(d.at, now)}</small>
                  {d.text}
                </li>
              ))}
            </ol>
          </article>
        ) : (
          <article className="hub-card hub-quote">
            <p>A king is not born. He is made – <span>move by move.</span></p>
            <small>– Grandmaster Lu</small>
          </article>
        )}
        <button type="button" className="hub-card hub-prog" onClick={() => go('road')} aria-label={`Journey: ${beaten} of ${bosses} cities`}>
          <h3>Journey</h3>
          <svg className="hub-ringsvg" viewBox="0 0 64 64" width="46" height="46" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#ddd2c0" strokeWidth="8" /><circle cx="32" cy="32" r="26" fill="none" stroke="#d9ad55" strokeWidth="8" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset={ring} /></svg>
          <span className="hub-big">{beaten}<small> / {bosses}</small></span>
          <span className="hub-stats">
            <span><b>{rating ?? '–'}</b>Rapid</span>
            <span><b>{progress.level.level}</b>Level</span>
          </span>
        </button>
        <button type="button" className="hub-card hub-daily" onClick={() => go('threat-check')} aria-label={`Daily Threat Check, day ${day}`}>
          <h3>🎯 Daily · Day {day}</h3>
          <span className="hub-dbody">
            <span className="hub-mini" aria-hidden="true">
              {daily.cells.map((c) => <i key={c.key} className={`${c.dark ? 'd' : 'l'}${c.glyph ? (c.white ? ' w' : ' b') : ''}`}>{c.glyph}</i>)}
            </span>
            <span className="hub-dtxt">
              {result ? (
                <>
                  <span className="hub-h4">{result.ok ? 'Solved today ✓' : 'Missed today'}</span>
                  <span className="hub-pill">Share →</span>
                </>
              ) : (
                <>
                  <span className="hub-h4">What does {daily.them} threaten?</span>
                  <span className="hub-pill">Solve →</span>
                </>
              )}
            </span>
          </span>
        </button>
        <button type="button" className="hub-card hub-rush" onClick={() => go('rush')} aria-label="Square Rush">
          <svg className="hub-conf" viewBox="0 0 70 70" aria-hidden="true"><rect x="40" y="12" width="7" height="7" fill="#f5b82e" transform="rotate(20 43 15)" /><circle cx="58" cy="30" r="4" fill="#8a5cf6" /><rect x="24" y="30" width="6" height="6" fill="#d9ad55" transform="rotate(-15 27 33)" /><circle cx="50" cy="52" r="3" fill="#ff4b4b" /><circle cx="30" cy="12" r="3" fill="#4fc3f7" /></svg>
          <h3>💥 Square Rush</h3>
          <span className="hub-rt">Knight to <span>f3</span></span>
          <span className="hub-best">{best ? `Best ${best}` : 'Learn the squares'} · 60 s</span>
          <span className="hub-go">Play</span>
        </button>
      </div>

      <nav className="hub-strip" aria-label="Training">
        <button type="button" className="hub-strip-go" onClick={() => go('tent')}>⛺ Training{path ? ` ${path.done}/${path.total}` : ''}</button>
        <button type="button" onClick={() => go('review')}>Lines {linesDue > 0 && <b>{linesDue}</b>}</button>
        <button type="button" onClick={() => go('puzzles')}>Mistakes {mistakes > 0 && <b>{mistakes}</b>}</button>
        <button type="button" onClick={() => go('play')}>Bot ▶</button>
      </nav>

      <BottomBar active="home" />
    </div>
  )
}
