import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomBar } from '../components/BottomBar'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import type { useProgress } from '../hooks/useProgress'
import { dateKey } from '../lib/progress'
import { longestStreak } from '../lib/trainingPath'
import { hasOwnPlayer } from '../lib/chesscom'
import { getGameRecords, type GameRecord } from '../lib/db'
import { mistakesByMonth, safeByWeek, thenNow, type Point } from '../lib/growth'
import { STATIONS, loadKing, mirrorOpen, route, stationById } from '../lib/king'
import { cachedRapid, loadRapid } from '../lib/ratingHistory'
import { nextCity, openCity } from '../lib/travel'
import { mineOf } from '../lib/trainingToday'
import { Donut } from './Training'
import '../training.css'

// Journey (Lu, 15.11.: tap "Journey" on the start page → "Diagramme, Analysen sinnvoll eingebunden, ohne den Nutzer
// zu erschlagen, optisch Spaß"): Hoppy says in one sentence how you are doing, the road of cities as coins, ONE chart
// at a time (Rating | Safe moves | Mistakes, real data only), then four analysis tiles.

const IMG = import.meta.env.BASE_URL + 'king/'
const HOPPY = IMG + 'hoppy.jpg'
const short = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const month = (t: number) => new Date(t).toLocaleDateString('en-GB', { month: 'short' })

type Tab = 'rating' | 'safe' | 'mistakes'

