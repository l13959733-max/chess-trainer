import { Fragment, useEffect, useMemo, useState } from 'react'
import { PathStep } from '../components/PathStep'
import { WhatWhen } from './OpeningMap'
import { OpponentsCard } from '../components/OpponentsCard'
import { go } from '../hooks/useHashRoute'
import type { Achievements } from '../hooks/useAchievements'
import type { Progress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import { lastLine } from '../lib/returnTo'
import { pause, start, type AnalyzerState } from '../lib/analyzer'
import type { Repertoire } from '../hooks/useRepertoire'
import { chapters, type Chapter } from '../lib/chapters'
import { branchMove, guideFor, type Guide } from '../lib/guide'
import type { Line } from '../lib/pgn'
import { PUZZLES_AVAILABLE } from '../lib/progress'
import { isDue } from '../lib/srs'
import { useLive } from '../lib/live'
import { Together } from './Watch'

export function Home({ rep, progress, puzzles, analyzer, player, trophies }: { rep: Repertoire; progress: Progress; puzzles: Puzzles; analyzer: AnalyzerState; player: string; trophies: Achievements }) {
  const now = Date.now()
  const live = useLive()

  const doneLines = progress.today?.lines ?? 0
  const { goal } = progress
  const [open, setOpen] = useState<string | null>(null)
  const chapterList = useMemo(() => chapters(rep.lines), [rep.lines])
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => {
    const open = loadOpen(chapterList, rep, now)
    const back = chapterList.find((c) => c.lines.some((l) => l.id === lastLine()))
    if (back) open.add(back.key)
    return open
  })
  // "Learn openings" (chapters) or "What to play when?" (the other side's answers); remembered per phone
  const [tab, setTab] = useState<'learn' | 'when'>(() => {
    try {
      return localStorage.getItem(TAB_KEY) === 'when' ? 'when' : 'learn'
    } catch {
      return 'learn'
    }
  })
  function chooseTab(t: 'learn' | 'when') {
    setTab(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // not remembered
    }
  }
  // Back from a line: show that line again instead of the top, so the next one is right there
  useEffect(() => {
    const id = lastLine()
    if (!id) return
    requestAnimationFrame(() => document.querySelector(`[data-line="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center' }))
  }, [])
  // The finder opens chapters and scrolls to the first one
  function openAndScroll(keys: string[]) {
    if (!keys.length) return
    const next = new Set(openChapters)
    keys.forEach((k) => next.add(k))
    setOpenChapters(next)
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...next]))
    } catch {
      // not remembered
    }
    window.setTimeout(() => document.getElementById('ch-' + keys[0])?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  function toggleChapter(key: string) {
    const next = new Set(openChapters)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setOpenChapters(next)
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...next]))
    } catch {
      // private mode: the choice is just not remembered
    }
  }

  return (
    <div className="screen">
      {/* 25.11.2026 (Lu: "nichts doppelt"): this page is the opening library now. Streak/XP/level are on Progress,
          today's cards, play, puzzles, weaknesses and "win it" in Training, watch and trophies on Progress. */}
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to Training">←</button>
        <div>
          <div className="eyebrow">Training · {rep.lines.length} lines</div>
          <h2>All openings</h2>
        </div>
      </div>

      {trophies.fresh.length > 0 && (
        <button type="button" className="trophy-banner" onClick={() => go('trophies')}>
          <span className="medal" aria-hidden="true">{trophies.fresh[0].icon}</span>
          <span>
            <b>{trophies.fresh.length === 1 ? 'New trophy: ' + trophies.fresh[0].title : `${trophies.fresh.length} new trophies!`}</b>
            <br />
            <small>Tap to see your trophies</small>
          </span>
        </button>
      )}

      <Together live={live} />

      <OpponentsCard player={player} lines={rep.lines} srs={rep.srs} onOpen={openAndScroll} />

      <section className="lines" aria-label="Repertoire">
        <div className="section-head">
          <h2>Your path</h2>
          <button type="button" onClick={() => go('import')}>Import PGN</button>
        </div>
        <div className="path-tabs" role="group" aria-label="Show">
          <button type="button" className={tab === 'learn' ? 'on' : ''} aria-pressed={tab === 'learn'} onClick={() => chooseTab('learn')}>Learn openings</button>
          <button type="button" className={tab === 'when' ? 'on' : ''} aria-pressed={tab === 'when'} onClick={() => chooseTab('when')}>What to play when?</button>
        </div>
        {tab === 'when' && <WhatWhen rep={rep} />}
        {tab === 'learn' && (
        <>
        <button type="button" className="attacks-row" onClick={() => go('attacks')}>
          <span className="quick-icon" aria-hidden="true">⚔️</span>
          <span><b>Attacks & Traps</b><br /><small>Every famous attack together with its defense</small></span>
          <span className="chevron" aria-hidden="true">▸</span>
        </button>
        <Finder chapters={chapterList} lines={rep.lines} onOpen={openAndScroll} />
        {chapterList.map((ch, ci) => {
          const isOpen = openChapters.has(ch.key)
          const newGroup = ci === 0 || chapterList[ci - 1].group !== ch.group
          const played = ch.lines.filter((l) => rep.srs.get(l.id)).length
          const dueHere = ch.lines.filter((l) => isDue(rep.srs.get(l.id), now)).length
          return (
            <Fragment key={ch.key}>
            {newGroup && <h3 className="chapter-group">{ch.group}</h3>}
            <div id={'ch-' + ch.key} className={`chapter ${isOpen ? 'open' : ''}`}>
              <button type="button" className="chapter-head" aria-expanded={isOpen} onClick={() => toggleChapter(ch.key)}>
                <span className={`side-dot ${ch.side === 'b' ? 'black' : ch.side === 'w' ? 'white' : ''}`} aria-hidden="true" />
                <span className="chapter-title">
                  {ch.title}
                  {ch.moves && <small className="chapter-moves">{ch.moves}</small>}
                </span>
                <span className="chapter-count">
                  {played}/{ch.lines.length}
                  {dueHere > 0 && <b className="chapter-due">{dueHere} due</b>}
                </span>
                <span className="chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && <GuideCard guide={guideFor(ch.lines[0].opening, ch.side)} />}
              {isOpen && (
                <div className="path">
                  {ch.lines.map((line, i) => (
                    <PathStep key={line.id} line={line} i={i} rep={rep} now={now} branch={branchMove(line, ch.lines)} open={open === line.id} onToggle={() => setOpen(open === line.id ? null : line.id)} />
                  ))}
                </div>
              )}
            </div>
            </Fragment>
          )
        })}
        </>
        )}
      </section>

      <section className={`goal-card ${progress.goalReached ? 'reached' : ''}`} aria-label="Daily goal">
        <div className="goal-head">
          <div className="label">Daily goal{progress.goalReached ? ' · reached' : ''}</div>
          <div className="stepper" aria-label="Lines per day">
            <button type="button" aria-label="Fewer lines per day" disabled={goal.lines <= 1} onClick={() => progress.setGoal({ ...goal, lines: goal.lines - 1 })}>−</button>
            <button type="button" aria-label="More lines per day" disabled={goal.lines >= 50} onClick={() => progress.setGoal({ ...goal, lines: goal.lines + 1 })}>+</button>
          </div>
        </div>
        <div className="goal-row">
          <span>Opening lines</span>
          <span className="count">{doneLines} / {goal.lines}</span>
        </div>
        <div className="bar"><span style={{ width: `${Math.min(1, doneLines / goal.lines) * 100}%` }} /></div>
        <div className="goal-row muted">
          <span>Blunder puzzles</span>
          <span className="count">{PUZZLES_AVAILABLE ? `${progress.today?.puzzles ?? 0} / ${goal.puzzles}` : 'coming in step 4'}</span>
        </div>
      </section>

      <section className="due-card" aria-label="Blunder puzzles">
        <div className="label">Blunder puzzles · {player}</div>
        <div className="puzzle-counts">
          <div><span className="big">{puzzles.due.length}</span> due</div>
          <div><span className="big">{puzzles.fresh.length}</span> new</div>
        </div>
        {puzzles.due.length + puzzles.fresh.length > 0 ? (
          <button type="button" className="primary wide" onClick={() => go('puzzles')}>Solve puzzles</button>
        ) : (
          <p className="note">{puzzles.puzzles.length ? 'Nothing due right now.' : `Puzzles come from your own mistakes. Analyse ${player}'s chess.com games to find them.`}</p>
        )}
        <AnalysisStatus analyzer={analyzer} analyzedGames={puzzles.analyzedGames} />
        <button type="button" className="link-btn" onClick={() => go('settings')}>Not {player}? Change the chess.com account</button>
      </section>

    </div>
  )
}

function AnalysisStatus({ analyzer, analyzedGames }: { analyzer: AnalyzerState; analyzedGames: number }) {
  const running = analyzer.status === 'running' || analyzer.status === 'loading'
  const total = analyzer.total
  const done = total ? analyzer.analyzed : analyzedGames
  return (
    <div className="analysis">
      <div className="analysis-row">
        <span>
          {analyzer.status === 'loading'
            ? 'Loading your games from chess.com …'
            : total
              ? `${done.toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')} rapid & daily games analysed`
              : `${analyzedGames.toLocaleString('en-GB')} games analysed`}
        </span>
        {running ? (
          <button type="button" onClick={pause}>Pause</button>
        ) : (
          <button type="button" onClick={() => start()}>{analyzedGames ? 'Continue' : 'Analyse games'}</button>
        )}
      </div>
      {total > 0 && (
        <div className="bar"><span style={{ width: `${(done / total) * 100}%` }} /></div>
      )}
      {analyzer.current && analyzer.status === 'running' && (
        <p className="note">
          Now: vs {analyzer.current.opponent} ({analyzer.current.date}), position {analyzer.current.ply + 1} of {analyzer.current.plies}
          {analyzer.found ? ` · ${analyzer.found} new puzzles this session` : ''}
        </p>
      )}
      {analyzer.status === 'done' && <p className="note good">All games analysed{analyzer.found ? ` · ${analyzer.found} new puzzles` : ''}.</p>}
      {analyzer.status === 'paused' && <p className="note">Paused. Finished games are saved.</p>}
      {analyzer.status === 'error' && <p className="note bad">Stopped: {analyzer.error}. Tap Continue to try again.</p>}
      <p className="note small">Newest games first. Runs while the app is open; keep it in front on your phone.</p>
    </div>
  )
}

const OPEN_KEY = 'chess-trainer-open-chapters'
const TAB_KEY = 'chess-trainer-path-tab'

// Chapters that were open last time; the first time, the chapters with due lines (or the first chapter)
function loadOpen(list: Chapter[], rep: Repertoire, now: number): Set<string> {
  try {
    const saved = localStorage.getItem(OPEN_KEY)
    if (saved) return new Set(JSON.parse(saved) as string[])
  } catch {
    // ignore
  }
  const withDue = list.filter((c) => c.lines.some((l) => isDue(rep.srs.get(l.id), now))).map((c) => c.key)
  return new Set(withDue.length ? withDue : list.slice(0, 1).map((c) => c.key))
}

function GuideCard({ guide }: { guide?: Guide }) {
  if (!guide) return null
  return (
    <div className="guide-card">
      <span className={`style-chip ${guide.style.toLowerCase()}`}>{guide.style}</span>
      <p>{guide.about}</p>
      <ul>
        {guide.ideas.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      {guide.fact && (
        <p className="fun-fact">
          <b>Fun fact:</b> {guide.fact}
        </p>
      )}
      {guide.story && (
        <details className="guide-story">
          <summary>History & idea</summary>
          {guide.story.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </details>
      )}
    </div>
  )
}

// "Find your answer": pick the opponent's first move, or search by name
const WHITE_ANSWERS: { label: string; keys: string[] }[] = [
  { label: '1...e5', keys: ['Italian Game|w', 'Two Knights Defense|w', 'Ruy Lopez|w', 'Petrov Defense|w', 'Philidor Defense|w', 'Vienna Game|w', "Bishop's Opening|w"] },
  { label: '1...d5', keys: ['Scandinavian|w'] },
  { label: '1...c6', keys: ['Caro-Kann|w'] },
  { label: '1...c5', keys: ['Sicilian Defense|w'] },
  { label: '1...e6', keys: ['French Defense|w'] },
  { label: '1...d6 / g6', keys: ['Pirc & Modern|w'] },
  { label: '1...Nc6', keys: ['Nimzowitsch Defense|w'] },
]
const BLACK_ANSWERS: { label: string; keys: string[] }[] = [
  { label: '1.e4', keys: ['Scandinavian|b', 'Caro-Kann|b', 'Sicilian Dragon|b', "Sicilian: White's other tries|b", 'Italian Game|b', 'Two Knights Defense|b', 'Philidor Defense|b', 'Ruy Lopez|b'] },
  { label: '1.d4', keys: ["Queen's Gambit Declined|b", 'London & 2.Nf3|b'] },
  { label: '1.c4 · 1.Nf3 · other', keys: ['Other first moves|b'] },
]

function Finder({ chapters, lines, onOpen }: { chapters: Chapter[]; lines: Line[]; onOpen: (keys: string[]) => void }) {
  const [side, setSide] = useState<'w' | 'b'>('w')
  const [q, setQ] = useState('')
  const known = new Set(chapters.map((c) => c.key))
  const answers = (side === 'w' ? WHITE_ANSWERS : BLACK_ANSWERS).map((a) => ({ ...a, keys: a.keys.filter((k) => known.has(k)) })).filter((a) => a.keys.length)
  const query = q.trim().toLowerCase()
  const hits = query.length < 2 ? [] : lines.filter((l) => `${l.title} ${l.opening ?? ''}`.toLowerCase().includes(query)).slice(0, 8)
  return (
    <div className="finder">
      <div className="label">Find your answer</div>
      <div className="seg two" role="group" aria-label="My color">
        <button type="button" className={side === 'w' ? 'on' : ''} onClick={() => setSide('w')}>I play White</button>
        <button type="button" className={side === 'b' ? 'on' : ''} onClick={() => setSide('b')}>I play Black</button>
      </div>
      <div className="note small">{side === 'w' ? 'Black answers 1.e4 with …' : 'White starts with …'}</div>
      <div className="finder-chips">
        {answers.map((a) => (
          <button key={a.label} type="button" onClick={() => onOpen(a.keys)}>{a.label}</button>
        ))}
      </div>
      <input className="finder-search" type="search" placeholder="Search: Dragon, Fried Liver, trap, gambit …" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && (
        <ul className="finder-hits">
          {hits.map((l) => (
            <li key={l.id}>
              <span className={`side-dot ${l.side === 'b' ? 'black' : 'white'}`} aria-hidden="true" />
              <span className="hit-title">{l.title}</span>
              <button type="button" onClick={() => go('learn/' + l.id)}>Learn</button>
              <button type="button" className="primary" onClick={() => go('drill/' + l.id)}>Play</button>
            </li>
          ))}
        </ul>
      )}
      {query.length >= 2 && !hits.length && <p className="note small">Nothing found for “{q}”.</p>}
    </div>
  )
}
