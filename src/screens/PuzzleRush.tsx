import { useEffect, useMemo, useRef, useState } from 'react'
import { CountUp } from '../components/CountUp'
import { go } from '../hooks/useHashRoute'
import type { usePuzzles } from '../hooks/usePuzzles'
import PUZZLES from '../data/lichess-puzzles.json'
import { TECHNIQUES } from '../lib/armoury'
import { earn } from '../lib/king'
import {
  PR_COMBO,
  PR_LIVES,
  PR_TIME,
  buildQueue,
  isOver,
  miss,
  praiseFor,
  remember,
  solve,
  startRush,
  starsFor,
  timeLeft,
  type RushItem,
  type RushState,
} from '../lib/puzzleRush'
import { addTop, audio, boom, buzz, confetti, ding, fanfare, isRecord, loadTop, saveTop, step, wrong, type TopRun } from '../lib/rushFx'
import { mineOf } from '../lib/trainingToday'
import { report } from '../lib/trainingPath'
import { CATEGORY } from '../lib/weakness'
import { OnePuzzle, type LPuzzle } from './King'

// Puzzle Rush #/puzzle-rush (BAUPLAN 34B, Lu 16.11.): puzzles on time with the feeling of Square Rush – 3 minutes,
// 3 lives, the tone climbs with the streak, 3 right = explosion + 5 s, a new record is celebrated. Afterwards
// "Look again": the missed ones without time, with the answer and why. The fun extra – it does not count for
// "safe moves in %" and does not replace the Daily Threat Check.

const BEST_KEY = 'hoppy-prush-best'
const TOP_KEY = 'hoppy-prush-top'
const AGAIN_KEY = 'hoppy-prush-again'

type Lichess = LPuzzle & { theme: string }
function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // not remembered
  }
}

// every Lichess puzzle once, with the theme it was chosen for
const LICHESS: Lichess[] = (() => {
  const seen = new Set<string>()
  const out: Lichess[] = []
  for (const [theme, list] of Object.entries(PUZZLES as Record<string, LPuzzle[]>))
    for (const p of list)
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push({ ...p, theme })
      }
  return out
})()
const WHY: Record<string, string> = Object.fromEntries(TECHNIQUES.map((t) => [t.theme, t.weapon]))