// 25.11.2026 (Lu: "durchgehendes Design, nichts doppelt, wie man sich verbessert hat will ich sehen"): this page is
// "Progress" – the 5th tab of the bottom bar. It took over the week (flames + XP, from the old Daily page) and the
// old "More" menu (section "More" at the bottom).
export function Journey({ puzzles, player, progress }: { puzzles: Puzzles; player: string; progress: ReturnType<typeof useProgress> }) {
  const [now] = useState(() => Date.now())
  // Monday … Sunday of this week: active days burn (was the Daily page #/today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i)
    const a = progress.days.get(dateKey(d))
    const active = !!a && a.lines + a.puzzles + (a.games ?? 0) + a.xp > 0
    return { label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), xp: a?.xp ?? 0, active, today: dateKey(d) === dateKey(new Date(now)), future: d.getTime() > now }
  })
  const weekXp = week.reduce((s, d) => s + d.xp, 0)
  const best = useMemo(() => longestStreak([...progress.days.values()].filter((d) => d.lines + d.puzzles + (d.games ?? 0) > 0).map((d) => d.date)), [progress.days])
  const [king] = useState(loadKing)
  const own = hasOwnPlayer()
  const cities = route().map((id) => stationById(id)!).filter(Boolean)
  const next = nextCity(king.beaten)
  const bosses = STATIONS.filter((s) => !s.finale).length
  const beaten = king.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length

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
  const [tab, setTab] = useState<Tab>('rating')

  // Hoppy's one sentence: the clearest real change, else where you are on the road
  const r = rapid ? thenNow(rapid) : null
  const sf = thenNow(safe)
  const say =
    r && Math.round(r.now - r.then) >= 10
      ? `Your rapid went up by ${Math.round(r.now - r.then)} since ${month(rapid![0].t)}!`
      : sf && Math.round(sf.now - sf.then) >= 2
        ? `You play ${Math.round(sf.now - sf.then)}% more safe moves than at the start!`
        : next
          ? `${beaten} cities done – ${next.name} is waiting for us.`
          : 'We travelled the whole world!'

  // the road scrolls to the next city
  const road = useRef<HTMLDivElement>(null)
  useEffect(() => {
    road.current?.querySelector('.jr-coin.jr-next')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [])

  return (
    <div className="trn jrn">
      <div className="trn-scroll">
        <div className="trn-in">
          <header className="trn-head">
            <div className="grow">
              <h1>Progress</h1>
              <p>How far you came</p>
            </div>
            <span className="trn-pill fire" title="Days in a row">🔥 {progress.streak}</span>
            <button type="button" className="trn-pill prg-gear" onClick={() => go('settings')} aria-label="Settings">⚙️</button>
          </header>

          <div className="jr-say">
            <img src={HOPPY} alt="Hoppy" />
            <span>{say}</span>
          </div>

          <div className="trn-card dly-week" aria-label={`This week: ${week.filter((d) => d.active).length} active days, ${weekXp} XP`}>
            <div className="dly-days">
              {week.map((d, i) => (
                <span key={i} className={`dly-day${d.active ? ' on' : ''}${d.today ? ' today' : ''}${d.future ? ' future' : ''}`}>
                  <i aria-hidden="true">{d.active ? '🔥' : ''}</i>
                  <small>{d.label}</small>
                </span>
              ))}
            </div>
            <div className="prg-week">
              <span><b>{weekXp.toLocaleString('en')}</b>XP this week</span>
              <span><b>{progress.streak}</b>{progress.streak === 1 ? 'day' : 'days'} in a row</span>
              <span><b>{Math.max(best, progress.streak)}</b>best streak</span>
              <span><b>{progress.level.level}</b>level</span>
            </div>
          </div>

          <div className="trn-sec"><h2>Your journey</h2><span className="prg-count">🗺 {beaten} / {bosses} cities</span></div>
          <div className="jr-road-card">
            <div className="jr-road" ref={road}>
              {cities.filter((c) => !c.finale).map((c, i) => {
                const done = king.beaten.includes(c.id)
                const isNext = next?.id === c.id
                return (
                  <button key={c.id} type="button" className={`jr-coin${done ? ' jr-done' : ''}${isNext ? ' jr-next' : ''}`} disabled={!done && !isNext} onClick={() => openCity(c.id)} aria-label={`${i + 1}. ${c.name}${done ? ', done' : isNext ? ', next' : ''}`}>
                    <img src={`${IMG}stamp-${c.id}.jpg`} alt="" loading="lazy" />
                    {done && <i aria-hidden="true">✓</i>}
                    <small>{c.name}</small>
                  </button>
                )
              })}
            </div>
            <div className="jr-road-go">
              <button type="button" className="btn sm ghost" onClick={() => go('journey')}>World map</button>
              <button type="button" className="btn sm ghost" onClick={() => go('road')}>Fast travel</button>
            </div>
          </div>

          <div className="trn-sec"><h2>Getting better?</h2></div>
          <div className="trn-card jr-chart">
            <div className="jr-tabs" role="tablist">
              {([['rating', 'Rating'], ['safe', 'Safe moves'], ['mistakes', 'Mistakes']] as [Tab, string][]).map(([k, t]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
              ))}
            </div>
            {tab === 'rating' &&
              (rapid ? (
                <Trend points={rapid} unit="" empty="Appears after two rated rapid games on chess.com." note="Your chess.com rapid rating after every rated game (12 months)." />
              ) : (
                <p className="trn-empty">{rapidFailed ? 'chess.com did not answer. Try again later.' : 'Loading your games from chess.com …'}</p>
              ))}
            {tab === 'safe' && <Trend points={safe} unit="%" empty="Appears when Hoppy has checked your games of two weeks." note="Moves that lose less than 2 pawns, per week. Higher is better." />}
            {tab === 'mistakes' && <Bars points={mistakes} />}
          </div>

          <div className="trn-sec"><h2>Your analyses</h2></div>
          {/* Lu, 15.11.: "das Kreisdiagramm fand ich ganz nice" – the mistakes of your games by type; tap = My weaknesses */}
          <button type="button" className="trn-card jr-donut" onClick={() => go('weaknesses')} aria-label="Mistakes by type – open My weaknesses">
            <h4>Mistakes by type <span className="trn-chip">your games</span></h4>
            <span className="jr-donut-in"><Donut puzzles={mineOf(puzzles.puzzles, player)} /></span>
          </button>
          <div className="jr-tiles">
            <button type="button" className="jr-tile t-blue" onClick={() => go(own ? 'games' : 'connect')}>
              <span className="e">♟</span><b>{records.length || '–'}</b><small>{own ? 'games checked' : 'Connect chess.com'}</small>
            </button>
            <button type="button" className="jr-tile t-red" onClick={() => go('weaknesses')}>
              <span className="e">🧩</span><b>Weak spots</b><small>Rules and examples</small>
            </button>
            <button type="button" className="jr-tile t-green" onClick={() => go('check')}>
              <span className="e">🔍</span><b>Check</b><small>What costs you points?</small>
            </button>
            <button type="button" className="jr-tile t-sun" onClick={() => go('trophies')}>
              <span className="e">🏆</span><b>Trophies</b><small>What you have won</small>
            </button>
          </div>

          {/* the old "More" menu of the bottom bar – everything that is not training lives here now */}
          <div className="trn-sec"><h2>More</h2></div>
          <div className="prg-more">
            <button type="button" onClick={() => go('diary')}><span>📔</span>Hoppy’s diary</button>
            <button type="button" onClick={() => go('quests')}><span>📖</span>Quest book</button>
            <button type="button" onClick={() => go(king.beaten.includes('kannauj') ? 'portal' : 'check')}><span>🌀</span>Real world</button>
            <button type="button" onClick={() => go('painted')}><span>🎨</span>The painted map</button>
            {mirrorOpen(king.beaten) && <button type="button" onClick={() => go('mirror')}><span>🪞</span>Mirror World</button>}
            <button type="button" onClick={() => go('watch')}><span>👫</span>Together</button>
            <button type="button" onClick={() => go('accuracy')}><span>📊</span>How well did I play? (test)</button>
            <button type="button" onClick={() => go('settings')}><span>⚙️</span>Settings</button>
          </div>
        </div>
      </div>
      <BottomBar active="progress" />
    </div>
  )
}

