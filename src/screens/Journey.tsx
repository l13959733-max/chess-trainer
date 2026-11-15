import { useEffect, useMemo, useState } from 'react'
import { BottomBar } from '../components/BottomBar'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import { hasOwnPlayer } from '../lib/chesscom'
import { getGameRecords, type GameRecord } from '../lib/db'
import { mistakesByMonth, safeByWeek, thenNow, type Point } from '../lib/growth'
import { STATIONS, loadKing, route, stationById } from '../lib/king'
import { loadDiary, when } from '../lib/lessons'
import { cachedRapid, loadRapid } from '../lib/ratingHistory'
import { nextCity, openCity } from '../lib/travel'
import { mineOf } from '../lib/trainingToday'
import { Donut, T, XpBars } from './Training'
import '../training.css'

// Journey (Lu, 15.11.: "in Journey anhand von Diagrammen zeigen, inwiefern sich mein Schach verbessert hat"):
// how far you travelled, then three charts from your real chess.com games – safe moves per week, the rapid
// rating, big mistakes per game – each with "then → now". Below: your own games, Hoppy's diary, trophies.
// The start page's Journey field opens it; today's tasks live in Daily (= Training).

const IMG = import.meta.env.BASE_URL + 'king/'
type Prog = ReturnType<typeof useProgress>

const short = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const month = (t: number) => new Date(t).toLocaleDateString('en-GB', { month: 'short' })

