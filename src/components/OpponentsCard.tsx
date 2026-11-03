import { useEffect, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { computeStats, recentOpenings, type OpponentStats } from '../lib/opponents'
import type { Line } from '../lib/pgn'
import type { SrsState } from '../lib/srs'
import { t, notation } from '../lib/i18n'

// What people actually play against you lately – and what to learn next because of it
export function OpponentsCard({ player, lines, srs, onOpen }: { player: string; lines: Line[]; srs: Map<string, SrsState>; onOpen: (keys: string[]) => void }) {
  const [stats, setStats] = useState<OpponentStats | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    recentOpenings(player)
      .then((o) => {
        if (!alive) return
        setStats(computeStats(o, lines, (id) => !!srs.get(id)))
        setState('ready')
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [player, lines, srs])

  if (state === 'loading') return <section className="opp-card"><div className="label">{t('What your opponents play')}</div><p className="note small">{t('Looking at your recent chess.com games …')}</p></section>
  if (state === 'error' || !stats || !stats.games) return null

  const pct = (n: number, of: number) => Math.round((100 * n) / of)
  const totalW = stats.firstMoves.w.reduce((s, x) => s + x.games, 0)
  const totalB = stats.firstMoves.b.reduce((s, x) => s + x.games, 0)
  const next = stats.chapters.filter((c) => c.learned < c.total).slice(0, 3)

  return (
    <section className="opp-card" aria-label={t('What your opponents play')}>
      <div className="label">{t('What your opponents play · last 3 months ·')} {stats.games} {t('games')}</div>
      {totalW > 0 && (
        <div className="opp-row">
          <span className="opp-head">{t('You have White, they answer:')}</span>
          <div className="opp-chips">
            {stats.firstMoves.w.slice(0, 5).map((m) => (
              <span key={m.san} className="opp-chip">1...{notation(m.san)} <b>{pct(m.games, totalW)}%</b></span>
            ))}
          </div>
        </div>
      )}
      {totalB > 0 && (
        <div className="opp-row">
          <span className="opp-head">{t('You have Black, they start:')}</span>
          <div className="opp-chips">
            {stats.firstMoves.b.slice(0, 4).map((m) => (
              <span key={m.san} className="opp-chip">1.{notation(m.san)} <b>{pct(m.games, totalB)}%</b></span>
            ))}
          </div>
        </div>
      )}
      {next.length > 0 && (
        <>
          <div className="label">{t('Learn next – it comes up a lot')}</div>
          {next.map((c) => (
            <button key={c.key} type="button" className="opp-next" onClick={() => onOpen([c.key])}>
              <span className={`side-dot ${c.side === 'b' ? 'black' : 'white'}`} aria-hidden="true" />
              <span>
                <b>{t(c.title)}</b>
                <small>{t('{games} of your games · you know {learned} of {total} lines', { games: c.games, learned: c.learned, total: c.total })}</small>
              </span>
              <span className="chevron" aria-hidden="true">▸</span>
            </button>
          ))}
        </>
      )}
      {stats.detours.length > 0 && (
        <>
          <div className="label">{t('Where you leave your lines')}</div>
          {stats.detours.slice(0, 3).map((d) => (
            <button key={d.lineId + d.played} type="button" className="opp-next" onClick={() => go('drill/' + d.lineId)}>
              <span className="opp-x" aria-hidden="true">↺</span>
              <span>
                <b>{d.moveNo}{notation(d.played)}</b> {t('instead of')} <b>{d.moveNo}{notation(d.expected)}</b> ({d.games}×)
                <small>{t(d.lineTitle)} {t('– practise it')}</small>
              </span>
              <span className="chevron" aria-hidden="true">▸</span>
            </button>
          ))}
        </>
      )}
    </section>
  )
}
