import { useEffect, useMemo, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { fetchArchives, fetchMonth, type ChessComGame } from '../lib/chesscom'
import { getGameRecords, type GameRecord, type Puzzle } from '../lib/db'
import { buildGames, sessions, stats, weekly, windows, type Kind, type PGame, type Range } from '../lib/progressStats'

// The visual Progress page (prototype, Lu 25.11.2026: "Statistik visuell, alles"): at a glance where, how and when you
// got better or worse – Hoppy's sentence, four numbers with their trend, "better or worse?" in mistakes per 10 games,
// charts for rating, safe moves, where/what/when the mistakes happen, openings and habits. Real data only.
type Tab = 'overview' | 'mistakes' | 'openings' | 'habits'
const W = 360
const fmtDate = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const pct = (x: number) => `${Math.round(x * 100)}%`
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const mean = (a: number[]) => (a.length ? sum(a) / a.length : null)

function useGames(player: string, puzzles: Puzzle[]) {
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [records, setRecords] = useState<GameRecord[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let gone = false
    getGameRecords(player).then((r) => !gone && setRecords(r)).catch(() => {})
    fetchArchives(player)
      .then((months) => Promise.all(months.slice(-12).map((m) => fetchMonth(m).catch(() => [] as ChessComGame[]))))
      .then((all) => !gone && setGames(all.flat()))
      .catch(() => !gone && setFailed(true))
    return () => {
      gone = true
    }
  }, [player])
  const G = useMemo(() => (games ? buildGames(games, player, records, puzzles) : null), [games, player, records, puzzles])
  return { G, failed }
}