export function Journey({ progress, puzzles, player }: { progress: Prog; puzzles: Puzzles; player: string }) {
  const [king] = useState(loadKing)
  const [now] = useState(() => Date.now())
  const own = hasOwnPlayer()
  const cities = route().map((id) => stationById(id)!).filter(Boolean)
  const next = nextCity(king.beaten)
  const bosses = STATIONS.filter((s) => !s.finale).length
  const beaten = king.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length
  const [diary] = useState(loadDiary)

  const [records, setRecords] = useState<GameRecord[]>([])
  const [rapid, setRapid] = useState<Point[] | null>(() => cachedRapid(player))
  const [rapidFailed, setRapidFailed] = useState(false)
  useEffect(() => {
    let gone = false
    getGameRecords(player).then((r) => !gone && setRecords(r)).catch(() => {})
    loadRapid(player)
      .then((p) => !gone && setRapid(p))
      .catch(() => !gone && setRapidFailed(true))
    return () => {
      gone = true
    }
  }, [player])

  const safe = useMemo(() => safeByWeek(records), [records])
  const mistakes = useMemo(() => mistakesByMonth(records), [records])

  return (
    <div className="trn jrn">
      <div className="trn-scroll">
        <div className="trn-in">
          <header className="trn-head">
            <div className="grow">
              <h1>Journey</h1>
              <p>How far you came – and is your chess getting better?</p>
            </div>
          </header>

          <button type="button" className="trn-unit" onClick={() => (next ? openCity(next.id) : go('journey'))} aria-label={next ? `Open ${next.name}` : 'Open the world map'}>
            <img src={`${IMG}${next?.id ?? 'chennai'}.jpg`} alt="" />
            <span className="in">
              <span style={{ flex: 1, minWidth: 0 }}>
                <small>{next ? `Chapter ${cities.indexOf(next) + 1} · next city` : 'The whole world travelled'}</small>
                <span className="h3">{next ? `${next.name}, ${next.year}` : 'Chennai'}</span>
              </span>
              <span className="stars">{beaten} / {bosses} cities</span>
            </span>
          </button>
          <div className="jrn-row">
            <button type="button" className="btn sm ghost" onClick={() => go('journey')}>🗺 World map</button>
            <button type="button" className="btn sm ghost" onClick={() => go('road')}>🚀 Fast travel</button>
          </div>

          <div className="trn-sec"><h2>Your chess</h2></div>
          {!own && records.length === 0 ? (
            <button type="button" className="trn-cc" onClick={() => go('connect')}>
              <span className="row"><span className="trn-av">♟</span><span className="tx"><b>Connect chess.com</b><small>The charts come from your real games.</small></span></span>
            </button>
          ) : null}

          <div className="trn-card">
            <h4>Safe moves <span className="trn-chip">per week</span></h4>
            <Trend points={safe} unit="%" better="up" empty="Appears when Hoppy has checked your games of two weeks (at least 2 games a week)." label={(p) => short(p.t)} />
            <p className="jrn-note">Moves that lose less than 2 pawns. Higher is better. Then/now = average of your first and your last weeks.</p>
          </div>

          <div className="trn-card">
            <h4>Rapid rating <span className="trn-chip">chess.com</span></h4>
            {rapid ? (
              <>
                <Trend points={rapid} unit="" better="up" empty="Appears after two rated rapid games." label={(p) => short(p.t)} dots={false} />
                <p className="jrn-note">After every rated rapid game of the last 12 months. Then/now = average of your first and your last quarter of games.</p>
              </>
            ) : (
              <p className="trn-empty">{rapidFailed ? 'chess.com did not answer. Try again later.' : 'Loading your games from chess.com …'}</p>
            )}
          </div>

          <div className="trn-card">
            <h4>Big mistakes per game <span className="trn-chip">per month</span></h4>
            <Bars points={mistakes} empty="Appears when Hoppy has checked at least 3 games in a month." />
            <p className="jrn-note">Fewer is better.</p>
          </div>

          <div className="trn-two">
            <div className="trn-card">
              <h4>Mistakes by type</h4>
              <Donut puzzles={mineOf(puzzles.puzzles, player)} />
            </div>
            <div className="trn-card">
              <h4>XP this week</h4>
              <XpBars days={progress.days} now={now} />
            </div>
          </div>

          <div className="trn-sec"><h2>Your own games</h2></div>
          <button type="button" className="trn-cc" onClick={() => go(own ? 'games' : 'connect')}>
            <span className="row"><span className="trn-av">♟</span><span className="tx"><b>Your chess.com games</b><small>{records.length ? `${records.length} games checked by Hoppy` : 'Every finished game, checked by Hoppy'}</small></span></span>
          </button>
          <div className="trn-shelf"><div className="trn-tools">
            <T e="🔍" bg="var(--red-t)" title="Check your chess" sub="What costs you points?" to="check" />
            <T e="🧩" bg="var(--red-t)" title="My weaknesses" sub="By type" to="weaknesses" />
            <T e="📊" bg="var(--red-t)" title="How well did I play?" sub="Test" to="accuracy" />
            <T e="🏆" bg="var(--sun-t)" title="Trophies" sub="What you have won" to="trophies" />
          </div></div>

          <div className="trn-sec"><h2>Hoppy’s diary</h2></div>
          <div className="trn-card">
            {diary.length ? (
              <div className="trn-act">
                {diary.slice(0, 6).map((d) => (
                  <div className="it" key={d.id}>
                    <span className="ok" style={{ background: 'var(--grape-t)', color: 'var(--grape-d)' }}>✎</span>
                    <div><b>{d.city}</b><small>{d.text}</small></div>
                    <span className="jrn-when">{when(d.at, now)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="jrn-quote">“A king is not born. He is made – move by move.” <small>– Grandmaster Lu</small></p>
            )}
          </div>
        </div>
      </div>
      <BottomBar active="journey" />
    </div>
  )
}

// a line over time with "then → now" above it
function Trend({ points, unit, better, empty, label, dots = true }: { points: Point[]; unit: string; better: 'up' | 'down'; empty: string; label: (p: Point) => string; dots?: boolean }) {
  const tn = thenNow(points)
  if (!tn) return <p className="trn-empty">{empty}</p>
  const vals = points.map((p) => p.v)
  const span = Math.max(...vals) - Math.min(...vals)
  const pad = Math.max(span * 0.15, unit === '%' ? 2 : 10)
  const lo = Math.floor(Math.min(...vals) - pad)
  const hi = Math.ceil(Math.max(...vals) + pad)
  const top = unit === '%' ? Math.min(hi, 100) : hi
  const L = 38, R = 330, T0 = 10, B = 120
  const y = (v: number) => B - ((v - lo) / (top - lo || 1)) * (B - T0)
  const x = (i: number) => L + (i * (R - L)) / Math.max(points.length - 1, 1)
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = vals.length - 1
  const d = tn.now - tn.then
  const good = better === 'up' ? d > 0 : d < 0
  const fmt = (v: number) => (unit === '%' ? `${Math.round(v)}%` : `${Math.round(v)}`)
  return (
    <>
      <div className="jrn-tn">
        <span>then <b>{fmt(tn.then)}</b></span>
        <span className="arr">→</span>
        <span>now <b>{fmt(tn.now)}</b></span>
        {Math.round(Math.abs(d)) >= 1 && <span className={`jrn-delta ${good ? 'up' : 'down'}`}>{d > 0 ? '+' : '−'}{fmt(Math.abs(d))}</span>}
      </div>
      <svg viewBox="0 0 340 145" width="100%" role="img" aria-label={`From ${fmt(tn.then)} to ${fmt(tn.now)}`}>
        <defs><linearGradient id="jrn-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5cf6" stopOpacity=".3" /><stop offset="1" stopColor="#8a5cf6" stopOpacity="0" /></linearGradient></defs>
        {[lo, Math.round((lo + top) / 2), top].map((v) => (
          <g key={v}>
            <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1.5" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fontWeight="800" fill="var(--muted)">{fmt(v)}</text>
          </g>
        ))}
        <polygon points={`${x(0)},${B} ${pts} ${x(last)},${B}`} fill="url(#jrn-ga)" />
        <polyline points={pts} fill="none" stroke="var(--grape)" strokeWidth={dots ? 3 : 2.5} strokeLinejoin="round" />
        {dots && vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 5 : 3.5} fill={i === last ? 'var(--grape)' : '#fff'} stroke="var(--grape)" strokeWidth="2.5" />)}
        {!dots && <circle cx={x(last)} cy={y(vals[last])} r="5" fill="var(--grape)" />}
        {[0, Math.floor(last / 2), last].filter((i, k, a) => a.indexOf(i) === k).map((i) => (
          <text key={i} x={x(i)} y={B + 18} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize="10.5" fontWeight="800" fill="var(--muted)">{label(points[i])}</text>
        ))}
      </svg>
    </>
  )
}

// bars per month, the newest one strong
function Bars({ points, empty }: { points: Point[]; empty: string }) {
  if (points.length < 1) return <p className="trn-empty">{empty}</p>
  const list = points.slice(-8)
  const max = Math.max(...list.map((p) => p.v), 0.1)
  const B = 96, W = 340
  const step = W / list.length
  const bw = Math.min(34, step * 0.55)
  const tn = thenNow(list)
  return (
    <>
      {tn && (
        <div className="jrn-tn">
          <span>then <b>{tn.then.toFixed(1)}</b></span>
          <span className="arr">→</span>
          <span>now <b>{tn.now.toFixed(1)}</b></span>
          {Math.abs(tn.now - tn.then) >= 0.1 && <span className={`jrn-delta ${tn.now < tn.then ? 'up' : 'down'}`}>{tn.now < tn.then ? '−' : '+'}{Math.abs(tn.now - tn.then).toFixed(1)}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} 128`} width="100%" role="img" aria-label={`Big mistakes per game: ${list.map((p) => `${month(p.t)} ${p.v}`).join(', ')}`}>
        <line x1="0" x2={W} y1={B} y2={B} stroke="var(--line)" strokeWidth="1.5" />
        {list.map((p, i) => {
          const h = (p.v / max) * (B - 22)
          const cx = step * i + step / 2
          return (
            <g key={p.t}>
              <rect x={cx - bw / 2} y={B - h} width={bw} height={h} rx="6" fill={i === list.length - 1 ? 'var(--grape)' : '#c4adfb'} />
              <text x={cx} y={B - h - 6} textAnchor="middle" fontSize="11" fontWeight="900" fill="var(--text)">{p.v.toFixed(1)}</text>
              <text x={cx} y={B + 15} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="var(--muted)">{month(p.t)}</text>
              <text x={cx} y={B + 28} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted)">{p.n} {p.n === 1 ? 'game' : 'games'}</text>
            </g>
          )
        })}
      </svg>
    </>
  )
}
