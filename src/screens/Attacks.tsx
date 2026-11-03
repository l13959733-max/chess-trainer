import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import { THEMES } from '../lib/attacks'
import type { Line } from '../lib/pgn'
import { lineResult } from '../lib/srs'
import { t } from '../lib/i18n'

// Every famous attack or trap next to its defense: learn to play it, and learn not to fall for it.
export function Attacks({ rep }: { rep: Repertoire }) {
  const byTitle = new Map(rep.lines.map((l) => [l.title, l]))
  const now = Date.now()
  const row = (l: Line | undefined) =>
    l && (
      <div key={l.id} className="attack-line">
        <span className={`side-dot ${l.side === 'b' ? 'black' : 'white'}`} aria-hidden="true" />
        <span className="hit-title">
          {t(l.title)}
          <small>{l.side === 'w' ? t('You play White') : t('You play Black')}{lineResult(rep.srs.get(l.id), now).kind === 'perfect' ? t(' · ✓ perfect') : ''}</small>
        </span>
        <button type="button" onClick={() => go('learn/' + l.id)}>{t('Learn')}</button>
        <button type="button" className="primary" onClick={() => go('drill/' + l.id)}>{t('Play')}</button>
      </div>
    )
  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label={t('Back to overview')}>←</button>
        <div>
          <div className="eyebrow">{THEMES.length} {t('famous attacks and traps')}</div>
          <h2>{t('Attacks & Traps')}</h2>
        </div>
      </div>
      <div className="greet">
        <Mascot mood="happy" />
        {t('Learn the attack – and learn the defense, so it never happens to you!')}
      </div>
      {THEMES.map((theme) => (
        <section key={theme.name} className="play-card attack-card">
          <div className="attack-name">{t(theme.name)}</div>
          <p className="note">{t(theme.about)}</p>
          {theme.attack.length > 0 && <div className="label">{t('⚔️ Attack')}</div>}
          {theme.attack.map((x) => row(byTitle.get(x)))}
          {theme.defense.length > 0 && <div className="label">{t('🛡 Defense')}</div>}
          {theme.defense.map((x) => row(byTitle.get(x)))}
        </section>
      ))}
    </div>
  )
}