export function ProgressViz({ player, puzzles }: { player: string; puzzles: Puzzle[] }) {
  const { G, failed } = useGames(player, puzzles)
  const [range, setRange] = useState<Range>('3m')
  const [tab, setTab] = useState<Tab>('overview')
  const [color, setColor] = useState<'w' | 'b'>('w')
  if (!G) return <p className="pv-note">{failed ? 'chess.com did not answer. Try again later.' : 'Loading your games from chess.com …'}</p>
  if (!G.length) return <p className="pv-note">No rapid games on chess.com yet.</p>
  const w = windows(G, range)
  const S = w.shown
  const C = stats(w.now), P = stats(w.before)
  return (
    <div className="pv">
      <div className="pv-seg" role="group" aria-label="Time range">
        {(['4w', '3m', 'all'] as Range[]).map((r) => (
          <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r === '4w' ? '4 weeks' : r === '3m' ? '3 months' : 'Everything'}</button>
        ))}
      </div>
      <div className="pv-tabs" role="tablist">
        {(['overview', 'mistakes', 'openings', 'habits'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {C.checked === 0 && tab !== 'openings' && tab !== 'habits' && (
        <div className="pv-card pv-empty">
          <b>Hoppy has not checked your games in this range yet</b>
          <span>Rating, openings and habits work already. For the mistake numbers, let Hoppy check your games.</span>
          <button type="button" className="pv-go" onClick={() => go('connect')}>Check my games</button>
        </div>
      )}
      {tab === 'overview' && <Overview S={S} C={C} P={P} label={w.label} />}
      {tab === 'mistakes' && <Mistakes S={S} C={C} P={P} label={w.label} byMonth={range !== '4w'} />}
      {tab === 'openings' && <Openings S={S} color={color} setColor={setColor} />}
      {tab === 'habits' && <Habits S={S} />}
    </div>
  )
}

// ---------------- overview ----------------
type St = ReturnType<typeof stats>
const ROWS: [string, (s: St) => number][] = [
  ['Opening mistakes', (s) => s.phase('o')],
  ['Middlegame mistakes', (s) => s.phase('m')],
  ['Endgame mistakes', (s) => s.phase('e')],
  ['Hung a piece', (s) => s.kind(['h'])],
  ['Ignored a threat', (s) => s.kind(['i', 'u'])],
  ['Walked into a tactic', (s) => s.kind(['t', 'a'])],
  ['Missed a win', (s) => s.kind(['f', 'm', 'M'])],
  ['Mistakes in time trouble', (s) => s.trouble],
  ['Lost on time', (s) => s.timeout],
]
function Overview({ S, C, P, label }: { S: PGame[]; C: St; P: St; label: string }) {
  const comparable = C.checked >= 10 && P.checked >= 10
  const rows = comparable ? ROWS.map(([name, f]) => ({ name, now: f(C) * 10, before: f(P) * 10 })).map((r) => ({ ...r, d: r.now - r.before })).sort((a, b) => a.d - b.d) : []
  const span = Math.max(1, ...rows.map((r) => Math.abs(r.d)))
  const dr = C.rating != null && P.rating != null ? C.rating - P.rating : null
  const best = rows[0], worst = rows[rows.length - 1]
  const analysed = S.filter((g) => g.analysed)
  return (
    <>
      <div className="pv-say">
        <img src={import.meta.env.BASE_URL + 'king/hoppy.jpg'} alt="Hoppy" />
        <p>
          {dr != null && Math.abs(dr) >= 5 && <>Your rating went <b>{dr > 0 ? 'up' : 'down'} {Math.abs(dr)}</b>. </>}
          {best && best.d <= -0.3 && <>Better: <b>{best.name.toLowerCase()}</b> – {Math.abs(best.d).toFixed(1)} fewer in 10 games. </>}
          {worst && worst.d >= 0.3 && <>Watch out: <b>{worst.name.toLowerCase()}</b> – {worst.d.toFixed(1)} more in 10 games.</>}
          {!(dr != null && Math.abs(dr) >= 5) && !(best && best.d <= -0.3) && !(worst && worst.d >= 0.3) && 'Not much changed in this range – pick a longer one to see your trend.'}
        </p>
      </div>
      <div className="pv-kpis">
        <Kpi label="Rapid rating" value={C.rating ?? '–'} d={P.n ? delta(C.rating, P.rating, false, (x) => String(Math.round(x))) : null} pts={weekly(S, (gs) => gs[gs.length - 1].rating, 1)} color="var(--b-grape)" />
        <Kpi label="Safe moves" value={C.safe == null ? '–' : `${Math.round(C.safe)}%`} d={P.checked ? delta(C.safe, P.safe, false, (x) => `${Math.round(x)}%`) : null} pts={weekly(analysed, (gs) => mean(gs.map((g) => g.safe).filter((x): x is number => x != null)))} color="var(--b-green)" />
        <Kpi label="Big mistakes / game" value={C.checked ? C.perGame.toFixed(1) : '–'} d={P.checked && C.checked ? delta(C.perGame, P.perGame, true, (x) => x.toFixed(1)) : null} pts={weekly(analysed, (gs) => sum(gs.map((g) => g.mistakes.length)) / gs.length)} color="var(--b-red)" />
        <Kpi label="Games won" value={pct(C.win)} d={P.n ? delta(C.win * 100, P.win * 100, false, (x) => `${Math.round(x)}%`) : null} pts={weekly(S, (gs) => gs.filter((g) => g.result === 'w').length / gs.length)} color="var(--b-sun-d)" />
      </div>
      <div className="pv-card">
        <h3>Better or worse?</h3>
        <small className="pv-sub">{comparable ? `${label} · mistakes in 10 games` : 'Needs 10 checked games in both periods – pick a longer range.'}</small>
        {comparable && <div className="pv-bwhead"><span>◀ worse</span><span>better ▶</span></div>}
        {rows.map((r) => {
          const same = Math.abs(r.d) < 0.1, good = r.d < 0, wd = same ? 0 : (Math.abs(r.d) / span) * 34
          return (
            <div className="pv-bw" key={r.name}>
              <span className="pv-bwn">{r.name}<small>{r.before.toFixed(1)} → {r.now.toFixed(1)} in 10 games</small></span>
              <span className="pv-bwbar">
                {!same && <i className={good ? 'good' : 'bad'} style={{ width: `${Math.max(wd, 1.5)}%` }} />}
                <em className={same ? 'same' : good ? 'good' : 'bad'} style={same ? { left: 'calc(50% + 6px)' } : good ? { left: `calc(50% + ${Math.max(wd, 1.5)}% + 4px)` } : { right: `calc(50% + ${Math.max(wd, 1.5)}% + 4px)` }}>
                  {same ? '= same' : `${good ? '−' : '+'}${Math.abs(r.d).toFixed(1)}`}
                </em>
              </span>
            </div>
          )
        })}
      </div>
      <div className="pv-card">
        <h3>Your rapid rating</h3>
        <small className="pv-sub">after every rated game · chess.com</small>
        <Line pts={S.map((g) => ({ t: g.t, v: g.rating }))} fmt={(v) => String(Math.round(v))} color="var(--b-grape)" />
      </div>
      <div className="pv-card">
        <h3>Safe moves per week</h3>
        <small className="pv-sub">moves that lose less than 2 pawns · higher is better</small>
        <Line pts={weekly(analysed, (gs) => mean(gs.map((g) => g.safe).filter((x): x is number => x != null)))} fmt={(v) => `${Math.round(v)}%`} color="var(--b-green-d)" />
      </div>
    </>
  )
}
function delta(now: number | null, before: number | null, lowerIsBetter: boolean, fmt: (x: number) => string) {
  if (now == null || before == null) return null
  const d = now - before
  if (fmt(Math.abs(d)) === fmt(0)) return <span className="pv-d flat">= same as before</span>
  const good = lowerIsBetter ? d < 0 : d > 0
  return <span className={`pv-d ${good ? 'good' : 'bad'}`}>{d > 0 ? '▲' : '▼'} {fmt(Math.abs(d))} {good ? 'better' : 'worse'}</span>
}
function Kpi({ label, value, d, pts, color }: { label: string; value: string | number; d: React.ReactNode; pts: { v: number }[]; color: string }) {
  return (
    <div className="pv-kpi">
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      {d ?? <span className="pv-d flat">no comparison yet</span>}
      <Spark pts={pts} color={color} />
    </div>
  )
}
function Spark({ pts, color }: { pts: { v: number }[]; color: string }) {
  if (pts.length < 2) return <svg viewBox="0 0 160 30" aria-hidden="true" />
  const ys = pts.map((p) => p.v), a = Math.min(...ys), b = Math.max(...ys)
  const x = (i: number) => 2 + (i / (pts.length - 1)) * 156, y = (v: number) => 27 - ((v - a) / (b - a || 1)) * 24
  return (
    <svg viewBox="0 0 160 30" aria-hidden="true">
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join('')} fill="none" stroke="var(--pv-ghost)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(pts.length - 1)} cy={y(ys[ys.length - 1])} r="3.5" fill={color} />
    </svg>
  )
}
function ticks(a: number, b: number, n: number) {
  const step0 = (b - a) / n, mag = 10 ** Math.floor(Math.log10(step0 || 1))
  const st = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= step0) ?? mag * 10
  const out: number[] = []
  for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6))
  return out
}
// a line over time with a crosshair: tap or move along it to read a value
function Line({ pts, fmt, color, H = 150 }: { pts: { t: number; v: number; n?: number }[]; fmt: (v: number) => string; color: string; H?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  if (pts.length < 2) return <p className="pv-note">Not enough games in this range yet.</p>
  const ys = pts.map((p) => p.v)
  const pad = (Math.max(...ys) - Math.min(...ys)) * 0.12 || 1
  const a = Math.min(...ys) - pad, b = Math.max(...ys) + pad
  const L = 34, R = W - 8, T = 8, B = H - 22
  const x = (t: number) => L + ((t - pts[0].t) / (pts[pts.length - 1].t - pts[0].t || 1)) * (R - L)
  const y = (v: number) => B - ((v - a) / (b - a || 1)) * (B - T)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('')
  const last = pts[pts.length - 1]
  const at = (px: number) => pts.reduce((bi, p, i) => (Math.abs(x(p.t) - px) < Math.abs(x(pts[bi].t) - px) ? i : bi), 0)
  const h = hover != null ? pts[hover] : null
  return (
    <div className="pv-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`From ${fmt(ys[0])} to ${fmt(last.v)}`}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(at(((e.clientX - r.left) * W) / r.width)) }}
        onPointerLeave={() => setHover(null)}>
        {ticks(a, b, 4).map((v) => (
          <g key={v}><line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--pv-grid)" strokeWidth="1" /><text x={L - 6} y={y(v) + 3.5} textAnchor="end">{fmt(v)}</text></g>
        ))}
        <path d={`${d} L${x(last.t)} ${B} L${L} ${B} Z`} fill={color} opacity=".1" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.t)} cy={y(last.v)} r="5" fill={color} stroke="#fff" strokeWidth="2" />
        <text className="lbl" x={x(last.t) - 8} y={y(last.v) - 10} textAnchor="end">{fmt(last.v)}</text>
        <text x={L} y={H - 4}>{fmtDate(pts[0].t)}</text>
        <text x={R} y={H - 4} textAnchor="end">{fmtDate(last.t)}</text>
        {h && <><line x1={x(h.t)} x2={x(h.t)} y1={T} y2={B} stroke="var(--b-muted)" strokeWidth="1" /><circle cx={x(h.t)} cy={y(h.v)} r="5" fill={color} stroke="#fff" strokeWidth="2" /></>}
      </svg>
      {h && <div className="pv-tip" style={{ left: `${Math.min(Math.max((x(h.t) / W) * 100, 18), 82)}%` }}><b>{fmt(h.v)}</b>{fmtDate(h.t)}{h.n ? ` · ${h.n} games` : ''}</div>}
    </div>
  )
}