export function PuzzleRush({ puzzles, player }: { puzzles: ReturnType<typeof usePuzzles>; player: string }) {
  const own = useMemo(
    () =>
      mineOf(puzzles.puzzles, player).map<LPuzzle & { own: true }>((p) => ({
        id: 'own:' + p.id,
        fen: p.fen,
        moves: [p.best],
        rating: 800,
        direct: true,
        why: p.category ? CATEGORY[p.category].rule : undefined,
        own: true,
      })),
    [puzzles.puzzles, player],
  )
  const byId = useMemo(() => new Map<string, LPuzzle & { theme?: string; own?: boolean }>([...LICHESS, ...own].map((p) => [p.id, p])), [own])

  const [phase, setPhase] = useState<'intro' | 'run' | 'over' | 'review'>('intro')
  const [queue, setQueue] = useState<RushItem[]>([])
  const [i, setI] = useState(0)
  const [s, setS] = useState<RushState>(() => startRush(0))
  const [lock, setLock] = useState(false)
  const [left, setLeft] = useState(1)
  const [word, setWord] = useState<{ text: string; n: number; big?: boolean } | null>(null)
  const [best, setBest] = useState(() => read(BEST_KEY, 0))
  const [top, setTop] = useState<TopRun[]>(() => loadTop(TOP_KEY))
  const [showTop, setShowTop] = useState(false)
  const [record, setRecord] = useState<{ from: number; to: number; nuts: number } | null>(null)
  const [review, setReview] = useState(0)
  const [reviewSolved, setReviewSolved] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fx = useMemo(() => confetti(() => canvas.current), [])
  const sRef = useRef(s)
  const passed = useRef(false)
  const solvedIds = useRef<string[]>([])
  useEffect(() => {
    sRef.current = s
  })
  useEffect(() => () => fx.stop(), [fx])

  function start() {
    audio()
    const items: RushItem[] = LICHESS.map((p) => ({ id: p.id, rating: p.rating, theme: p.theme }))
    const mine: RushItem[] = own.map((p) => ({ id: p.id, rating: p.rating, own: true }))
    setQueue(buildQueue(items, mine, read<string[]>(AGAIN_KEY, []), Math.random))
    setI(0)
    setS(startRush(Date.now()))
    setLock(false)
    setRecord(null)
    setReview(0)
    passed.current = false
    solvedIds.current = []
    fx.stop()
    setPhase('run')
  }

  function finish(cur: RushState) {
    setPhase('over')
    const stars = starsFor(cur.score)
    const rec = isRecord(cur.score, best)
    if (cur.score > best) {
      setBest(cur.score)
      write(BEST_KEY, cur.score)
    }
    const t = addTop(top, { score: cur.score, at: Date.now() })
    setTop(t)
    saveTop(TOP_KEY, t)
    report('puzzle-rush', stars)
    // repetition: missed Lichess puzzles come back in later runs, your own missed ones become due again
    write(AGAIN_KEY, remember(read<string[]>(AGAIN_KEY, []), cur.missed.filter((id) => !id.startsWith('own:')), solvedIds.current))
    for (const id of cur.missed) if (id.startsWith('own:')) void puzzles.record(id.slice(4), 1)
    if (rec) {
      const nuts = earn('prush-record/' + cur.score, 3)
      setRecord({ from: best, to: cur.score, nuts })
      window.setTimeout(() => {
        fanfare()
        buzz([60, 50, 60, 50, 200])
        ;[0.5, 0.2, 0.8, 0.3, 0.7].forEach((x, k) => window.setTimeout(() => center(x, 0.4 + (k % 2) * 0.2, 110, true), k * 140))
      }, 150)
    } else if (stars)
      window.setTimeout(() => {
        boom()
        center(0.5, 0.5, 120, true)
      }, 150)
  }

  // the clock (and the end when time is up)
  useEffect(() => {
    if (phase !== 'run') return
    let id = 0
    const tick = () => {
      const cur = sRef.current
      const now = Date.now()
      setLeft(timeLeft(cur, now) / PR_TIME)
      if (isOver(cur, now)) return finish(cur)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
    // the clock starts once per run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function center(x: number, y: number, n: number, big: boolean) {
    const c = canvas.current
    if (c) fx.burst(c.clientWidth * x, c.clientHeight * y, n, big)
  }
  const item = queue[i]
  const next = () => {
    setLock(false)
    setI((k) => k + 1)
  }

  function onSolved() {
    if (!item || lock) return
    setLock(true)
    solvedIds.current.push(item.id)
    const r = solve(s, item.rating)
    setS(r.s)
    step(r.s.streak)
    buzz(15)
    center(0.5, 0.5, 22, false)
    // passing your best in the run: once, a surprise
    if (!passed.current && best > 0 && r.s.score > best) {
      passed.current = true
      window.setTimeout(() => {
        ding()
        setWord({ text: 'Record!', n: Date.now(), big: true })
      }, 300)
    }
    if (r.boom) {
      window.setTimeout(() => {
        boom()
        center(0.5, 0.5, 90, true)
        buzz([30, 40, 60])
        setWord({ text: `${praiseFor(item)} +5 s`, n: Date.now() })
      }, 120)
    } else setWord({ text: praiseFor(item), n: Date.now() })
    window.setTimeout(next, 650)
  }
  function onMistake() {
    if (!item || lock) return
    setLock(true)
    const n = miss(s, item.id)
    setS(n)
    wrong()
    buzz(80)
    // the right move is shown for a moment (the arrow), then the next puzzle – or the end
    window.setTimeout(() => (n.lives <= 0 ? finish(n) : next()), 1100)
  }

  const stars = starsFor(s.score)
  const missed = s.missed.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p)
  const cur = item ? byId.get(item.id) : undefined

  if (phase === 'review') {
    const p = missed[review]
    if (!p) {
      return (
        <div className="screen rush prush">
          <div className="done">
            <div className="done-title">All looked at again</div>
            <p>These come back in your next runs until you solve them.</p>
            <div className="done-actions">
              <button type="button" onClick={() => go('today')}>Daily</button>
              <button type="button" className="primary" onClick={start}>Play again</button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="screen rush prush">
        <div className="rush-head">
          <button type="button" className="back" onClick={() => setPhase('over')} aria-label="Back">←</button>
          <h1>Look again · {review + 1} of {missed.length}</h1>
        </div>
        <p className="note">No clock now. {p.own ? 'A mistake from your own game.' : 'Find the move you missed.'}</p>
        <OnePuzzle key={'r' + p.id} p={p} onMistake={() => {}} onSolved={() => setReviewSolved(true)} />
        {reviewSolved && (
          <div className="king-fb ok">
            <b>{p.own ? 'Fixed!' : praiseFor({ id: p.id, rating: p.rating, theme: (p as Lichess).theme })}</b>
            <p>{p.why ?? WHY[(p as Lichess).theme] ?? ''}</p>
            <button type="button" className="primary wide" onClick={() => { setReview(review + 1); setReviewSolved(false) }}>Next</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="screen rush prush">
      <div className="rush-head">
        <button type="button" className="back" onClick={() => go('today')} aria-label="Back to Daily">←</button>
        <h1>Puzzle Rush</h1>
      </div>
      <div className="rush-hud">
        <div className="rush-score"><small>Score</small>{s.score}</div>
        <div className="pr-lives" aria-label={`${s.lives} of ${PR_LIVES} lives`}>
          {Array.from({ length: PR_LIVES }, (_, k) => <span key={k} className={k < s.lives ? '' : 'off'}>❤</span>)}
        </div>
        <button type="button" className="rush-score best" aria-expanded={showTop} onClick={() => setShowTop(!showTop)}><small>Best {top.length > 1 ? (showTop ? '▴' : '▾') : ''}</small>{best}</button>
      </div>
      {showTop && top.length > 0 && (
        <ol className="rush-top" aria-label="Your 5 best runs">
          {top.map((r, k) => (
            <li key={r.at}><b>{k + 1}.</b> {r.score}<small>{new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></li>
          ))}
        </ol>
      )}
      <div className="rush-combo pr-combo" aria-label={`Combo ${s.combo} of ${PR_COMBO}`}>
        {Array.from({ length: PR_COMBO }, (_, k) => <i key={k} className={phase === 'run' && k < s.combo ? 'on' : ''} />)}
      </div>
      <div className="pr-stage">
        {phase === 'run' && cur ? (
          <OnePuzzle key={cur.id + '/' + i} p={cur} onMistake={onMistake} onSolved={onSolved} />
        ) : (
          <div className="pr-blank" />
        )}
        <canvas ref={canvas} className="rush-fx" aria-hidden="true" />
        {word && <div key={word.n} className={`rush-word${word.big ? ' rec' : ' pr-word'}`} aria-hidden="true">{word.text}</div>}
        {phase !== 'run' && (
          <div className="rush-overlay">
            {phase === 'over' && record ? (
              <div className="rush-record">
                <small>New record!</small>
                <CountUp from={record.from} to={record.to} />
                <p>Your best was {record.from}. Now it is {record.to}.</p>
                <div className="rush-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((k) => <span key={k} className={k < stars ? '' : 'off'}>★</span>)}</div>
                {record.nuts > 0 && <span className="rush-nuts">+{record.nuts} 🌰</span>}
                <div className="pr-end-btns">
                  {missed.length > 0 && <button type="button" className="rush-btn ghost" onClick={() => setPhase('review')}>Look again ({missed.length})</button>}
                  <button type="button" className="rush-btn" onClick={start}>Beat it again</button>
                </div>
              </div>
            ) : phase === 'over' ? (
              <>
                <h2>{s.lives <= 0 ? 'Out of lives' : 'Time!'}</h2>
                <div className="rush-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((k) => <span key={k} className={k < stars ? '' : 'off'}>★</span>)}</div>
                <p>{s.score} points · {s.solved} solved · {s.missed.length} missed</p>
                <div className="pr-end-btns">
                  {missed.length > 0 && <button type="button" className="rush-btn ghost" onClick={() => setPhase('review')}>Look again ({missed.length})</button>}
                  <button type="button" className="rush-btn" onClick={start}>Play again</button>
                </div>
              </>
            ) : (
              <>
                <h2>Puzzle Rush</h2>
                <p>3 minutes, 3 lives. Easy first, then harder – your own mistakes are in it too. Three right in a row: +5 seconds.</p>
                <button type="button" className="rush-btn" onClick={start}>Play</button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="rush-time" aria-hidden="true"><i style={{ width: `${(phase === 'run' ? left : 1) * 100}%` }} className={phase === 'run' && left < 1 / 6 ? 'low' : ''} /></div>
      <p className="note small">Puzzles from the Lichess database and from your own games. Just for fun – it does not change your “safe moves”.</p>
    </div>
  )
}
