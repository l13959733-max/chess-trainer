import { go } from '../hooks/useHashRoute'
import type { Progress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import { pause, start, type AnalyzerState } from '../lib/analyzer'
import type { Repertoire } from '../hooks/useRepertoire'
import { PUZZLES_AVAILABLE } from '../lib/progress'
import { daysUntil, isDue } from '../lib/srs'

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

  return (
    <div className="screen">
      <section className="stats" aria-label="Your progress">
        <div className="stat">
          <div className="label">Streak</div>
          <div className="stat-value">{progress.streak}<small>{progress.streak === 1 ? ' day' : ' days'}</small></div>
          <div className="note">{activeToday ? 'Today counts' : progress.streak ? 'Train today to keep it' : 'Train today to start'}</div>
        </div>
        <div className="stat">
          <div className="label">Level {progress.level.level}</div>
          <div className="stat-value">{progress.totalXp}<small> XP</small></div>
          <div className="bar" aria-label={`${progress.level.into} of ${progress.level.needed} XP to the next level`}>
            <span style={{ width: `${(progress.level.into / progress.level.needed) * 100}%` }} />
          </div>
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

      <section className="lines" aria-label="Repertoire">
        <div className="section-head">
          <h2>Repertoire</h2>
          <button type="button" onClick={() => go('import')}>Import PGN</button>
        </div>
        {rep.lines.map((line) => {
          const s = rep.srs.get(line.id)
          const status = !s ? 'New' : isDue(s, now) ? 'Due' : daysUntil(s, now) <= 1 ? 'Tomorrow' : `in ${daysUntil(s, now)} days`
          const cls = !s ? 'new' : isDue(s, now) ? 'due' : 'later'
          return (
            <article key={line.id} className="line-card">
              <div className="line-info">
                <h3>{line.title}</h3>
                <div className="meta">
                  <span className={`side side-${line.side}`}>{line.side === 'w' ? 'White' : 'Black'}</span>
                  <span>{line.moves.length} plies</span>
                  <span className={`status ${cls}`}>{status}</span>
                  {line.source === 'import' && <span>imported</span>}
                </div>
              </div>
              <div className="line-actions">
                <button type="button" onClick={() => go('learn/' + line.id)}>Learn</button>
                <button type="button" className="primary" onClick={() => go('drill/' + line.id)}>Drill</button>
              </div>
            </article>
          )
        })}
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