// ---------------- mistakes ----------------
const KINDS: [string, Kind[]][] = [['Hung a piece', ['h']], ['Ignored a threat', ['i', 'u']], ['Walked into a tactic', ['t']], ['Allowed mate', ['a']], ['Missed a win', ['f', 'm', 'M']], ['Other kinds', ['o']]]
function Mistakes({ S, C, P, label, byMonth }: { S: PGame[]; C: St; P: St; label: string; byMonth: boolean }) {
  const A = S.filter((g) => g.analysed)
  const groups = new Map<string, PGame[]>()
  for (const g of A) {
    const k = byMonth ? new Date(g.t * 1000).toISOString().slice(0, 7) : String(Math.floor((g.t - 4 * 86400) / (7 * 86400)))
    groups.set(k, [...(groups.get(k) ?? []), g])
  }
  const stack = [...groups.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1)).filter(([, gs]) => gs.length >= 5).map(([k, gs]) => ({
    label: byMonth ? new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short' }) : fmtDate(+k * 7 * 86400 + 4 * 86400),
    n: gs.length,
    parts: (['o', 'm', 'e'] as const).map((p) => gs.flatMap((g) => g.mistakes).filter((m) => m.phase === p).length / gs.length),
  }))
  const comparable = C.checked >= 10 && P.checked >= 10
  const kinds = KINDS.map(([name, ks]) => ({ name, v: C.kind(ks), d: comparable && P.kind(ks) > 0 ? (C.kind(ks) - P.kind(ks)) / P.kind(ks) : null })).sort((a, b) => b.v - a.v)
  const rate = (moves: (g: PGame) => number, hit: (m: PGame['mistakes'][number]) => boolean) => {
    const mv = sum(A.map(moves)), bl = A.flatMap((g) => g.mistakes).filter(hit).length
    return mv ? (100 * bl) / mv : 0
  }
  const byMove = ['1–10', '11–20', '21–30', '31–40', '41+'].map((label, i) => ({ label, v: rate((g) => g.moveBuckets[i], (m) => Math.min(Math.floor((m.move - 1) / 10), 4) === i), n: A.filter((g) => g.moveBuckets[i] > 0).length }))
  const byClock = ['>75%', '50–75', '25–50', '10–25', '<10%'].map((label, i) => ({ label, v: rate((g) => g.clockMoves[i], (m) => m.clock === i), n: A.filter((g) => g.clockMoves[i] > 0).length }))
  if (!A.length) return null
  return (
    <>
      <div className="pv-card">
        <h3>Where do your big mistakes happen?</h3>
        <small className="pv-sub">big mistakes per game · by phase</small>
        <div className="pv-legend"><span><i style={{ background: 'var(--pv-s1)' }} />Opening</span><span><i style={{ background: 'var(--pv-s2)' }} />Middlegame</span><span><i style={{ background: 'var(--pv-s3)' }} />Endgame</span></div>
        <Stacked groups={stack} />
      </div>
      <div className="pv-card">
        <h3>What kind of mistakes?</h3>
        <small className="pv-sub">per game{comparable ? ` · ▼ fewer = better · ${label}` : ''}</small>
        <HBars rows={kinds} />
      </div>
      <div className="pv-card">
        <h3>When in the game?</h3>
        <small className="pv-sub">big mistakes per 100 of your moves, by move number</small>
        <Columns items={byMove} fmt={(v) => v.toFixed(1)} color="var(--b-grape)" />
      </div>
      <div className="pv-card">
        <h3>And on the clock?</h3>
        <small className="pv-sub">big mistakes per 100 moves, by time left on your clock</small>
        <Columns items={byClock} fmt={(v) => v.toFixed(1)} color="var(--b-red)" />
      </div>
    </>
  )
}
function Stacked({ groups }: { groups: { label: string; n: number; parts: number[] }[] }) {
  if (!groups.length) return <p className="pv-note">Not enough checked games in this range yet.</p>
  const H = 170, L = 8, R = W - 8, T = 20, B = H - 28, slot = (R - L) / groups.length, bw = Math.min(24, slot * 0.6)
  const max = Math.max(...groups.map((g) => sum(g.parts)), 0.001)
  const cols = ['var(--pv-s1)', 'var(--pv-s2)', 'var(--pv-s3)']
  return (
    <div className="pv-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={groups.map((g) => `${g.label} ${sum(g.parts).toFixed(1)}`).join(', ')}>
        <line x1={L} x2={R} y1={B} y2={B} stroke="var(--b-line)" strokeWidth="1" />
        {groups.map((g, i) => {
          const cx = L + slot * i + slot / 2
          let y0 = B
          const segs = g.parts.map((v, j) => {
            const h = (v / max) * (B - T)
            const top = y0 - h
            const el = h > 0.5 ? <rect key={j} x={cx - bw / 2} y={top + (j ? 0 : 0)} width={bw} height={Math.max(h - 2, 1)} rx={j === g.parts.length - 1 || g.parts.slice(j + 1).every((x) => x === 0) ? 4 : 0} fill={cols[j]}><title>{['Opening', 'Middlegame', 'Endgame'][j]}: {v.toFixed(2)} per game</title></rect> : null
            y0 = top
            return el
          })
          return (
            <g key={g.label + i}>
              {segs}
              <text className="lbl" x={cx} y={y0 - 6} textAnchor="middle">{sum(g.parts).toFixed(1)}</text>
              <text x={cx} y={B + 14} textAnchor="middle">{g.label}</text>
              <text x={cx} y={B + 25} textAnchor="middle" className="sm">{g.n} g</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
function HBars({ rows }: { rows: { name: string; v: number; d: number | null }[] }) {
  const max = Math.max(...rows.map((r) => r.v), 0.0001)
  const rowH = 30, H = rows.length * rowH, L = 150, R = W - 70
  return (
    <div className="pv-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {rows.map((r, i) => {
          const y = i * rowH + 6, w = Math.max(2, (r.v / max) * (R - L))
          return (
            <g key={r.name}>
              <text x="0" y={y + 13} className="name">{r.name}</text>
              <rect x={L} y={y} width={w} height="18" rx="4" fill={i === 0 ? 'var(--b-grape)' : 'var(--pv-ghost)'} />
              <text className="lbl" x={L + w + 6} y={y + 13}>{r.v.toFixed(2)}</text>
              {r.d != null && <text x={W} y={y + 13} textAnchor="end" className={Math.abs(r.d) <= 0.05 ? 'flat' : r.d < 0 ? 'good' : 'bad'}>{Math.abs(r.d) <= 0.05 ? '= same' : `${r.d < 0 ? '▼' : '▲'} ${Math.abs(Math.round(r.d * 100))}%`}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
// columns, one hue; the largest (with enough games) is emphasised, the rest grey
function Columns({ items, fmt, color, min = 10 }: { items: { label: string; v: number; n: number }[]; fmt: (v: number) => string; color: string; min?: number }) {
  const ok = items.filter((i) => i.n >= min)
  const max = Math.max(...ok.map((i) => i.v), 0.0001)
  const emph = items.reduce((b, it, i) => (it.n >= min && (b < 0 || it.v > items[b].v) ? i : b), -1)
  const H = 150, L = 8, R = W - 8, T = 18, B = H - 30, slot = (R - L) / items.length, bw = Math.min(24, slot * 0.55)
  return (
    <div className="pv-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={items.map((i) => `${i.label}: ${i.n >= min ? fmt(i.v) : 'too few games'}`).join(', ')}>
        <line x1={L} x2={R} y1={B} y2={B} stroke="var(--b-line)" strokeWidth="1" />
        {items.map((it, i) => {
          const cx = L + slot * i + slot / 2, few = it.n < min, h = few ? 0 : Math.max(2, (it.v / max) * (B - T))
          return (
            <g key={it.label}>
              {!few && <rect x={cx - bw / 2} y={B - h} width={bw} height={h} rx="4" fill={emph === i ? color : 'var(--pv-ghost)'}><title>{it.label}: {fmt(it.v)} · {it.n} games</title></rect>}
              <text className={emph === i ? 'lbl' : ''} x={cx} y={few ? B - 6 : B - h - 5} textAnchor="middle">{few ? '–' : fmt(it.v)}</text>
              <text x={cx} y={B + 14} textAnchor="middle">{it.label}</text>
              <text x={cx} y={B + 26} textAnchor="middle" className="sm">{it.n} g</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ---------------- openings ----------------
function Openings({ S, color, setColor }: { S: PGame[]; color: 'w' | 'b'; setColor: (c: 'w' | 'b') => void }) {
  const mine = S.filter((g) => g.color === color)
  const fam = new Map<string, PGame[]>()
  for (const g of mine) fam.set(g.family, [...(fam.get(g.family) ?? []), g])
  const row = (name: string, gs: PGame[]) => {
    const A = gs.filter((g) => g.analysed)
    return { name, n: gs.length, win: gs.filter((g) => g.result === 'w').length / gs.length, mpg: A.length ? sum(A.map((g) => g.mistakes.length)) / A.length : null }
  }
  const list = [...fam.entries()].map(([n, gs]) => row(n, gs)).sort((a, b) => b.n - a.n)
  const top = list.slice(0, 8)
  const rest = list.slice(8)
  if (rest.length) top.push(row(`Other (${rest.length})`, rest.flatMap((r) => fam.get(r.name)!)))
  const enough = list.filter((r) => r.n >= 10)
  const best = [...enough].sort((a, b) => b.win - a.win)[0], worst = [...enough].sort((a, b) => a.win - b.win)[0]
  return (
    <>
      <div className="pv-seg" role="group" aria-label="Colour">
        <button type="button" aria-pressed={color === 'w'} onClick={() => setColor('w')}>♔ With White</button>
        <button type="button" aria-pressed={color === 'b'} onClick={() => setColor('b')}>♚ With Black</button>
      </div>
      {enough.length >= 2 && (
        <div className="pv-chips"><span className="good">Best: {best.name} · {pct(best.win)} won</span><span className="bad">Hardest: {worst.name} · {pct(worst.win)} won</span></div>
      )}
      <div className="pv-card">
        <h3>Your openings</h3>
        <small className="pv-sub">most played first · chess.com opening names</small>
        <table className="pv-table">
          <thead><tr><th>Opening</th><th>Games</th><th>Won</th><th>Mistakes / game</th></tr></thead>
          <tbody>
            {top.map((r) => (
              <tr key={r.name}><td>{r.name}</td><td>{r.n}</td><td><span className="pv-meter"><i style={{ width: pct(r.win) }} /></span>{pct(r.win)}</td><td>{r.mpg == null ? '–' : r.mpg.toFixed(1)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ---------------- habits ----------------
function Habits({ S }: { S: PGame[] }) {
  const n = S.length || 1
  const won = S.filter((g) => g.result === 'w').length, draw = S.filter((g) => g.result === 'd').length, lost = S.filter((g) => g.result === 'l').length
  const L = S.filter((g) => g.result === 'l')
  const by = (h: string) => L.filter((g) => g.how === h).length
  const pos: PGame[][] = [[], [], [], []]
  const sess = sessions(S)
  for (const s of sess) s.forEach((g, i) => pos[Math.min(i, 3)].push(g))
  const winRate = (gs: PGame[]) => (gs.length ? gs.filter((g) => g.result === 'w').length / gs.length : 0)
  const afterW: PGame[] = [], afterL: PGame[] = []
  for (const s of sess) for (let i = 1; i < s.length; i++) (s[i - 1].result === 'w' ? afterW : s[i - 1].result === 'l' ? afterL : []).push(s[i])
  const hours = ([['Morning', 6, 12], ['Afternoon', 12, 18], ['Evening', 18, 24], ['Night', 0, 6]] as [string, number, number][]).map(([label, a, b]) => { const gs = S.filter((g) => g.hour >= a && g.hour < b); return { label, v: winRate(gs), n: gs.length } })
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => { const gs = S.filter((g) => g.weekday === i); return { label, v: winRate(gs), n: gs.length } })
  return (
    <>
      <div className="pv-card">
        <h3>How your games end</h3>
        <small className="pv-sub">{S.length} games in this range</small>
        <div className="pv-segbar" role="img" aria-label={`won ${won}, draw ${draw}, lost ${lost}`}>
          {won > 0 && <div style={{ flex: won, background: 'var(--b-green)' }}>{won / n > 0.08 ? pct(won / n) : ''}</div>}
          {draw > 0 && <div style={{ flex: draw, background: 'var(--pv-ghost)' }} />}
          {lost > 0 && <div style={{ flex: lost, background: 'var(--b-red)' }}>{lost / n > 0.08 ? pct(lost / n) : ''}</div>}
        </div>
        <div className="pv-legend"><span><i style={{ background: 'var(--b-green)' }} />Won</span><span><i style={{ background: 'var(--pv-ghost)' }} />Draw</span><span><i style={{ background: 'var(--b-red)' }} />Lost</span></div>
        <div className="pv-stats">
          {([['Lost on time', by('timeout')], ['Checkmated', by('checkmated')], ['Resigned', by('resigned')], ['Left the game', by('abandoned')]] as [string, number][]).map(([l, v]) => (
            <div key={l}><b>{v}</b><small>{l} · {L.length ? pct(v / L.length) : '–'} of losses</small></div>
          ))}
        </div>
      </div>
      <div className="pv-card">
        <h3>Game after game</h3>
        <small className="pv-sub">games that end less than an hour apart are one session · win rate</small>
        <Columns items={['1st', '2nd', '3rd', '4th+'].map((label, i) => ({ label, v: winRate(pos[i]), n: pos[i].length }))} fmt={pct} color="var(--b-green)" />
        <div className="pv-stats">
          <div><b>{afterW.length ? pct(winRate(afterW)) : '–'}</b><small>won right after a win · {afterW.length} games</small></div>
          <div><b>{afterL.length ? pct(winRate(afterL)) : '–'}</b><small>won right after a loss · {afterL.length} games</small></div>
        </div>
      </div>
      <div className="pv-card">
        <h3>Time of day</h3>
        <small className="pv-sub">win rate</small>
        <Columns items={hours} fmt={pct} color="var(--b-green)" />
      </div>
      <div className="pv-card">
        <h3>Day of the week</h3>
        <small className="pv-sub">win rate</small>
        <Columns items={days} fmt={pct} color="var(--b-green)" />
      </div>
    </>
  )
}
