import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import { daysUntil, isDue } from '../lib/srs'

export function Home({ rep }: { rep: Repertoire }) {
  const now = Date.now()
  const due = rep.lines.filter((l) => isDue(rep.srs.get(l.id), now))
  const fresh = rep.lines.filter((l) => !rep.srs.get(l.id))
  const upcoming = rep.lines
    .map((l) => rep.srs.get(l.id))
    .filter((s) => s && !isDue(s, now))
    .map((s) => daysUntil(s!, now))
    .sort((a, b) => a - b)[0]

  return (
    <div className="screen">
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

      <section className="tiles" aria-label="Coming soon">
        <div className="tile">
          <div className="label">Daily goal · Streak</div>
          <div className="note">coming in step 3</div>
        </div>
        <div className="tile">
          <div className="label">Blunder puzzles</div>
          <div className="note">coming in step 4</div>
        </div>
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
