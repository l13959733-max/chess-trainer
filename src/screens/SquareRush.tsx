import { report } from '../lib/trainingPath'
import { defaultPieces } from 'react-chessboard'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CountUp } from '../components/CountUp'
import { go } from '../hooks/useHashRoute'
import { earn } from '../lib/king'
import { addTop, audio, boom, buzz, confetti, ding, fanfare, isRecord, loadTop, saveTop, step, wrong, type TopRun } from '../lib/rushFx'
import {
  COMBO,
  COMBO_BONUS,
  COMBO_TIME,
  MOVES_PER_PIECE,
  PAWN_MOVES,
  RUSH_NAMES,
  RUSH_ORDER,
  RUSH_SECONDS,
  praise,
  pointsFor,
  rushMoves,
  sqCoords,
  sqName,
  starsFor,
  type RushPiece,
} from '../lib/rush'

// Square Rush (Lu, 12.11.: „wie Candy Crush – dreimal, dann explodiert es, mit Geräuschen, Vibration, Feeling“).
// Hoppy calls a square, you tap it, the piece jumps. Three right in a row explode. 60 seconds a round.

// Lu, 15.11.: the pieces look like on all our boards (react-chessboard's set), in the colour you play
function Piece({ p, black }: { p: RushPiece; black: boolean }) {
  const draw = defaultPieces[`${black ? 'b' : 'w'}${p}` as keyof typeof defaultPieces]
  return <>{draw()}</>
}
const BEST_KEY = 'hoppy-rush-best'
const OPTS_KEY = 'hoppy-rush-options'
const TOP_KEY = 'hoppy-rush-top'

interface Game {
  p: RushPiece
  pi: number
  sq: string
  moved: number
  target: string
  legal: string[]
  score: number
  streak: number
  combo: number
  hits: number
  miss: number
  end: number
}
interface Opts {
  letters: boolean
  dots: boolean
  black: boolean
}

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // not remembered
  }
}
const rnd = (n: number) => Math.floor(Math.random() * n)

