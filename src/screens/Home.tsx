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
        <div className="label">Fällige Linien</div>
        <div className="big">{rep.ready ? due.length : '…'}</div>
        {due.length > 0 ? (
          <button type="button" className="primary wide" onClick={() => go('wiederholen')}>
            Jetzt wiederholen
          </button>
        ) : (
          <p className="note">
            {fresh.length > 0
              ? `Nichts fällig. ${fresh.length} neue Linien warten – lerne eine und spiel sie im Drill.`
              : upcoming !== undefined
                ? `Nichts fällig. Nächste Wiederholung ${upcoming <= 1 ? 'morgen' : `in ${upcoming} Tagen`}.`
                : 'Nichts fällig.'}
          </p>
        )}
      </section>

      <section className="tiles" aria-label="Kommt bald">
        <div className="tile">
          <div className="label">Tagesziel · Streak</div>
          <div className="note">ab Schritt 3</div>
        </div>
        <div className="tile">
          <div className="label">Blunder-Puzzles</div>
          <div className="note">ab Schritt 4</div>
        </div>
      </section>

      <section className="lines" aria-label="Repertoire">
        <div className="section-head">
          <h2>Repertoire</h2>
          <button type="button" onClick={() => go('import')}>PGN importieren</button>
        </div>
        {rep.lines.map((line) => {
          const s = rep.srs.get(line.id)
          const status = !s ? 'Neu' : isDue(s, now) ? 'Fällig' : daysUntil(s, now) <= 1 ? 'Morgen' : `in ${daysUntil(s, now)} Tagen`
          const cls = !s ? 'new' : isDue(s, now) ? 'due' : 'later'
          return (
            <article key={line.id} className="line-card">
              <div className="line-info">
                <h3>{line.title}</h3>
                <div className="meta">
                  <span className={`side side-${line.side}`}>{line.side === 'w' ? 'Weiß' : 'Schwarz'}</span>
                  <span>{line.moves.length} Halbzüge</span>
                  <span className={`status ${cls}`}>{status}</span>
                  {line.source === 'import' && <span>importiert</span>}
                </div>
              </div>
              <div className="line-actions">
                <button type="button" onClick={() => go('lernen/' + line.id)}>Lernen</button>
                <button type="button" className="primary" onClick={() => go('drill/' + line.id)}>Drill</button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
