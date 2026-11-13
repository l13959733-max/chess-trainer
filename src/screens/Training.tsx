import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BottomBar } from '../components/BottomBar'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import type { useRepertoire } from '../hooks/useRepertoire'
import { analyzeOnly, recentRapid, reset as resetAnalyzer, type AnalyzerState } from '../lib/analyzer'
import { doneMap, forgetBackToTraining, launch, mineOf, pickOfDay, planInput, redCandidates } from '../lib/trainingToday'
import { clampScore } from '../lib/blunders'
import { shapeReport } from '../lib/check'
import { fetchProfile, fetchRapidRating, gameKey, hasOwnPlayer, setPlayer, type ChessComGame } from '../lib/chesscom'
import { chapterOf } from '../lib/cityBook'
import { getGameRecords, type GameRecord, type Puzzle } from '../lib/db'
import { feedback } from '../lib/feedback'
import { loadKing } from '../lib/king'
import { getName } from '../lib/profile'
import { dateKey } from '../lib/progress'
import { isDue } from '../lib/srs'
import {
  addRed,
  buildPlan,
  loadPlan,
  loadSeen,
  longestStreak,
  report,
  safeShare,
  savePlan,
  saveSeen,
  starsFromMistakes,
  viewPlan,
  type LevelKind,
  type LevelView,
} from '../lib/trainingPath'
import { route, stationById } from '../lib/king'
import { nextCity } from '../lib/travel'
import { CATEGORY } from '../lib/weakness'
import { PuzzleView } from './PuzzleScreen'
import '../training.css'

// Training (Lu, 13.11.: "Übernimm das erstmal so"), built from the draft https://claude.ai/artifact/HWhR59MBvsBsqwobpMAcrA:
// tiles and week stats like Lu's template, today's path of levels with 1–3 stars over the painted city, the chess.com
// games as red levels, every trainer of the old Training Camp in a shelf (the camp itself stays at #/camp).

const IMG = import.meta.env.BASE_URL + 'king/'
const HOPPY = IMG + 'hoppy.jpg'

type Rep = ReturnType<typeof useRepertoire>
type Prog = ReturnType<typeof useProgress>

// ---------- texts ----------

const INFO: Record<LevelKind, string> = {
  lines: 'Play the lines that are due today, from memory.',
  lesson: 'A short lesson: one question per screen, the answer on the board.',
  mistake: 'A mistake from your own chess.com game. Find the better move.',
  lost: 'A mistake from one of your games, now as a puzzle.',
  threat: 'What does your opponent threaten? Find it before you move.',
  rush: '60 seconds. Tap the right square as often as you can.',
  treasure: 'You were winning in this position. Now win it against Hoppy-Bot.',
  boss: 'The boss of this chapter.',
}
const RULES: Record<LevelKind, [string, string, string] | null> = {
  lines: ['Done', 'One mistake', 'No mistake'],
  lesson: ['Done', 'Every answer first try', 'First try and careful play'],
  mistake: ['Solved', 'One wrong try', 'First try'],
  lost: ['Solved', 'One wrong try', 'First try'],
  threat: ['Played', '–', 'You found the threat'],
  rush: ['150 points', '450 points', '900 points'],
  treasure: ['Played it', 'A draw', 'Won it'],
  boss: null,
}
function sayFor(l: LevelView, linesDue: number, city?: string): string {
  switch (l.kind) {
    case 'lines': return `${linesDue} ${linesDue === 1 ? 'line is' : 'lines are'} due. Play them from memory!`
    case 'lesson': return city ? `A short lesson in ${city}.` : 'A short lesson.'
    case 'mistake': return 'From your own game. Find the better move!'
    case 'lost': return 'A mistake from a game. Fix it!'
    case 'threat': return 'Check the threat first!'
    case 'rush': return '60 seconds. Find the squares!'
    case 'treasure': return 'You were winning here. Win it!'
    case 'boss': return 'The boss is waiting.'
  }
}
// Praise with information (LERNKONZEPT): only what the stars really say
function praise(l: LevelView): string {
  const s = l.stars ?? 0
  switch (l.kind) {
    case 'lines': return s === 3 ? 'No mistake – every move straight from your book.' : s === 2 ? 'Only one slip. The line comes back soon so it sticks.' : 'Done. These lines come back soon, so they stick.'
    case 'lesson': return s === 3 ? 'Every answer on the first try, and you played carefully.' : s === 2 ? 'Every answer on the first try.' : 'Done. Next time with fewer tries.'
    case 'mistake':
    case 'lost': return s === 3 ? 'First try – you found the better move.' : 'Solved. It comes back in a few days to check it stuck.'
    case 'threat': return s === 3 ? 'You found the threat before moving. That is the habit that wins games.' : 'Missed today. Tomorrow there is a new one.'
    case 'rush': return `Square Rush: ${s} ${s === 1 ? 'star' : 'stars'}.`
    case 'treasure': return s === 3 ? 'You won it!' : s === 2 ? 'A draw – next time win it.' : 'Played. Winning positions need care to the end.'
    case 'boss': return 'Boss beaten!'
  }
}

// ---------- glitter ----------
function makeGlitter() {
  let parts: { x: number; y: number; vx: number; vy: number; r: number; c: string; life: number; star: boolean }[] = []
  let running = false
  function tick() {
    const cv = document.querySelector<HTMLCanvasElement>('canvas.trn-fx')
    if (!cv) {
      running = false
      return
    }
    const cx = cv.getContext('2d')!
    const dpr = devicePixelRatio || 1
    if (cv.width !== innerWidth * dpr) {
      cv.width = innerWidth * dpr
      cv.height = innerHeight * dpr
    }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cx.clearRect(0, 0, innerWidth, innerHeight)
    parts = parts.filter((p) => p.life > 0)
    for (const p of parts) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.18
      p.vx *= 0.985
      p.life--
      cx.globalAlpha = Math.min(1, p.life / 30)
      cx.fillStyle = p.c
      cx.beginPath()
      if (p.star)
        for (let k = 0; k < 10; k++) {
          const a = (k * Math.PI) / 5 - Math.PI / 2
          const rr = k % 2 ? p.r * 0.8 : p.r * 1.8
          cx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr)
        }
      else cx.arc(p.x, p.y, p.r, 0, 7)
      cx.fill()
    }
    if (parts.length) requestAnimationFrame(tick)
    else running = false
  }
  function burst(x: number, y: number, n: number) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cols = ['#4fc414', '#ffc531', '#2ea7f0', '#8a5cf6', '#ef4a5a', '#ffffff']
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2
      const sp = 3 + Math.random() * 7
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, r: 2 + Math.random() * 4, c: cols[k % cols.length], life: 60 + Math.random() * 40, star: Math.random() < 0.35 })
    }
    if (!running) {
      running = true
      requestAnimationFrame(tick)
    }
  }
  return { burst }
}
function useGlitter() {
  const [fx] = useState(makeGlitter)
  return { canvas: <canvas className="trn-fx" aria-hidden="true" />, burst: fx.burst }
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500)
    return () => clearTimeout(t)
  }, [onDone, text])
  return <div className="trn-toast" role="status" onClick={onDone}>{text}</div>
}