export function SquareRush() {
  const [opts, setOpts] = useState<Opts>(() => load(OPTS_KEY, { letters: true, dots: true, black: false }))
  const [best, setBest] = useState(() => load(BEST_KEY, 0))
  const [g, setG] = useState<Game | null>(null)
  const [over, setOver] = useState<Game | null>(null)
  const [left, setLeft] = useState(1)
  const [tell, setTell] = useState<{ tapped: string; target: string } | null>(null)
  const [flash, setFlash] = useState<{ sq: string; kind: 'hit' | 'miss'; n: number } | null>(null)
  const [word, setWord] = useState<{ text: string; n: number } | null>(null)
  const [shake, setShake] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fx = useMemo(() => confetti(() => canvas.current), [])
  const gameRef = useRef<Game | null>(null)
  // BAUPLAN 34A (Lu, 16.11.): the record as its own moment, a top 5, and once in a run a surprise "Record!"
  const [top, setTop] = useState<TopRun[]>(() => loadTop(TOP_KEY))
  const [showTop, setShowTop] = useState(false)
  const [record, setRecord] = useState<{ from: number; to: number; nuts: number } | null>(null)
  const passed = useRef(false)
  useEffect(() => {
    gameRef.current = g
  })

  // the 60-second clock
  useEffect(() => {
    if (!g) return
    let id = 0
    const step = () => {
      const cur = gameRef.current
      if (!cur) return
      const rest = Math.max(0, cur.end - Date.now())
      setLeft(rest / (RUSH_SECONDS * 1000))
      if (rest <= 0) return finish(cur)
      id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
    // the clock starts once per round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g === null])

  function order(base: Omit<Game, 'target' | 'legal'> & Partial<Game>): Game {
    let cur = { ...base, target: '', legal: [] as string[] }
    for (let tries = 0; tries < 10; tries++) {
      const [f, r] = sqCoords(cur.sq)
      const legal = rushMoves(cur.p, f, r, opts.black)
      if (legal.length && !(cur.p === 'P' && cur.moved >= PAWN_MOVES) && !(cur.p !== 'P' && cur.moved >= MOVES_PER_PIECE))
        return { ...cur, legal, target: legal[rnd(legal.length)] }
      cur = nextPiece(cur)
    }
    return cur
  }
  function nextPiece<T extends { pi: number }>(cur: T): T & { p: RushPiece; sq: string; moved: number } {
    const pi = (cur.pi + 1) % RUSH_ORDER.length
    const p = RUSH_ORDER[pi]
    const sq = p === 'P' ? sqName(rnd(8), opts.black ? 6 : 1) : sqName(rnd(8), rnd(8))
    return { ...cur, pi, p, sq, moved: 0 }
  }

  function start() {
    audio()
    setOver(null)
    setTell(null)
    setRecord(null)
    passed.current = false
    fx.stop()
    const fresh = nextPiece({ pi: -1, score: 0, streak: 0, combo: 0, hits: 0, miss: 0, end: Date.now() + RUSH_SECONDS * 1000 })
    setG(order(fresh))
  }
  function finish(cur: Game) {
    setG(null)
    setOver(cur)
    const rec = isRecord(cur.score, best)
    if (cur.score > best) {
      setBest(cur.score)
      store(BEST_KEY, cur.score)
    }
    const nextTop = addTop(top, { score: cur.score, at: Date.now() })
    setTop(nextTop)
    saveTop(TOP_KEY, nextTop)
    report('rush', starsFor(cur.score)) // today's path in Training (0 stars = not done)
    if (rec) {
      // a new record: its own screen, a fanfare, a bigger explosion, and chestnuts once per record
      const nuts = earn('rush-record/' + cur.score, 3)
      setRecord({ from: best, to: cur.score, nuts })
      window.setTimeout(() => {
        fanfare()
        buzz([60, 50, 60, 50, 200])
        ;['d4', 'b6', 'g6', 'b2', 'g2'].forEach((sq, i) => window.setTimeout(() => burst(sq, 110, true), i * 140))
      }, 150)
    } else if (starsFor(cur.score))
      window.setTimeout(() => {
        boom()
        burst('d4', 120, true)
      }, 150)
  }

  function cellCenter(sq: string): [number, number] | null {
    const c = canvas.current
    if (!c) return null
    const [f, r] = sqCoords(sq)
    const col = opts.black ? 7 - f : f
    const row = opts.black ? r : 7 - r
    const w = c.clientWidth / 8
    return [col * w + w / 2, row * w + w / 2]
  }
  function burst(sq: string, n: number, big: boolean) {
    const at = cellCenter(sq)
    if (at) fx.burst(at[0], at[1], n, big)
  }
  useEffect(() => () => fx.stop(), [fx])

  function tap(sq: string) {
    if (!g) return
    audio()
    if (sq === g.target) {
      const streak = g.streak + 1
      let combo = g.combo + 1
      let score = g.score + pointsFor(streak)
      let end = g.end
      step(streak)
      burst(sq, 18, false)
      buzz(15)
      setFlash({ sq, kind: 'hit', n: Date.now() })
      if (combo >= COMBO) {
        combo = 0
        score += COMBO_BONUS
        end += COMBO_TIME
        window.setTimeout(() => {
          boom()
          burst(sq, 90, true)
          buzz([30, 40, 60])
          setShake((x) => x + 1)
          setWord({ text: praise(streak), n: Date.now() })
        }, 120)
      }
      // passing your best in the middle of the run: once, not announced (LERNKONZEPT: surprise rewards)
      if (!passed.current && best > 0 && score > best) {
        passed.current = true
        window.setTimeout(() => {
          ding()
          setWord({ text: 'Record!', n: Date.now() })
        }, combo === 0 ? 700 : 60)
      }
      setTell(null)
      setG(order({ ...g, sq, moved: g.moved + 1, streak, combo, score, end, hits: g.hits + 1 }))
    } else {
      wrong()
      buzz(80)
      setFlash({ sq, kind: 'miss', n: Date.now() })
      setTell({ tapped: sq, target: g.target })
      setG({ ...g, streak: 0, combo: 0, miss: g.miss + 1 })
    }
  }

  function toggle(key: keyof Opts) {
    const next = { ...opts, [key]: !opts[key] }
    setOpts(next)
    store(OPTS_KEY, next)
    // a pawn walks the other way now: give a fresh order
    if (key === 'black' && g) setG(g.p === 'P' ? { ...g, moved: PAWN_MOVES } : { ...g })
  }
  // after "Play as Black" the order is rebuilt for the new direction
  useEffect(() => {
    const cur = gameRef.current
    if (cur && cur.p === 'P' && cur.moved >= PAWN_MOVES) setG(order(cur))
    // only when the side changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.black])

  const cells = []
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++) {
      const f = opts.black ? 7 - col : col
      const r = opts.black ? row : 7 - row
      const sq = sqName(f, r)
      const fl = flash && flash.sq === sq ? `${flash.kind}${flash.n % 2}` : ''
      const show = tell && tell.target === sq ? 'show' : ''
      cells.push(
        <button key={sq} type="button" className={`rush-cell ${(f + r) % 2 ? 'l' : 'd'} ${fl} ${show}`} aria-label={opts.letters ? sq : 'square'} onPointerDown={(e) => {
            e.preventDefault()
            tap(sq)
          }}>
          {opts.letters && col === 0 && <span className="rush-co rk">{r + 1}</span>}
          {opts.letters && row === 7 && <span className="rush-co fl">{'abcdefgh'[f]}</span>}
          {g && opts.dots && g.legal.includes(sq) && <span className="rush-dot" />}
        </button>,
      )
    }
  const pos = g ? sqCoords(g.sq) : null
  const pieceStyle = pos ? { left: `${(opts.black ? 7 - pos[0] : pos[0]) * 12.5}%`, top: `${(opts.black ? pos[1] : 7 - pos[1]) * 12.5}%` } : undefined
  const stars = over ? starsFor(over.score) : 0

  return (
    <div className="screen rush">
      <div className="rush-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the start page">←</button>
        <h1>Square Rush</h1>
      </div>
      <div className="rush-hud">
        <div className="rush-score"><small>Score</small>{g?.score ?? over?.score ?? 0}</div>
        <div className="rush-combo" aria-label={`Combo ${g?.combo ?? 0} of ${COMBO}`}>
          {Array.from({ length: COMBO }, (_, i) => <i key={i} className={g && i < g.combo ? 'on' : ''} />)}
        </div>
        <button type="button" className="rush-score best" aria-expanded={showTop} onClick={() => setShowTop(!showTop)}><small>Best {top.length > 1 ? (showTop ? '▴' : '▾') : ''}</small>{best}</button>
      </div>
      {showTop && top.length > 0 && (
        <ol className="rush-top" aria-label="Your 5 best runs">
          {top.map((r, i) => (
            <li key={r.at}><b>{i + 1}.</b> {r.score}<small>{new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></li>
          ))}
        </ol>
      )}
      <div className="rush-order" aria-live="polite">
        {g ? (
          <>
            <span className="pc" aria-hidden="true"><Piece p={g.p} black={opts.black} /></span>
            {RUSH_NAMES[g.p]} to <span className="sq">{g.target}</span>
          </>
        ) : over ? 'Time!' : 'Ready?'}
      </div>
      <div className="rush-stage">
        <div key={shake} className={`rush-board${shake ? ' shake' : ''}`} role="grid" aria-label="Chessboard">{cells}</div>
        {g && <div className="rush-piece" style={pieceStyle} aria-hidden="true"><Piece p={g.p} black={opts.black} /></div>}
        <canvas ref={canvas} className="rush-fx" aria-hidden="true" />
        {word && <div key={word.n} className={`rush-word${word.text === 'Record!' ? ' rec' : ''}`} aria-hidden="true">{word.text}</div>}
        {!g && (
          <div className="rush-overlay">
            {over && record ? (
              <div className="rush-record">
                <small>New record!</small>
                <CountUp from={record.from} to={record.to} />
                <p>Your best was {record.from}. Now it is {record.to}.</p>
                <div className="rush-stars" aria-label={`${stars} of 3 stars`}>
                  {[0, 1, 2].map((i) => <span key={i} className={i < stars ? '' : 'off'}>★</span>)}
                </div>
                {record.nuts > 0 && <span className="rush-nuts">+{record.nuts} 🌰</span>}
                <button type="button" className="rush-btn" onClick={start}>Beat it again</button>
              </div>
            ) : over ? (
              <>
                <h2>{stars === 3 ? 'Brilliant!!' : stars === 2 ? 'Great!' : stars === 1 ? 'Good!' : 'Keep going!'}</h2>
                <div className="rush-stars" aria-label={`${stars} of 3 stars`}>
                  {[0, 1, 2].map((i) => <span key={i} className={i < stars ? '' : 'off'}>★</span>)}
                </div>
                <p>{over.score} points · {over.hits} squares right · {over.miss} wrong</p>
                <button type="button" className="rush-btn" onClick={start}>Play again</button>
              </>
            ) : (
              <>
                <h2>Square Rush</h2>
                <p>Hoppy calls a square – move the piece there. Three in a row make it explode.</p>
                <button type="button" className="rush-btn" onClick={start}>Play</button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="rush-tell">{tell && <>That was <b>{tell.tapped}</b>. {tell.target} is the green one.</>}</div>
      <div className="rush-time" aria-hidden="true"><i style={{ width: `${(g ? left : 1) * 100}%` }} className={g && left < 1 / 6 ? 'low' : ''} /></div>
      <div className="rush-opts" role="group" aria-label="Settings">
        <button type="button" aria-pressed={opts.letters} onClick={() => toggle('letters')}>Letters on board</button>
        <button type="button" aria-pressed={opts.dots} onClick={() => toggle('dots')}>Show moves</button>
        <button type="button" aria-pressed={opts.black} onClick={() => toggle('black')}>Play as Black</button>
      </div>
    </div>
  )
}