// one line over time, with "then → now" in big numbers above it
function Trend({ points, unit, empty, note }: { points: Point[]; unit: string; empty: string; note: string }) {
  const tn = thenNow(points)
  if (!tn) return <p className="trn-empty">{empty}</p>
  const vals = points.map((p) => p.v)
  const pad = Math.max((Math.max(...vals) - Math.min(...vals)) * 0.15, unit === '%' ? 2 : 10)
  const lo = Math.floor(Math.min(...vals) - pad)
  const top = unit === '%' ? Math.min(Math.ceil(Math.max(...vals) + pad), 100) : Math.ceil(Math.max(...vals) + pad)
  const L = 8, R = 332, T0 = 10, B = 118
  const y = (v: number) => B - ((v - lo) / (top - lo || 1)) * (B - T0)
  const x = (i: number) => L + (i * (R - L)) / Math.max(points.length - 1, 1)
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = vals.length - 1
  const d = tn.now - tn.then
  const fmt = (v: number) => `${Math.round(v)}${unit}`
  const many = points.length > 16
  return (
    <>
      <div className="jr-tn">
        <span><small>then</small><b>{fmt(tn.then)}</b></span>
        <span className="arr">→</span>
        <span><small>now</small><b>{fmt(tn.now)}</b></span>
        {Math.round(Math.abs(d)) >= 1 && <span className={`jr-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲ +' : '▼ −'}{fmt(Math.abs(d))}</span>}
      </div>
      <svg viewBox="0 0 340 140" width="100%" role="img" aria-label={`From ${fmt(tn.then)} to ${fmt(tn.now)}`}>
        <defs><linearGradient id="jr-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5cf6" stopOpacity=".35" /><stop offset="1" stopColor="#8a5cf6" stopOpacity="0" /></linearGradient></defs>
        <line x1={L} x2={R} y1={B} y2={B} stroke="var(--line)" strokeWidth="1.5" />
        <polygon points={`${x(0)},${B} ${pts} ${x(last)},${B}`} fill="url(#jr-ga)" />
        <polyline points={pts} fill="none" stroke="var(--grape)" strokeWidth={many ? 2.5 : 3.5} strokeLinejoin="round" strokeLinecap="round" />
        {!many && vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke="var(--grape)" strokeWidth="2.5" />)}
        <circle cx={x(last)} cy={y(vals[last])} r="6.5" fill="var(--grape)" stroke="#fff" strokeWidth="2.5" />
        <text x={L} y={B + 18} fontSize="10.5" fontWeight="800" fill="var(--muted)">{short(points[0].t)}</text>
        <text x={R} y={B + 18} textAnchor="end" fontSize="10.5" fontWeight="800" fill="var(--muted)">{short(points[last].t)}</text>
      </svg>
      <p className="jrn-note">{note} Then/now = average of the first and the last quarter.</p>
    </>
  )
}

// big mistakes per game, per month: bars, the newest one strong
function Bars({ points }: { points: Point[] }) {
  if (!points.length) return <p className="trn-empty">Appears when Hoppy has checked at least 3 of your games in a month.</p>
  const list = points.slice(-6)
  const max = Math.max(...list.map((p) => p.v), 0.1)
  const B = 96, W = 340
  const step = W / list.length
  const bw = Math.min(40, step * 0.6)
  const tn = thenNow(list)
  const d = tn ? tn.now - tn.then : 0
  return (
    <>
      {tn && (
        <div className="jr-tn">
          <span><small>then</small><b>{tn.then.toFixed(1)}</b></span>
          <span className="arr">→</span>
          <span><small>now</small><b>{tn.now.toFixed(1)}</b></span>
          {Math.abs(d) >= 0.1 && <span className={`jr-delta ${d < 0 ? 'up' : 'down'}`}>{d < 0 ? '▼ −' : '▲ +'}{Math.abs(d).toFixed(1)}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} 128`} width="100%" role="img" aria-label={`Big mistakes per game: ${list.map((p) => `${month(p.t)} ${p.v}`).join(', ')}`}>
        <line x1="0" x2={W} y1={B} y2={B} stroke="var(--line)" strokeWidth="1.5" />
        {list.map((p, i) => {
          const h = Math.max((p.v / max) * (B - 22), 3)
          const cx = step * i + step / 2
          return (
            <g key={p.t}>
              <rect x={cx - bw / 2} y={B - h} width={bw} height={h} rx="8" fill={i === list.length - 1 ? 'var(--grape)' : '#c4adfb'} />
              <text x={cx} y={B - h - 6} textAnchor="middle" fontSize="11.5" fontWeight="900" fill="var(--text)">{p.v.toFixed(1)}</text>
              <text x={cx} y={B + 15} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="var(--muted)">{month(p.t)}</text>
              <text x={cx} y={B + 28} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted)">{p.n} games</text>
            </g>
          )
        })}
      </svg>
      <p className="jrn-note">Big mistakes (losing 2+ pawns) per game, per month. Fewer is better.</p>
    </>
  )
}