// ---------- chess.com games (cached for 10 minutes per player) ----------
type MiniGame = Pick<ChessComGame, 'uuid' | 'url' | 'end_time' | 'white' | 'black'>
async function recentGames(player: string, force = false): Promise<MiniGame[]> {
  const key = 'hoppy-recent-' + player
  if (!force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(key) ?? 'null') as { at: number; games: MiniGame[] } | null
      if (c && Date.now() - c.at < 10 * 60_000) return c.games
    } catch {
      // fetch again
    }
  }
  return cacheGames(player, await recentRapid(player, 20))
}
function cacheGames(player: string, full: ChessComGame[]): MiniGame[] {
  const games = full.map(({ uuid, url, end_time, white, black }) => ({ uuid, url, end_time, white, black }))
  try {
    sessionStorage.setItem('hoppy-recent-' + player, JSON.stringify({ at: Date.now(), games }))
  } catch {
    // not cached
  }
  return games
}
const DRAWS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'])
function resultOf(g: MiniGame, player: string): { r: 'W' | 'L' | 'D'; me: 'w' | 'b'; opp: { username: string; rating: number } } {
  const me = g.white.username.toLowerCase() === player ? 'w' : 'b'
  const mine = me === 'w' ? g.white : g.black
  return { me, opp: me === 'w' ? g.black : g.white, r: mine.result === 'win' ? 'W' : DRAWS.has(mine.result) ? 'D' : 'L' }
}
function ago(sec: number, now = Date.now()): string {
  const d = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(sec * 1000).setHours(0, 0, 0, 0)) / 86_400_000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function Avatar({ name, src }: { name: string; src?: string }) {
  return <span className="trn-av">{src ? <img src={src} alt="" /> : name.slice(0, 2).toUpperCase()}</span>
}

