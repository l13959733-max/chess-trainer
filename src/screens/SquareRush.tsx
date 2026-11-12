import { useEffect, useRef, useState } from 'react'
import { go } from '../hooks/useHashRoute'
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

const GLYPH: Record<RushPiece, string> = { N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚', P: '♟︎' }
const BEST_KEY = 'hoppy-rush-best'
const OPTS_KEY = 'hoppy-rush-options'
const SCALE = [392, 440, 523, 587, 659, 784, 880, 1047]

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
const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    // no vibration on this phone (iPhone)
  }
}

// ---------- sound, made in the browser ----------
let ac: AudioContext | null = null
function audio(): AudioContext | null {
  if (!ac) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ac = new AC()
    } catch {
      ac = null
    }
  }
  if (ac?.state === 'suspended') void ac.resume()
  return ac
}
function tone(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.25) {
  const a = audio()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  const t = a.currentTime + t0
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur * 0.6)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}
function boom() {
  const a = audio()
  if (!a) return
  const n = Math.floor(a.sampleRate * 0.5)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3)
  const s = a.createBufferSource()
  const f = a.createBiquadFilter()
  const g = a.createGain()
  s.buffer = buf
  f.type = 'lowpass'
  f.frequency.value = 900
  g.gain.value = 0.5
  s.connect(f).connect(g).connect(a.destination)
  s.start()
  ;[523, 659, 784, 1047].forEach((fr, i) => tone(fr, 0.05 + i * 0.07, 0.35, 'triangle', 0.18))
}

// ---------- confetti on a canvas over the board ----------
interface Part {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  c: string
  sq: boolean
}

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
  const parts = useRef<Part[]>([])
  const raf = useRef(0)
  const gameRef = useRef<Game | null>(null)
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
    parts.current = []
    const fresh = nextPiece({ pi: -1, score: 0, streak: 0, combo: 0, hits: 0, miss: 0, end: Date.now() + RUSH_SECONDS * 1000 })
    setG(order(fresh))
  }
  function finish(cur: Game) {
    setG(null)
    setOver(cur)
    if (cur.score > best) {
      setBest(cur.score)
      store(BEST_KEY, cur.score)
    }
    if (starsFor(cur.score))
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
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const c = canvas.current
    const at = cellCenter(sq)
    if (!c || !at) return
    const dpr = window.devicePixelRatio || 1
    if (c.width !== c.clientWidth * dpr) {
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
    }
    const cols = big ? ['#f5b82e', '#8a5cf6', '#58cc02', '#ff4b4b', '#4fc3f7', '#fff'] : ['#f5b82e', '#fff', '#58cc02']
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = (big ? 4 : 2.4) + Math.random() * (big ? 7 : 3.5)
      parts.current.push({ x: at[0], y: at[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s - (big ? 2 : 1), life: 1, size: (big ? 5 : 3.5) + Math.random() * 4, c: cols[i % cols.length], sq: Math.random() < 0.5 })
    }
    if (!raf.current) raf.current = requestAnimationFrame(tick)
  }
  function tick() {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.clientWidth, c.clientHeight)
    parts.current = parts.current.filter((p) => p.life > 0)
    for (const p of parts.current) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.22
      p.vx *= 0.985
      p.life -= 0.02
      ctx.globalAlpha = Math.max(p.life, 0)
      ctx.fillStyle = p.c
      if (p.sq) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.life * 8)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, 7)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    raf.current = parts.current.length ? requestAnimationFrame(tick) : 0
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  function tap(sq: string) {
    if (!g) return
    audio()
    if (sq === g.target) {
      const streak = g.streak + 1
      let combo = g.combo + 1
      let score = g.score + pointsFor(streak)
      let end = g.end
      tone(SCALE[Math.min(streak - 1, SCALE.length - 1)], 0, 0.18, 'sine', 0.3)
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
      setTell(null)
      setG(order({ ...g, sq, moved: g.moved + 1, streak, combo, score, end, hits: g.hits + 1 }))
    } else {
      tone(140, 0, 0.25, 'square', 0.12)
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
        <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to the Training Camp">←</button>
        <h1>Square Rush</h1>
      </div>
      <div className="rush-hud">
        <div className="rush-score"><small>Score</small>{g?.score ?? over?.score ?? 0}</div>
        <div className="rush-combo" aria-label={`Combo ${g?.combo ?? 0} of ${COMBO}`}>
          {Array.from({ length: COMBO }, (_, i) => <i key={i} className={g && i < g.combo ? 'on' : ''} />)}
        </div>
        <div className="rush-score best"><small>Best</small>{best}</div>
      </div>
      <div className="rush-order" aria-live="polite">
        {g ? (
          <>
            <span className="pc" aria-hidden="true">{GLYPH[g.p]}</span>
            {RUSH_NAMES[g.p]} to <span className="sq">{g.target}</span>
          </>
        ) : over ? 'Time!' : 'Ready?'}
      </div>
      <div className="rush-stage">
        <div key={shake} className={`rush-board${shake ? ' shake' : ''}`} role="grid" aria-label="Chessboard">{cells}</div>
        {g && <div className="rush-piece" style={pieceStyle} aria-hidden="true">{GLYPH[g.p]}</div>}
        <canvas ref={canvas} className="rush-fx" aria-hidden="true" />
        {word && <div key={word.n} className="rush-word" aria-hidden="true">{word.text}</div>}
        {!g && (
          <div className="rush-overlay">
            {over ? (
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
