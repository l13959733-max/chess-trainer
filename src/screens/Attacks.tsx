import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import { THEMES } from '../lib/attacks'
import type { Line } from '../lib/pgn'
import { lineResult } from '../lib/srs'

// Every famous attack or trap next to its defense: learn to play it, and learn not to fall for it.
export function Attacks({ rep }: { rep: Repertoire }) {
  const byTitle = new Map(rep.lines.map((l) => [l.title, l]))
  const now = Date.now()
  const row = (l: Line | undefined) =>
    l && (
      <div key={l.id} className="attack-line">
        <span className={`side-dot ${l.side === 'b' ? 'black' : 'white'}`} aria-hidden="true" />
        <span className="hit-title">
          {l.title}
          <small>{l.side === 'w' ? 'You play White' : 'You play Black'}{lineResult(rep.srs.get(l.id), now).kind === 'perfect' ? ' · ✓ perfect' : ''}</small>
        </span>
        <button type="button" onClick={() => go('learn/' + l.id)}>Learn</button>
        <button type="button" className="primary" onClick={() => go('drill/' + l.id)}>Play</button>
      </div>
    )
  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">{THEMES.length} famous attacks and traps</div>
          <h2>Attacks & Traps</h2>
        </div>
      </div>
      <div className="greet">
        <Mascot mood="happy" />
        Learn the attack – and learn the defense, so it never happens to you!
      </div>
      {THEMES.map((t) => (
        <section key={t.name} className="play-card attack-card">
          <div className="attack-name">{t.name}</div>
          <p className="note">{t.about}</p>
          {t.attack.length > 0 && <div className="label">⚔️ Attack</div>}
          {t.attack.map((x) => row(byTitle.get(x)))}
          {t.defense.length > 0 && <div className="label">🛡 Defense</div>}
          {t.defense.map((x) => row(byTitle.get(x)))}
        </section>
      ))}
    </div>
  )
}