// =====================================================================================================
export function Training({ rep, progress, puzzles, player, analyzer }: { rep: Rep; progress: Prog; puzzles: Puzzles; player: string; analyzer: AnalyzerState }) {
  const [king] = useState(loadKing)
  const [now] = useState(() => Date.now())
  const next = nextCity(king.beaten)
  const cities = route().map((id) => stationById(id)!).filter(Boolean)
  const after = next ? cities[cities.indexOf(next) + 1] : undefined
  const linesDue = rep.lines.filter((l) => isDue(rep.srs.get(l.id), now)).length
  const mistakesDue = puzzles.due.length + puzzles.fresh.length
  const own = hasOwnPlayer()
  const { canvas, burst } = useGlitter()

  useEffect(() => forgetBackToTraining(), [])

  // the plan of today: built once, later only the red levels can join (puzzles load after the page)
  const { lines, srs } = rep
  const { puzzles: all, due, fresh: unseen } = puzzles
  const plan = useMemo(() => {
    const input = planInput(lines, srs, { puzzles: all, due, fresh: unseen }, player)
    const cur = loadPlan()
    return cur ? addRed(cur, input.mistakes) : buildPlan(input)
  }, [lines, srs, all, due, unseen, player])
  useEffect(() => savePlan(plan), [plan])

  const done = useMemo(() => doneMap(plan), [plan])
  const levels = useMemo(() => viewPlan(plan, done), [plan, done])
  const doneCount = levels.filter((l) => l.stars !== null).length
  const starsToday = levels.reduce((s, l) => s + (l.icon ? 0 : l.stars ?? 0), 0)
  const starsMax = levels.filter((l) => !l.icon).length * 3

  // a level finished since the last visit: celebrate it once
  const [seenBefore] = useState(loadSeen)
  const newly = useMemo(() => levels.filter((l) => l.stars !== null && !seenBefore.includes(l.key)), [levels, seenBefore])
  const fresh = useMemo(() => newly.map((l) => l.key), [newly])
  const [closed, setClosed] = useState(false)
  const win = !closed && newly.length ? newly[newly.length - 1] : null
  useEffect(() => {
    if (fresh.length) saveSeen([...new Set([...loadSeen(), ...fresh])])
  }, [fresh])

  const [sheet, setSheet] = useState<LevelView | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [say, setSay] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  // safe moves, chess.com rating and new games
  const [records, setRecords] = useState<GameRecord[]>([])
  const [rating, setRating] = useState<number | null>(null)
  const [fresher, setFresher] = useState<number | null>(null)
  useEffect(() => {
    let gone = false
    getGameRecords(player).then((r) => !gone && setRecords(r)).catch(() => {})
    if (own) {
      fetchRapidRating(player).then((r) => !gone && setRating(r)).catch(() => {})
      recentGames(player)
        .then(async (g) => {
          const recs = new Set((await getGameRecords(player)).map((r) => r.uuid))
          if (!gone) setFresher(g.filter((x) => !recs.has(gameKey(player, x.uuid))).length)
        })
        .catch(() => {})
    }
    return () => {
      gone = true
    }
  }, [player, own, analyzer.analyzed])
  const last20 = useMemo(() => [...records].sort((a, b) => b.endTime - a.endTime).slice(0, 20), [records])
  const safe = safeShare(last20)

  const best = useMemo(() => longestStreak([...progress.days.values()].filter((d) => d.lines + d.puzzles + (d.games ?? 0) > 0).map((d) => d.date)), [progress.days])
  const name = getName() ?? 'Traveller'
  const hour = new Date(now).getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const reading = analyzer.status === 'running' || analyzer.status === 'loading'

  function open(l: LevelView) {
    feedback.crack()
    if (l.lock) {
      const nowL = levels.find((x) => x.now)
      setSay(`Finish level ${nowL?.n ?? 1} first!`)
      setShake((n) => n + 1)
      return
    }
    setSheet(l)
  }

  return (
    <div className="trn">
      <div className="trn-scroll" id="trn-scroll">
        <div className="trn-in">
          <header className="trn-head">
            <div className="grow">
              <h1>Training</h1>
              <p>{hello}, {name}!</p>
            </div>
            <span className="trn-pill fire" title="Days in a row">🔥 {progress.streak}</span>
            <span className="trn-pill nut" title="Chestnuts">🌰 {king.coins.toLocaleString('en')}</span>
          </header>

          <div className="trn-goal" aria-label="Today's path">
            <div className="row"><span>Today's path</span><span>{doneCount} of {levels.length} levels</span></div>
            <div className="trn-track"><i style={{ width: `${levels.length ? (100 * doneCount) / levels.length : 0}%` }} /></div>
          </div>

          <ChessComCard own={own} player={player} rating={rating} checked={records.length} fresher={fresher} reading={reading} analyzer={analyzer} />

          <div className="trn-tiles">
            <div className="trn-tile t-green"><div className="top">Safe moves <span className="ic">🛡️</span></div><b>{safe === null ? '–' : `${Math.round(safe * 100)}%`}</b><small>{safe === null ? 'from your chess.com games' : `last ${last20.length} ${last20.length === 1 ? 'game' : 'games'}`}</small></div>
            <div className="trn-tile t-sun"><div className="top">Streak <span className="ic">🔥</span></div><b>{progress.streak}</b><small>Best: {Math.max(best, progress.streak)} {best === 1 ? 'day' : 'days'}</small></div>
            <div className="trn-tile t-grape"><div className="top">Chestnuts <span className="ic">🌰</span></div><b>{king.coins.toLocaleString('en')}</b><small>Level {progress.level.level}</small></div>
            <div className="trn-tile t-blue"><div className="top">Due today <span className="ic">📖</span></div><b>{linesDue + mistakesDue}</b><small>{linesDue} lines · {mistakesDue} mistakes</small></div>
          </div>

          <div className="trn-sec"><h2>Today's path</h2><button type="button" onClick={() => document.getElementById('trn-shelf')?.scrollIntoView({ behavior: 'smooth' })}>All training ↓</button></div>

          {next && (
            <button type="button" className="trn-unit" onClick={() => go('king/' + next.id)} aria-label={`Open the chapter ${next.name}`}>
              <img src={`${IMG}${next.id}.jpg`} alt="" />
              <span className="in">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <small>Chapter {cities.indexOf(next) + 1} · {next.name}</small>
                  <span className="h3">{chapterOf(next.id)?.headline ?? next.name}</span>
                </span>
                {starsMax > 0 && <span className="stars">★ {starsToday} / {starsMax}</span>}
              </span>
            </button>
          )}

          <Path levels={levels} fresh={fresh} say={say} shake={shake} onOpen={open} sayFor={(l) => sayFor(l, linesDue, next?.name)} />

          {after && (
            <div className="trn-unit next">
              <img src={`${IMG}${after.id}.jpg`} alt="" />
              <span className="in">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <small>Up next · {after.name}</small>
                  <span className="h3">{chapterOf(after.id)?.headline ?? after.name}</span>
                </span>
                <span className="stars">🔒</span>
              </span>
            </div>
          )}

          <div className="trn-sec"><h2>Your week</h2></div>
          <div className="trn-card">
            <h4>Safe moves <span className="trn-chip">per chess.com game</span></h4>
            <SafeLine records={records} />
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
          <div className="trn-card">
            <h4>Done today</h4>
            {levels.some((l) => l.stars !== null) ? (
              <div className="trn-act">
                {levels.filter((l) => l.stars !== null).map((l) => (
                  <div className="it" key={l.key}>
                    <span className="ok" style={{ background: l.red ? 'var(--red-t)' : 'var(--green-t)', color: l.red ? 'var(--red)' : 'var(--green-d)' }}>✓</span>
                    <div><b>{l.n}. {l.title}</b><small>{l.red ? 'from your chess.com game' : INFO[l.kind].split('.')[0]}</small></div>
                    <span className="stars">{l.icon ?? '★'.repeat(l.stars ?? 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="trn-empty">Nothing yet today. Level 1 is waiting.</p>
            )}
          </div>

          <div className="trn-sec" id="trn-shelf"><h2>All training</h2></div>
          <Shelf puzzles={puzzles} own={own} fresher={fresher} />
        </div>
      </div>

      <BottomBar active="training" />
      {canvas}

      {sheet && (
        <div className="trn-veil" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="trn-sheet" role="dialog" aria-label={`Level ${sheet.n}`}>
            <div className="kick" style={sheet.red ? { color: 'var(--red)' } : undefined}>Level {sheet.n} · {sheet.stars !== null ? 'play again' : 'up next'}</div>
            <h3>{sheet.kind === 'boss' && next ? next.boss.name : sheet.title}</h3>
            <p>{INFO[sheet.kind]}</p>
            {RULES[sheet.kind] && (
              <div className="trn-rules">
                {RULES[sheet.kind]!.map((t, i) => (t === '–' ? null : <div key={i}><span className="s">{'★'.repeat(i + 1)}</span>{t}</div>))}
              </div>
            )}
            <button type="button" className={`btn${sheet.red ? ' red' : ''}`} onClick={() => launch(sheet.route)}>{sheet.stars !== null ? 'Play again' : 'Start'}</button>
            <button type="button" className="btn ghost" onClick={() => setSheet(null)}>Not now</button>
          </div>
        </div>
      )}

      {win && <Win level={win} burst={burst} onClose={() => {
        setClosed(true)
        const nx = levels.find((l) => l.now)
        if (nx) {
          setSay(`Great! Level ${nx.n} is next.`)
          setTimeout(() => document.querySelector('.trn .lvl.now')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
        } else setSay('All done today! See you tomorrow.')
      }} />}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function Win({ level, burst, onClose }: { level: LevelView; burst: (x: number, y: number, n: number) => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => {
      feedback.success()
      burst(innerWidth / 2, innerHeight * 0.45, 90)
    }, 250)
    return () => clearTimeout(t)
  }, [burst])
  const s = level.stars ?? 0
  return (
    <div className="trn-veil">
      <div className="trn-sheet trn-win" role="dialog" aria-label="Level complete">
        <div className="face"><img src={HOPPY} alt="Hoppy" /></div>
        <h3>{level.kind === 'boss' ? 'Boss beaten!' : `Level ${level.n} complete!`}</h3>
        {!level.icon && (
          <div className="trn-bigstars" aria-label={`${s} of 3 stars`}>
            {[1, 2, 3].map((k) => <span key={k} className={k <= s ? 'on' : ''} style={{ animationDelay: `${0.25 + k * 0.22}s` }}>★</span>)}
          </div>
        )}
        <div className="trn-say"><b>Hoppy:</b> {praise(level)}</div>
        <button type="button" className="btn" onClick={onClose}>Continue</button>
      </div>
    </div>
  )
}

// ---------- the winding path ----------
function Path({ levels, fresh, say, shake, onOpen, sayFor }: { levels: LevelView[]; fresh: string[]; say: string | null; shake: number; onOpen: (l: LevelView) => void; sayFor: (l: LevelView) => string }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(358)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const STEP = 92
  const TOP = 52
  const pts = levels.map((_, i) => ({ x: w / 2 + Math.sin(i * 1.05 + 0.3) * Math.min(95, w * 0.26), y: TOP + i * STEP }))
  const h = pts.length ? pts[pts.length - 1].y + 60 : 0
  let d = pts.length ? `M ${pts[0].x} ${pts[0].y - 40}` : ''
  pts.forEach((p, i) => {
    if (i === 0) d += ` L ${p.x} ${p.y}`
    else {
      const q = pts[i - 1]
      const my = (q.y + p.y) / 2
      d += ` C ${q.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`
    }
  })
  const at = levels.findIndex((l) => l.now)
  const ci = at >= 0 ? at : levels.length - 1
  const cur = pts[ci]
  const right = cur ? cur.x <= w / 2 : true
  if (!levels.length) return <div className="trn-path" style={{ height: 80 }}><p className="trn-empty">Building today's path…</p></div>
  return (
    <div className="trn-path" ref={box} style={{ height: h }}>
      <svg className="road" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--line)" strokeWidth="20" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>
      {levels.map((l, i) => {
        const p = pts[i]
        const side = p.x > w / 2 ? 'l' : 'r'
        const isFresh = fresh.includes(l.key)
        return (
          <button
            key={l.key}
            type="button"
            className={`lvl${l.lock ? ' lock' : ''}${l.now ? ' now' : ''}${l.kind === 'treasure' ? ' sun' : ''}${l.kind === 'boss' ? ' boss' : ''}${l.red ? ' red' : ''}`}
            style={{ left: p.x, top: p.y }}
            onClick={() => onOpen(l)}
            aria-label={`Level ${l.n}: ${l.title}${l.stars !== null ? `, ${l.stars} stars` : l.lock ? ', locked' : ''}`}
          >
            <span className="coin">{l.lock && !l.icon && !l.red ? '🔒' : l.icon ?? l.n}</span>
            {!l.icon && (
              <span className="st" aria-hidden="true">
                {[1, 2, 3].map((k) => <span key={k} className={`${k <= (l.stars ?? 0) ? 'on' : ''}${isFresh && k <= (l.stars ?? 0) ? ' pop' : ''}`} style={{ animationDelay: `${k * 0.18}s` }}>★</span>)}
              </span>
            )}
            {i !== ci && <span className={`tag ${side}`}>{l.n}. {l.title}</span>}
          </button>
        )
      })}
      {cur && (
        <div
          key={`${shake}-${say ?? ''}`}
          className={`trn-call${right ? '' : ' l'}${shake && say?.startsWith('Finish') ? ' shake' : ''}`}
          style={right ? { top: cur.y, left: cur.x + 50, maxWidth: w - cur.x - 52 } : { top: cur.y, right: w - cur.x + 50, maxWidth: cur.x - 52 }}
          aria-live="polite"
        >
          <img src={HOPPY} alt="Hoppy" />
          <div>
            <b>{levels[ci].n}. {levels[ci].title}</b>
            {say ?? (at >= 0 ? sayFor(levels[ci]) : 'All done today! See you tomorrow.')}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- charts (real data only; empty states say where it comes from) ----------
function SafeLine({ records }: { records: GameRecord[] }) {
  const games = [...records].sort((a, b) => a.endTime - b.endTime).slice(-10)
  if (games.length < 2) return <p className="trn-empty">Appears after Hoppy has checked two of your chess.com games.</p>
  const vals = games.map((g) => Math.round((safeShare([g]) ?? 0) * 100))
  const lo = Math.max(0, Math.min(50, Math.floor(Math.min(...vals) / 10) * 10))
  const L = 34, R = 330, T = 14, B = 140
  const y = (v: number) => B - ((v - lo) / (100 - lo)) * (B - T)
  const x = (i: number) => L + (i * (R - L)) / (games.length - 1)
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const mid = Math.round((lo + 100) / 2)
  const lastI = vals.length - 1
  return (
    <svg viewBox="0 0 340 170" width="100%" role="img" aria-label={`Safe moves in your last ${games.length} games, from ${vals[0]}% to ${vals[lastI]}%`}>
      <defs><linearGradient id="trn-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5cf6" stopOpacity=".35" /><stop offset="1" stopColor="#8a5cf6" stopOpacity="0" /></linearGradient></defs>
      {[lo, mid, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1.5" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fontWeight="800" fill="var(--muted)">{v}%</text>
        </g>
      ))}
      <polygon points={`${x(0)},${B} ${pts} ${x(lastI)},${B}`} fill="url(#trn-ga)" />
      <polyline points={pts} fill="none" stroke="var(--grape)" strokeWidth="3" strokeLinejoin="round" />
      {vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === lastI ? 5.5 : 4} fill={i === lastI ? 'var(--grape)' : '#fff'} stroke="var(--grape)" strokeWidth="2.5" />)}
      {games.map((g, i) => (i === 0 || i === lastI || i === Math.floor(lastI / 2) ? <text key={i} x={x(i)} y={B + 20} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="var(--muted)">{new Date(g.endTime * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text> : null))}
      <g transform={`translate(${Math.min(Math.max(x(lastI) - 30, 0), 280)},${Math.max(y(vals[lastI]) - 46, 0)})`}>
        <rect width="60" height="34" rx="8" fill="#fff" stroke="var(--line)" strokeWidth="2" />
        <text x="30" y="14" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="var(--muted)">last game</text>
        <text x="30" y="28" textAnchor="middle" fontSize="12" fontWeight="900" fill="var(--grape-d)">{vals[lastI]}%</text>
      </g>
    </svg>
  )
}

const DONUT_COLORS = ['var(--red)', 'var(--grape)', 'var(--blue)', 'var(--sun)', 'var(--lock-d)']
function Donut({ puzzles }: { puzzles: Puzzle[] }) {
  const counts = new Map<string, number>()
  for (const p of puzzles) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  const total = [...counts.values()].reduce((s, n) => s + n, 0)
  if (!total) return <p className="trn-empty">Appears when Hoppy has found mistakes in your games.</p>
  const sorted = [...counts].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 4).map(([c, n]) => [CATEGORY[c as keyof typeof CATEGORY]?.title ?? c, n] as [string, number])
  const rest = sorted.slice(4).reduce((s, [, n]) => s + n, 0)
  if (rest) top.push(['Other', rest])
  const r = 44
  const c = 2 * Math.PI * r
  const offs = top.map((_, i) => top.slice(0, i).reduce((a, [, n]) => a + (n / total) * c, 0))
  return (
    <>
      <svg viewBox="0 0 120 120" width="100%" style={{ maxWidth: 120, display: 'block', margin: '0 auto' }} role="img" aria-label={`${total} mistakes by type`}>
        {top.map(([t, n], i) => {
          const len = (n / total) * c
          return <circle key={t} cx="60" cy="60" r={r} fill="none" stroke={DONUT_COLORS[i]} strokeWidth="20" strokeDasharray={`${Math.max(len - 2, 0.5)} ${c - len + 2}`} strokeDashoffset={-offs[i]} transform="rotate(-90 60 60)" />
        })}
        <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="900" fill="var(--text)">{total}</text>
        <text x="60" y="73" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--muted)">mistakes</text>
      </svg>
      <div className="trn-legend">
        {top.map(([t, n], i) => <div key={t}><i style={{ background: DONUT_COLORS[i] }} /><em>{t}</em><span>{Math.round((100 * n) / total)}%</span></div>)}
      </div>
    </>
  )
}

function XpBars({ days, now }: { days: Prog['days']; now: number }) {
  const list = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - 6 + i)
    return { label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), xp: days.get(dateKey(d))?.xp ?? 0 }
  })
  const total = list.reduce((s, d) => s + d.xp, 0)
  const max = Math.max(...list.map((d) => d.xp), 1)
  const B = 76
  return (
    <>
      <div className="trn-big">{total.toLocaleString('en')} <small>XP</small></div>
      <svg viewBox="0 0 150 92" width="100%" role="img" aria-label={`XP of the last 7 days, ${total} in total`}>
        <line x1="0" x2="150" y1={B} y2={B} stroke="var(--line)" strokeWidth="1.5" />
        {list.map((d, i) => {
          const h = (d.xp / max) * (B - 6)
          const x = 6 + i * 20.5
          return (
            <g key={i}>
              <rect x={x} y={B - Math.max(h, d.xp ? 3 : 0)} width="12" height={Math.max(h, d.xp ? 3 : 0)} rx="4" fill={i === 6 ? 'var(--grape)' : '#c4adfb'} />
              <text x={x + 6} y={B + 13} textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--muted)">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </>
  )
}

// ---------- chess.com card on the Training page ----------
function ChessComCard({ own, player, rating, checked, fresher, reading, analyzer }: { own: boolean; player: string; rating: number | null; checked: number; fresher: number | null; reading: boolean; analyzer: AnalyzerState }) {
  if (!own) {
    return (
      <div className="trn-cc">
        <div className="row"><img className="hp" src={HOPPY} alt="Hoppy" /><div className="tx"><b>Bring your real games</b><small>Connect chess.com and I turn your own mistakes into levels.</small></div></div>
        <button type="button" className="btn sm dark" onClick={() => go('connect')}>Connect chess.com</button>
      </div>
    )
  }
  if (reading) {
    return (
      <button type="button" className="trn-cc" onClick={() => go('connect/read')}>
        <span className="row"><img className="hp" src={HOPPY} alt="" /><span className="tx"><b>Hoppy is reading your games</b><small>{analyzer.analyzed} of {analyzer.total} checked</small></span></span>
        <span className="trn-track mini"><i style={{ width: `${analyzer.total ? (100 * analyzer.analyzed) / analyzer.total : 0}%`, background: 'var(--grape)' }} /></span>
      </button>
    )
  }
  return (
    <div className="trn-cc">
      <div className="row">
        <Avatar name={player} />
        <div className="tx"><b>{player}{rating ? ` · Rapid ${rating}` : ''}</b><small>{checked ? `${checked} games checked by Hoppy` : 'No game checked yet'}</small></div>
        {!!fresher && <span className="trn-new">{fresher} new</span>}
      </div>
      {fresher ? (
        <div className="trn-two-b">
          <button type="button" className="btn sm ghost" onClick={() => go('games')}>Your games</button>
          <button type="button" className="btn sm red" onClick={() => go('connect/read')}>Check {fresher}</button>
        </div>
      ) : (
        <button type="button" className="btn sm ghost" onClick={() => go('games')}>Your games</button>
      )}
    </div>
  )
}

// ---------- the shelf: every trainer of the old Training Camp ----------
function T({ e, bg, title, sub, to, off }: { e: string; bg: string; title: string; sub: string; to?: string; off?: boolean }) {
  return (
    <button type="button" className="tool" disabled={off} onClick={() => to && go(to)}>
      <span className="e" style={{ background: bg }} aria-hidden="true">{e}</span><b>{title}</b><small>{sub}</small>
    </button>
  )
}
function Shelf({ puzzles, own, fresher }: { puzzles: Puzzles; own: boolean; fresher: number | null }) {
  const winning = useMemo(() => puzzles.puzzles.filter((p) => clampScore(p.scoreBefore) >= 300), [puzzles.puzzles])
  const g = 'var(--green-t)', b = 'var(--blue-t)', r = 'var(--red-t)', p = 'var(--grape-t)', s = 'var(--sun-t)'
  return (
    <div className="trn-shelf">
      <div><h5>Your openings</h5><div className="trn-tools">
        <T e="🗺" bg={g} title="Battle plans" sub="Lines that are due" to="review" />
        <T e="🪙" bg={g} title="All openings" sub="Every line" to="path" />
        <T e="🧭" bg={g} title="Opening atlas" sub="New weapons" to="atlas" />
        <T e="🪤" bg={g} title="Attacks & traps" sub="With the defence" to="attacks" />
        <T e="🔁" bg={g} title="Your habits" sub="Where you leave your book" to="habits" />
        <T e="🃏" bg={g} title="Today's cards" sub="Everything due, mixed" to="daily" />
      </div></div>
      <div><h5>Tactics & skills</h5><div className="trn-tools">
        <T e="🎯" bg={b} title="Daily Threat Check" sub="One a day" to="threat-check" />
        <T e="💥" bg={b} title="Square Rush" sub="60 seconds" to="rush" />
        <T e="🛡" bg={b} title="Armoury" sub="Tactics to endgame" to="armoury" />
        <T e="🗼" bg={b} title="Watchtower" sub="Check the threat first" to="threats" />
      </div></div>
      <div><h5>Your own games</h5>
        <button type="button" className="trn-cc" style={{ marginBottom: 8 }} onClick={() => go(own ? 'games' : 'connect')}>
          <span className="row"><span className="trn-av">♟</span><span className="tx"><b>Your chess.com games</b><small>Every finished game, checked by Hoppy</small></span>{!!fresher && <span className="trn-new">{fresher} new</span>}</span>
        </button>
        <div className="trn-tools">
          <T e="🩹" bg={r} title="Lost battles" sub="Mistakes as puzzles" to="puzzles" />
          <T e="🔍" bg={r} title="Check your chess" sub="What costs you points?" to="check" />
          <T e="🧩" bg={r} title="My weaknesses" sub="By type" to="weaknesses" />
          <T e="📊" bg={r} title="How well did I play?" sub="Test" to="accuracy" />
        </div>
      </div>
      <div><h5>Play Hoppy</h5><div className="trn-tools">
        <T e="🐴" bg={p} title="Sparring" sub="A game vs Hoppy-Bot" to="play" />
        <T e="💰" bg={p} title="Treasure chest" sub="Win your winning positions" to={winning.length ? 'play/puzzle/' + encodeURIComponent(pickOfDay(winning)!.id) : undefined} off={!winning.length} />
        <T e="🔥" bg={p} title="Warm-up" sub="2 min before chess.com" to="warmup" />
      </div></div>
      <div><h5>More</h5><div className="trn-tools">
        <T e="🚀" bg={s} title="Fast travel" sub="Every city in a list" to="road" />
        <T e="🏆" bg={s} title="Trophies" sub="What you have won" to="trophies" />
        <T e="👫" bg={s} title="Together" sub="Watch and help" to="watch" />
        <T e="⛺" bg={s} title="Old Training Camp" sub="As before" to="camp" />
      </div></div>
    </div>
  )
}

// =====================================================================================================
// Connect chess.com: name → "Is this you?" → Hoppy reads the last 20 rapid games → mistakes go on the path
export function Connect({ step, player, onPlayer, analyzer, puzzles }: { step?: string; player: string; onPlayer: (p: string) => void; analyzer: AnalyzerState; puzzles: Puzzles }) {
  const [phase, setPhase] = useState<'ask' | 'read'>(step === 'read' && hasOwnPlayer() ? 'read' : 'ask')
  const [name, setName] = useState(hasOwnPlayer() ? player : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<{ username: string; avatar?: string; rapid: number | null } | null>(null)
  const [games, setGames] = useState<MiniGame[] | null>(null)
  const started = useRef(false)

  async function find() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const f = await fetchProfile(name)
      if (!f) setError(`chess.com does not know “${name.trim()}”. Check the spelling.`)
      else {
        setFound(f)
        feedback.success()
      }
    } catch {
      setError('chess.com cannot be reached right now. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }
  async function yes() {
    if (!found) return
    if (found.username !== player || !hasOwnPlayer()) {
      if (found.username !== player) await resetAnalyzer()
      setPlayer(found.username)
      onPlayer(found.username)
    }
    setPhase('read')
  }

  // reading: fetch the newest 20 rapid games and let the engine run (it keeps going when you leave this page)
  useEffect(() => {
    if (phase !== 'read' || started.current) return
    started.current = true
    const who = found?.username ?? player
    recentRapid(who, 20)
      .then((full) => {
        const mini = cacheGames(who, full)
        setGames(mini)
        if (full.length) analyzeOnly(full)
      })
      .catch(() => setError('chess.com cannot be reached right now. Check your connection and try again.'))
  }, [phase, found, player])
  const running = analyzer.status === 'running' || analyzer.status === 'loading'
  const result = phase === 'read' && !!games?.length && analyzer.status === 'done'
  const lastTick = useRef(0)
  useEffect(() => {
    if (phase === 'read' && analyzer.analyzed > lastTick.current) feedback.tick(analyzer.analyzed)
    lastTick.current = analyzer.analyzed
  }, [analyzer.analyzed, phase])

  const who = found?.username ?? player

  return (
    <div className="trn">
      <div className="trn-scroll">
        <div className="trn-in full">
          <div className="trn-hd">
            <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to Training">←</button>
            <h2>{phase === 'ask' ? 'Connect chess.com' : !result ? 'Hoppy reads your games' : `${who}'s chess today`}</h2>
          </div>

          {phase === 'ask' && (
            <>
              <div className="trn-talk"><img src={HOPPY} alt="Hoppy" /><p>What is your name on chess.com? I only read games that are already finished. I never post anything.</p></div>
              <div className="trn-field">
                <label htmlFor="trn-ccname">Your chess.com username</label>
                <input id="trn-ccname" value={name} onChange={(e) => { setName(e.target.value); setFound(null); setError(null) }} onKeyDown={(e) => e.key === 'Enter' && find()} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="e.g. l0o2" />
              </div>
              {error && <p className="trn-bad" role="alert">{error}</p>}
              {!found && <button type="button" className="btn" disabled={busy || !name.trim()} onClick={find}>{busy ? 'Looking for you…' : 'Find me'}</button>}
              {found && (
                <div className="trn-found">
                  <Avatar name={found.username} src={found.avatar} />
                  <b>{found.username}</b>
                  <div className="trn-kv">{found.rapid ? <span>Rapid {found.rapid}</span> : <span>No rapid rating yet</span>}</div>
                  <div style={{ fontWeight: 900 }}>Is this you?</div>
                  <div className="trn-two-b">
                    <button type="button" className="btn ghost sm" onClick={() => setFound(null)}>No</button>
                    <button type="button" className="btn sm" onClick={yes}>Yes, that's me</button>
                  </div>
                </div>
              )}
              <p className="trn-fine">No password. Only public, finished games. Fair play: Hoppy never helps during a running game.</p>
            </>
          )}

          {phase === 'read' && !result && (
            <>
              {error && <p className="trn-bad" role="alert">{error}</p>}
              {games && !games.length && <p className="trn-bad">No rapid games found for {who}. Play a few rapid games on chess.com, then come back.</p>}
              <div className="trn-ring">
                <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true">
                  <circle cx="85" cy="85" r="72" fill="none" stroke="var(--line)" strokeWidth="14" />
                  <circle cx="85" cy="85" r="72" fill="none" stroke="var(--grape)" strokeWidth="14" strokeLinecap="round" strokeDasharray="452" strokeDashoffset={452 - (452 * analyzer.analyzed) / Math.max(analyzer.total, 1)} transform="rotate(-90 85 85)" style={{ transition: 'stroke-dashoffset .3s' }} />
                </svg>
                <div className="c"><b>{analyzer.analyzed}</b><small>of {analyzer.total || games?.length || 20} games</small></div>
              </div>
              {games && (
                <div className="trn-games" aria-label="Your games: W won, L lost, D draw">
                  {games.map((g, i) => {
                    const r = resultOf(g, who).r
                    return <span key={g.uuid} className={i < analyzer.analyzed ? `g pop ${r}` : 'g'}>{i < analyzer.analyzed ? r : ''}</span>
                  })}
                </div>
              )}
              <div className="trn-count">
                <div><b>{analyzer.analyzed}</b><small>games checked</small></div>
                <div><b>{analyzer.found}</b><small>new mistakes found</small></div>
              </div>
              <div className="trn-talk">
                <img src={HOPPY} alt="Hoppy" />
                <p aria-live="polite">{analyzer.current ? `Game ${analyzer.analyzed + 1} of ${analyzer.total}: against ${analyzer.current.opponent}, move ${Math.ceil(analyzer.current.ply / 2)} of ${Math.ceil(analyzer.current.plies / 2)}.` : running ? 'I fetch your newest rapid games…' : analyzer.status === 'error' ? `Something went wrong: ${analyzer.error ?? 'unknown'}.` : 'I start with your newest rapid game.'}</p>
              </div>
              <button type="button" className="btn ghost" onClick={() => go('tent')}>Keep training meanwhile</button>
              <p className="trn-fine">The check runs on this phone while Hoppy is open.</p>
            </>
          )}

          {result && games && <ConnectResult who={who} rating={found?.rapid ?? null} games={games} puzzles={puzzles} />}
        </div>
      </div>
    </div>
  )
}

function ConnectResult({ who, rating: given, games, puzzles }: { who: string; rating: number | null; games: MiniGame[]; puzzles: Puzzles }) {
  const [records, setRecords] = useState<GameRecord[]>([])
  const [rating, setRating] = useState(given)
  useEffect(() => {
    getGameRecords(who).then(setRecords).catch(() => {})
    if (rating === null) fetchRapidRating(who).then(setRating).catch(() => {})
  }, [who, rating])
  const keys = new Set(games.map((g) => gameKey(who, g.uuid)))
  const mine = records.filter((r) => keys.has(r.uuid))
  const uuids = new Set(games.map((g) => g.uuid))
  const found = mineOf(puzzles.puzzles, who).filter((p) => uuids.has(p.gameUuid)).sort((a, b) => b.endTime - a.endTime)
  const shape = shapeReport(mine.length, found)
  const safe = safeShare(mine)
  const plan = loadPlan()
  const red = plan?.levels.some((l) => l.red) ? new Set(plan.levels.filter((l) => l.red).map((l) => l.key.slice(8))) : new Set(redCandidates(puzzles, who).slice(0, 2).map((r) => r.id))
  function add() {
    const p = loadPlan()
    if (p) savePlan(addRed(p, redCandidates(puzzles, who)))
    go('tent')
  }
  return (
    <>
      <div className="trn-tiles">
        <div className="trn-tile t-blue"><div className="top">Rapid</div><b>{rating ?? '–'}</b><small>on chess.com</small></div>
        <div className="trn-tile t-green"><div className="top">Safe moves</div><b>{safe === null ? '–' : `${Math.round(safe * 100)}%`}</b><small>last {mine.length} games</small></div>
        <div className="trn-tile t-grape"><div className="top">Big mistakes</div><b>{shape.mistakes.toFixed(1)}</b><small>per game</small></div>
        <div className="trn-tile t-sun"><div className="top">Threats missed</div><b>{shape.threats.toFixed(1)}</b><small>per game</small></div>
      </div>
      {found.length ? (
        <>
          <div className="trn-talk"><img src={HOPPY} alt="Hoppy" /><p>I found {found.length} {found.length === 1 ? 'mistake' : 'mistakes'}. {red.size ? `${red.size === 1 ? 'One goes' : 'Two go'} on today's path, the others wait in Lost battles.` : 'They wait for you in Lost battles.'}</p></div>
          <div className="trn-list">
            {found.slice(0, 8).map((p) => (
              <div className="trn-mist" key={p.id}>
                <span className="k" aria-hidden="true">{p.kind === 'missed-mate' ? '👑' : '⚔️'}</span>
                <div><b>{p.category ? CATEGORY[p.category].title : p.kind === 'missed-mate' ? 'Missed a mate' : 'Big mistake'}</b><small>Move {Math.ceil(p.ply / 2)} · vs {p.opponent} · {ago(p.endTime)}</small></div>
                <span className={`to ${red.has(p.id) ? 'tp' : 'tl'}`}>{red.has(p.id) ? 'Today' : 'Lost battles'}</span>
              </div>
            ))}
          </div>
          <button type="button" className="btn red" onClick={add}>{red.size ? `Add ${red.size} to my path` : 'Back to Training'}</button>
        </>
      ) : (
        <>
          <div className="trn-talk"><img src={HOPPY} alt="Hoppy" /><p>No big mistake in these games. Every move was safe or close.</p></div>
          <button type="button" className="btn" onClick={() => go('tent')}>Back to Training</button>
        </>
      )}
    </>
  )
}

// =====================================================================================================
// Your games: the newest rapid games with safe moves and mistakes to fix
export function YourGames({ player, puzzles }: { player: string; puzzles: Puzzles }) {
  const [games, setGames] = useState<MiniGame[] | null>(null)
  const [records, setRecords] = useState<Map<string, GameRecord>>(new Map())
  const [rating, setRating] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'L' | 'm'>('all')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    recentGames(player).then(setGames).catch(() => setError('chess.com cannot be reached right now.'))
    getGameRecords(player).then((r) => setRecords(new Map(r.map((x) => [x.uuid, x])))).catch(() => {})
    fetchRapidRating(player).then(setRating).catch(() => {})
  }, [player])
  const mine = mineOf(puzzles.puzzles, player)
  const rows = (games ?? []).map((g) => ({ g, ...resultOf(g, player), rec: records.get(gameKey(player, g.uuid)) }))
  const shown = rows.filter((x) => filter === 'all' || (filter === 'L' ? x.r === 'L' : (x.rec?.blunders ?? 0) > 0))
  const fresher = rows.filter((x) => !x.rec).length
  const col = { W: 'var(--green)', L: 'var(--red)', D: '#b9b3c9' }
  function openGame(x: (typeof rows)[number]) {
    if (!x.rec) return setToast('Not checked yet. Tap “Check new” first.')
    if (!x.rec.blunders) return setToast('Clean game: no big mistake. Every move was safe or close.')
    const p = mine.filter((q) => q.gameUuid === x.g.uuid).sort((a, b) => a.ply - b.ply)[0]
    if (p) launch('mistake/' + encodeURIComponent(p.id))
  }
  return (
    <div className="trn">
      <div className="trn-scroll">
        <div className="trn-in full">
          <div className="trn-hd">
            <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to Training">←</button>
            <h2>Your games</h2>
          </div>
          <div className="trn-cc">
            <div className="row">
              <Avatar name={player} />
              <div className="tx"><b>{player}</b><small>{rating ? `Rapid ${rating} · ` : ''}{records.size} games checked</small></div>
              <button type="button" className="btn sm auto" onClick={() => go('connect/read')}>{fresher ? `Check ${fresher} new` : 'Check new'}</button>
            </div>
          </div>
          <div className="trn-filt" role="tablist">
            {([['all', 'All'], ['L', 'Losses'], ['m', 'With mistakes']] as const).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{t}</button>
            ))}
          </div>
          {error && <p className="trn-bad">{error}</p>}
          {!games && !error && <p className="trn-empty">Loading your games from chess.com…</p>}
          <div className="trn-list">
            {shown.map((x) => {
              const s = x.rec ? safeShare([x.rec]) : null
              return (
                <button key={x.g.uuid} type="button" className="gr" onClick={() => openGame(x)}>
                  <span className="res" style={{ background: col[x.r] }}>{x.r}</span>
                  <span style={{ minWidth: 0 }}><b>{x.me === 'w' ? 'White' : 'Black'} vs {x.opp.username} ({x.opp.rating})</b><small>Rapid · {ago(x.g.end_time)}</small></span>
                  <span className="sp">{s === null ? '–' : `${Math.round(s * 100)}% safe`}<i className={!x.rec ? 'no' : x.rec.blunders ? '' : 'ok'}>{!x.rec ? 'not checked' : x.rec.blunders ? `${x.rec.blunders} to fix` : 'clean'}</i></span>
                  <span aria-hidden="true" style={{ color: 'var(--muted)', fontWeight: 900 }}>›</span>
                </button>
              )
            })}
          </div>
          {games && !shown.length && <p className="trn-empty">No game here.</p>}
          <p className="trn-fine">Only finished games. Hoppy never shows help during a running game.</p>
        </div>
      </div>
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// One mistake from your own game (a red level or a row in Your games)
export function MistakeOne({ id, puzzles, progress }: { id: string; puzzles: Puzzles; progress: Prog }) {
  const puzzle = puzzles.puzzles.find((p) => p.id === id)
  if (!puzzle) {
    return (
      <div className="screen">
        <div className="done">
          <div className="done-title">{puzzles.puzzles.length ? 'This mistake is gone' : 'Loading…'}</div>
          <div className="done-actions"><button type="button" className="primary" onClick={() => go('tent')}>Training</button></div>
        </div>
      </div>
    )
  }
  return (
    <PuzzleView
      key={puzzle.id}
      puzzle={puzzle}
      progress="Your game"
      onSolved={async (m) => {
        report('mistake:' + puzzle.id, starsFromMistakes(m))
        return { srs: await puzzles.record(puzzle.id, m), reward: await progress.recordPuzzle(m) }
      }}
      onNext={() => go('tent')}
      isLast
    />
  )
}
