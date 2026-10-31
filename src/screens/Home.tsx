import { Fragment, useMemo, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { OpponentsCard } from '../components/OpponentsCard'
import { go } from '../hooks/useHashRoute'
import type { Achievements } from '../hooks/useAchievements'
import type { Progress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import { dailyQueue } from '../lib/daily'
import { pause, start, type AnalyzerState } from '../lib/analyzer'
import type { Repertoire } from '../hooks/useRepertoire'
import { clampScore } from '../lib/blunders'
import { chapters, type Chapter } from '../lib/chapters'
import { branchMove, guideFor, type Guide } from '../lib/guide'
import type { Line } from '../lib/pgn'
import { PUZZLES_AVAILABLE } from '../lib/progress'
import { daysUntil, isDue, lineResult } from '../lib/srs'

export function Home({ rep, progress, puzzles, analyzer, player, trophies }: { rep: Repertoire; progress: Progress; puzzles: Puzzles; analyzer: AnalyzerState; player: string; trophies: Achievements }) {
  const now = Date.now()
  const due = rep.lines.filter((l) => isDue(rep.srs.get(l.id), now))
  const fresh = rep.lines.filter((l) => !rep.srs.get(l.id))
  const upcoming = rep.lines
    .map((l) => rep.srs.get(l.id))
    .filter((s) => s && !isDue(s, now))
    .map((s) => daysUntil(s!, now))
    .sort((a, b) => a - b)[0]

  const doneLines = progress.today?.lines ?? 0
  const activeToday = doneLines + (progress.today?.puzzles ?? 0) > 0
  const { goal } = progress
  const [open, setOpen] = useState<string | null>(null)
  const cards = dailyQueue(rep.lines, rep.srs, puzzles.puzzles, puzzles.srs, now).length
  // Positions from your games where you were clearly winning before a mistake: win them again vs the bot
  const winning = useMemo(() => puzzles.puzzles.filter((p) => clampScore(p.scoreBefore) >= 300), [puzzles.puzzles])
  const chapterList = useMemo(() => chapters(rep.lines), [rep.lines])
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => loadOpen(chapterList, rep, now))
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
      <section className="chips" aria-label="Your progress">
        <div className="chip-stat streak">
          <svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#ff8a1e" /><path d="M12 13c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1.5-2.5.2 1 .8 1.5 1.5 1.5 0-1.5-.5-2.5 0-4z" fill="#ffd166" /></svg>
          <span>{progress.streak}<small>day streak</small></span>
        </div>
        <div className="chip-stat xp">
          <svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z" fill="#ffc531" /></svg>
          <span>{progress.totalXp}<small>XP</small></span>
        </div>
        <div className="chip-stat level">
          <svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#8a5cf6" /><text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">{progress.level.level}</text></svg>
          <span>Lvl {progress.level.level}<small>{progress.level.needed - progress.level.into} XP to go</small></span>
        </div>
      </section>

      <div className="greet">
        <Mascot mood={activeToday ? 'cheer' : 'happy'} />
        {activeToday ? 'Great job today! Want to play one more?' : progress.streak ? `Hi! Play today to keep your ${progress.streak}-day streak!` : 'Hi, I’m Hoppy! Let’s learn some chess together.'}
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

      <section className="daily-card" aria-label="Today's cards">
        <div className="label">Today's cards</div>
        <div><span className="big">{cards}</span> {cards === 1 ? 'card' : 'cards'} to repeat</div>
        <p className="note">Lines, puzzles and threats come back just before you would forget them.</p>
        <button type="button" className="primary wide" disabled={!cards} onClick={() => go('daily')}>{cards ? 'Start' : 'All done for today'}</button>
      </section>

      <section className="quick" aria-label="Train">
        <button type="button" className="quick-tile play" onClick={() => go('play')}>
          <span className="quick-icon" aria-hidden="true">♞</span>
          <span className="quick-text">Play<small>vs Hoppy-Bot</small></span>
        </button>
        <button type="button" className="quick-tile puzzles" onClick={() => go('puzzles')}>
          <span className="quick-icon" aria-hidden="true">♜</span>
          <span className="quick-text">Puzzles<small>{puzzles.due.length + puzzles.fresh.length} waiting</small></span>
        </button>
        <button type="button" className="quick-tile weak" onClick={() => go('weaknesses')}>
          <span className="quick-icon" aria-hidden="true">♝</span>
          <span className="quick-text">My weaknesses<small>train them</small></span>
        </button>
        <button type="button" className="quick-tile win" disabled={!winning.length} onClick={() => go('play/puzzle/' + encodeURIComponent(winning[Math.floor(Math.random() * winning.length)].id))}>
          <span className="quick-icon" aria-hidden="true">♛</span>
          <span className="quick-text">Win it<small>{winning.length ? `${winning.length} won positions` : 'from your games'}</small></span>
        </button>
      </section>

      <button type="button" className="trophy-row" onClick={() => go('trophies')}>
        <span><span className="label">Trophies</span><br /><b>{trophies.list.filter((a) => a.earned).length} of {trophies.list.length}</b> collected</span>
        <span className="chevron" aria-hidden="true">▸</span>
      </button>

      <OpponentsCard player={player} lines={rep.lines} srs={rep.srs} onOpen={openAndScroll} />

      <section className="lines" aria-label="Repertoire">
        <div className="section-head">
          <h2>Your path</h2>
          <button type="button" onClick={() => go('import')}>Import PGN</button>
        </div>
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

      <section className="due-card">
        <div className="label">Lines due</div>
        <div className="big">{rep.ready ? due.length : '…'}</div>
        {due.length > 0 ? (
          <button type="button" className="primary wide" onClick={() => go('review')}>
            Review now
          </button>
        ) : (
          <p className="note">
            {fresh.length > 0
              ? `Nothing due. ${fresh.length} new lines are waiting – learn one, then play it in a drill.`
              : upcoming !== undefined
                ? `Nothing due. Next review ${upcoming <= 1 ? 'tomorrow' : `in ${upcoming} days`}.`
                : 'Nothing due.'}
          </p>
        )}
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

function PathStep({ line, i, rep, now, branch, open, onToggle }: { line: Line; i: number; rep: Repertoire; now: number; branch: string | null; open: boolean; onToggle: () => void }) {
  const s = rep.srs.get(line.id)
  const r = lineResult(s, now)
  const last = r.kind === 'new' ? 'Not played yet' : r.kind === 'perfect' ? 'Last time: perfect' : `Last time: ${r.mistakes} ${r.mistakes === 1 ? 'mistake' : 'mistakes'}`
  const next = !s || r.kind === 'new' ? '' : r.due ? 'Practice again now' : daysUntil(s, now) <= 1 ? 'Again tomorrow' : `Again in ${daysUntil(s, now)} days`
  const cls = r.kind === 'new' ? 'new' : r.kind === 'perfect' ? 'perfect' : 'mistakes'
  return (
    <div className={`path-step offset-${i % 4}`}>
      <button
        type="button"
        className={`path-node ${cls} ${r.due ? 'is-due' : ''} ${line.side === 'b' ? 'black' : ''}`}
        aria-expanded={open}
        aria-label={line.title}
        onClick={onToggle}
      >
        {r.kind === 'new' ? '★' : r.kind === 'perfect' ? '✓' : r.mistakes}
      </button>
      <div className="path-label">{line.title}</div>
      {branch && <div className="path-branch">differs at {branch}</div>}
      {r.kind !== 'new' && (
        <div className={`path-result ${cls}`}>{r.kind === 'perfect' ? 'Perfect' : `${r.mistakes} ${r.mistakes === 1 ? 'mistake' : 'mistakes'}`}{r.due ? ' · practice again' : ''}</div>
      )}
      {open && (
        <div className="path-pop">
          <div className="meta">
            <span className={`side side-${line.side}`}>{line.side === 'w' ? 'White' : 'Black'}</span>
            <span>{Math.ceil(line.moves.length / 2)} moves</span>
            <span className={`status ${cls}`}>{last}</span>
            {next && <span className={r.due ? 'status due' : ''}>{next}</span>}
          </div>
          <div className="row">
            <button type="button" onClick={() => go('learn/' + line.id)}>Learn</button>
            <button type="button" className="primary" onClick={() => go('drill/' + line.id)}>Play</button>
          </div>
        </div>
      )}
    </div>
  )
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
