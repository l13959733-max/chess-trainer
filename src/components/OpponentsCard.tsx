import { useEffect, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { computeStats, recentOpenings, type OpponentStats } from '../lib/opponents'
import type { Line } from '../lib/pgn'
import type { SrsState } from '../lib/srs'

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

  if (state === 'loading') return <section className="opp-card"><div className="label">What your opponents play</div><p className="note small">Looking at your recent chess.com games …</p></section>
  if (state === 'error' || !stats || !stats.games) return null

  const pct = (n: number, of: number) => Math.round((100 * n) / of)
  const totalW = stats.firstMoves.w.reduce((s, x) => s + x.games, 0)
  const totalB = stats.firstMoves.b.reduce((s, x) => s + x.games, 0)
  const next = stats.chapters.filter((c) => c.learned < c.total).slice(0, 3)

  return (
    <section className="opp-card" aria-label="What your opponents play">
      <div className="label">What your opponents play · last 3 months · {stats.games} games</div>
      {totalW > 0 && (
        <div className="opp-row">
          <span className="opp-head">You have White, they answer:</span>
          <div className="opp-chips">
            {stats.firstMoves.w.slice(0, 5).map((m) => (
              <span key={m.san} className="opp-chip">1...{m.san} <b>{pct(m.games, totalW)}%</b></span>
            ))}
          </div>
        </div>
      )}
      {totalB > 0 && (
        <div className="opp-row">
          <span className="opp-head">You have Black, they start:</span>
          <div className="opp-chips">
            {stats.firstMoves.b.slice(0, 4).map((m) => (
              <span key={m.san} className="opp-chip">1.{m.san} <b>{pct(m.games, totalB)}%</b></span>
            ))}
          </div>
        </div>
      )}
      {next.length > 0 && (
        <>
          <div className="label">Learn next – it comes up a lot</div>
          {next.map((c) => (
            <button key={c.key} type="button" className="opp-next" onClick={() => onOpen([c.key])}>
              <span className={`side-dot ${c.side === 'b' ? 'black' : 'white'}`} aria-hidden="true" />
              <span>
                <b>{c.title}</b>
                <small>{c.games} of your games · you know {c.learned} of {c.total} lines</small>
              </span>
              <span className="chevron" aria-hidden="true">▸</span>
            </button>
          ))}
        </>
      )}
      {stats.detours.length > 0 && (
        <>
          <div className="label">Where you leave your lines</div>
          {stats.detours.slice(0, 3).map((d) => (
            <button key={d.lineId + d.played} type="button" className="opp-next" onClick={() => go('drill/' + d.lineId)}>
              <span className="opp-x" aria-hidden="true">↺</span>
              <span>
                <b>{d.moveNo}{d.played}</b> instead of <b>{d.moveNo}{d.expected}</b> ({d.games}×)
                <small>{d.lineTitle} – practise it</small>
              </span>
              <span className="chevron" aria-hidden="true">▸</span>
            </button>
          ))}
        </>
      )}
    </section>
  )
}
