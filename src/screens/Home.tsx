import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Progress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import { pause, start, type AnalyzerState } from '../lib/analyzer'
import type { Repertoire } from '../hooks/useRepertoire'
import { PUZZLES_AVAILABLE } from '../lib/progress'
import { daysUntil, isDue, lineResult } from '../lib/srs'

export function Home({ rep, progress, puzzles, analyzer }: { rep: Repertoire; progress: Progress; puzzles: Puzzles; analyzer: AnalyzerState }) {
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

      <section className="lines" aria-label="Repertoire">
        <div className="section-head">
          <h2>Your path</h2>
          <button type="button" onClick={() => go('import')}>Import PGN</button>
        </div>
        <div className="path">
          {rep.lines.map((line, i) => {
            const s = rep.srs.get(line.id)
            const r = lineResult(s, now)
            const last = r.kind === 'new' ? 'Not played yet' : r.kind === 'perfect' ? 'Last time: perfect' : `Last time: ${r.mistakes} ${r.mistakes === 1 ? 'mistake' : 'mistakes'}`
            const next = !s || r.kind === 'new' ? '' : r.due ? 'Practice again now' : daysUntil(s, now) <= 1 ? 'Again tomorrow' : `Again in ${daysUntil(s, now)} days`
            const cls = r.kind === 'new' ? 'new' : r.kind === 'perfect' ? 'perfect' : 'mistakes'
            return (
              <div key={line.id} className={`path-step offset-${i % 4}`}>
                <button
                  type="button"
                  className={`path-node ${cls} ${r.due ? 'is-due' : ''} ${line.side === 'b' ? 'black' : ''}`}
                  aria-expanded={open === line.id}
                  aria-label={line.title}
                  onClick={() => setOpen(open === line.id ? null : line.id)}
                >
                  {r.kind === 'new' ? '★' : r.kind === 'perfect' ? '✓' : r.mistakes}
                </button>
                <div className="path-label">{line.title}</div>
                {r.kind !== 'new' && (
                  <div className={`path-result ${cls}`}>{r.kind === 'perfect' ? 'Perfect' : `${r.mistakes} ${r.mistakes === 1 ? 'mistake' : 'mistakes'}`}{r.due ? ' · practice again' : ''}</div>
                )}
                {open === line.id && (
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
          })}
        </div>
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
        <div className="label">Blunder puzzles</div>
        <div className="puzzle-counts">
          <div><span className="big">{puzzles.due.length}</span> due</div>
          <div><span className="big">{puzzles.fresh.length}</span> new</div>
        </div>
        {puzzles.due.length + puzzles.fresh.length > 0 ? (
          <button type="button" className="primary wide" onClick={() => go('puzzles')}>Solve puzzles</button>
        ) : (
          <p className="note">{puzzles.puzzles.length ? 'Nothing due right now.' : 'Puzzles come from your own mistakes. Analyse your chess.com games to find them.'}</p>
        )}
        <AnalysisStatus analyzer={analyzer} analyzedGames={puzzles.analyzedGames} />
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
