import { useEffect, useMemo, useRef, useState } from 'react'
import { CountUp } from '../components/CountUp'
import { go } from '../hooks/useHashRoute'
import type { useRepertoire } from '../hooks/useRepertoire'
import { earn } from '../lib/king'
import {
  ARENA_KEYS,
  BELTS,
  OR_COMBO,
  OR_LIVES,
  OR_TIME,
  beltOf,
  bookTasks,
  buildRun,
  keyOf,
  loadArena,
  loadBlack,
  masteryPct,
  missTask,
  nextBelt,
  recordTask,
  rememberMissed,
  runLeft,
  runOver,
  runStars,
  solveTask,
  startRun,
  pathSans,
  type ArenaTask,
  type Mastery,
  type RunState,
  type TaskKind,
} from '../lib/openingRush'
import { addTop, audio, boom, buzz, confetti, ding, fanfare, isRecord, loadTop, saveTop, step, wrong, type TopRun } from '../lib/rushFx'
import { OnePuzzle, type LPuzzle } from './King'
import { MoveReplay } from '../components/MoveReplay'
import { explainWrong } from '../lib/explainWrong'
import { Chess } from 'chess.js'
import { systemOf } from '../lib/blackSystems'

// Opening Rush (Lu, 22.11.2026): one opening – or a whole system like "Black against 1.d4" – trained hard:
// every situation as a task, in random order, 3 minutes, 3 lives, records and belts. "Practice" is the same
// without the clock, with the explanation after every task. Rules: src/lib/openingRush.ts.
// Route: #/opening-rush (choose), #/opening-rush/<key>[~<key>…] (one opening or several together).

type Rep = ReturnType<typeof useRepertoire>
const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // not remembered
  }
}

const KIND: Record<TaskKind, { tag: string; icon: string; praise: string }> = {
  book: { tag: 'Your book', icon: '📖', praise: 'Book move!' },
  react: { tag: 'Out of book', icon: '⚡', praise: 'Good answer!' },
  punish: { tag: 'Punish it!', icon: '🎯', praise: 'Punished!' },
}

// all openings that have a rush: name + side, from the lines (book) and the Stockfish files
function openingsOf(rep: Rep) {
  const seen = new Map<string, { name: string; side: 'w' | 'b'; lines: number }>()
  for (const l of rep.lines) {
    if (l.source === 'import' || !l.opening) continue
    const k = keyOf(l.opening, l.side)
    const e = seen.get(k) ?? { name: l.opening, side: l.side, lines: 0 }
    e.lines++
    seen.set(k, e)
  }
  return seen
}
const nameOfSystem = (names: string[]) => (names.length === 1 ? names[0] : names.join(' + '))

export function OpeningRushHome({ rep }: { rep: Rep }) {
  const all = useMemo(() => openingsOf(rep), [rep])
  const black = loadBlack()
  const card = (key: string, title: string, sub: string, icon: string) => {
    const pct = read<number | null>('hoppy-orush-pct/' + key, null)
    const best = read<number>('hoppy-orush-best/' + key, 0)
    const belt = pct !== null ? beltOf(pct) : undefined
    return (
      <button type="button" key={key} className="or-card" onClick={() => go('opening-rush/' + key)}>
        <span className="or-card-ic" aria-hidden="true">{icon}</span>
        <span className="or-card-tx">
          <b>{title}</b>
          <small>{sub}</small>
          {pct !== null && (
            <span className="or-mbar" aria-label={`Mastered ${pct}%`}><i style={{ width: `${pct}%` }} /></span>
          )}
        </span>
        <span className="or-card-side">
          {belt && <span className={`or-belt b-${belt.name.toLowerCase()}`}>{belt.name}</span>}
          {best > 0 && <small>Best {best}</small>}
        </span>
      </button>
    )
  }
  const sideKeys = (names: string[]) => names.map((n) => keyOf(n, 'b')).filter((k) => all.has(k))
  const e4 = black.e4 ? systemOf('e4', black.e4) : null
  const d4 = black.d4 ? systemOf('d4', black.d4) : null
  // every opening with a rush, the most lines first; the Catalan stays on top of White (Lu's focus)
  const withRush = [...all.entries()].filter(([k]) => ARENA_KEYS.includes(k) && k !== keyOf('Catalan', 'w')).sort((a, b) => b[1].lines - a[1].lines)
  const whites = withRush.filter(([, o]) => o.side === 'w')
  const blacks = withRush.filter(([, o]) => o.side === 'b')
  return (
    <div className="screen rush or-home">
      <div className="rush-head">
        <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to Training">←</button>
        <h1>Opening Rush</h1>
      </div>
      <p className="note">Every situation of an opening as a task – your book moves, what to do when the opponent leaves the book, and how to punish his mistakes. Random, on time.</p>
      <h5 className="or-h">White</h5>
      {all.has(keyOf('Catalan', 'w')) && card(keyOf('Catalan', 'w'), 'Catalan Rush', '1.d4 Nf6 2.c4 e6 3.g3', '♗')}
      <h5 className="or-h">Your Black system</h5>
      {e4 && sideKeys(e4.openings).length > 0 && card(sideKeys(e4.openings).join('~'), `Against 1.e4: ${e4.name}`, e4.moves, '♚')}
      {d4 && sideKeys(d4.openings).length > 0 && card(sideKeys(d4.openings).join('~'), `Against 1.d4: ${d4.name}`, d4.moves, '♚')}
      <button type="button" className="or-pick" onClick={() => go('black-course')}>♚ Hoppy's Black training (Scandinavian + QGD)</button>
      <button type="button" className="or-pick" onClick={() => go('black')}>
        {e4 || d4 ? 'Change your Black system →' : 'Pick your Black system →'}
      </button>
      <details className="or-more" open>
        <summary>Every White opening ({whites.length})</summary>
        {whites.map(([k, o]) => card(k, o.name, `${o.lines} lines`, '♔'))}
      </details>
      <details className="or-more">
        <summary>Every Black opening ({blacks.length})</summary>
        {blacks.map(([k, o]) => card(k, o.name, `${o.lines} lines`, '♚'))}
      </details>
    </div>
  )
}

// ---------- one rush ----------
const toPuzzle = (t: ArenaTask): LPuzzle => ({ id: t.id, fen: t.fen, moves: t.moves, alts: t.alts, rating: 0, why: t.why })

export function OpeningRush({ rep, keys }: { rep: Rep; keys: string }) {
  const parts = useMemo(() => keys.split('~').filter(Boolean), [keys])
  const all = useMemo(() => openingsOf(rep), [rep])
  const names = parts.map((k) => all.get(k)?.name).filter((n): n is string => !!n)
  const title = names.length === 1 && names[0] === 'Catalan' ? 'Catalan Rush' : nameOfSystem(names)
  const [extra, setExtra] = useState<ArenaTask[] | null>(null)
  useEffect(() => {
    let live = true
    void Promise.all(parts.map((k) => loadArena(k))).then((fs) => live && setExtra(fs.flatMap((f) => f?.tasks ?? [])))
    return () => {
      live = false
    }
  }, [parts])
  const tasks = useMemo(() => {
    if (!extra) return null
    const book = parts.flatMap((k) => {
      const o = all.get(k)
      return o ? bookTasks(rep.lines.filter((l) => l.source !== 'import' && l.opening === o.name && l.side === o.side)) : []
    })
    const seen = new Set<string>()
    return [...book, ...extra].filter((t) => !seen.has(t.id) && !!seen.add(t.id))
  }, [extra, parts, all, rep.lines])

  const MKEY = 'hoppy-orush-m/' + keys
  const AKEY = 'hoppy-orush-again/' + keys
  const BKEY = 'hoppy-orush-best/' + keys
  const TKEY = 'hoppy-orush-top/' + keys
  const [mastery, setMastery] = useState<Mastery>(() => read(MKEY, {}))
  const [phase, setPhase] = useState<'intro' | 'run' | 'over' | 'review' | 'calm'>('intro')
  const [queue, setQueue] = useState<ArenaTask[]>([])
  const [i, setI] = useState(0)
  const [s, setS] = useState<RunState>(() => startRun(0))
  const [lock, setLock] = useState(false)
  const [left, setLeft] = useState(1)
  const [word, setWord] = useState<{ text: string; n: number; big?: boolean } | null>(null)
  const [best, setBest] = useState(() => read(BKEY, 0))
  const [top, setTop] = useState<TopRun[]>(() => loadTop(TKEY))
  const [showTop, setShowTop] = useState(false)
  const [record, setRecord] = useState<{ from: number; to: number; nuts: number } | null>(null)
  const [beltUp, setBeltUp] = useState<{ name: string; nuts: number } | null>(null)
  const [review, setReview] = useState(0)
  const [answered, setAnswered] = useState<'right' | 'wrong' | null>(null)
  const [calmScore, setCalmScore] = useState({ right: 0, done: 0 })
  // after a wrong move (Lu, 22.11.): the clock stops, you play the right move yourself, then see why yours was wrong
  // and can step through the moves again
  const [fix, setFix] = useState<{ pausedAt: number } | null>(null)
  const [wrongWhy, setWrongWhy] = useState<string | null | 'loading'>(null)
  const [replay, setReplay] = useState(false)
  const fixRef = useRef(fix)
  const taskRef = useRef<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fx = useMemo(() => confetti(() => canvas.current), [])
  const sRef = useRef(s)
  const mRef = useRef(mastery)
  const passed = useRef(false)
  const solvedIds = useRef<string[]>([])
  const pctAtStart = useRef(0)
  useEffect(() => {
    sRef.current = s
    mRef.current = mastery
    fixRef.current = fix
  })
  useEffect(() => () => fx.stop(), [fx])

  const pct = tasks ? masteryPct(mastery, tasks) : 0
  useEffect(() => {
    if (tasks) write('hoppy-orush-pct/' + keys, pct)
  }, [tasks, pct, keys])

  function mark(id: string, right: boolean) {
    const m = recordTask(mRef.current, id, right)
    mRef.current = m
    setMastery(m)
    write(MKEY, m)
  }

  function begin(calm: boolean) {
    if (!tasks?.length) return
    audio()
    setQueue(buildRun(tasks, mRef.current, read<string[]>(AKEY, []), Math.random, calm ? tasks.length : 80))
    setI(0)
    setS(startRun(Date.now()))
    setLock(false)
    setRecord(null)
    setBeltUp(null)
    setReview(0)
    setAnswered(null)
    setCalmScore({ right: 0, done: 0 })
    setFix(null)
    fixRef.current = null
    setWrongWhy(null)
    setReplay(false)
    passed.current = false
    solvedIds.current = []
    pctAtStart.current = masteryPct(mRef.current, tasks)
    fx.stop()
    setPhase(calm ? 'calm' : 'run')
  }

  // a new belt: chestnuts once per belt and opening
  function checkBelt() {
    if (!tasks) return
    const now = masteryPct(mRef.current, tasks)
    const got = BELTS.filter((b) => pctAtStart.current < b.pct && now >= b.pct).at(-1)
    if (!got) return
    const nuts = earn(`orush/${keys}/${got.name}`, got.nuts)
    setBeltUp({ name: got.name, nuts })
  }

  function finish(cur: RunState) {
    setPhase('over')
    const stars = runStars(cur.score)
    const rec = isRecord(cur.score, best)
    if (cur.score > best) {
      setBest(cur.score)
      write(BKEY, cur.score)
    }
    const t = addTop(top, { score: cur.score, at: Date.now() })
    setTop(t)
    saveTop(TKEY, t)
    write(AKEY, rememberMissed(read<string[]>(AKEY, []), cur.missed, solvedIds.current))
    checkBelt()
    if (rec) {
      const nuts = earn(`orush-record/${keys}/${cur.score}`, 3)
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

  useEffect(() => {
    if (phase !== 'run') return
    let id = 0
    const tick = () => {
      const cur = sRef.current
      const now = Date.now()
      // the clock stands still while you fix a wrong move
      if (fixRef.current) {
        id = requestAnimationFrame(tick)
        return
      }
      setLeft(runLeft(cur, now) / OR_TIME)
      if (runOver(cur, now)) return finish(cur)
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
  const missed = (tasks ? s.missed.map((id) => tasks.find((t) => t.id === id)) : []).filter((t): t is ArenaTask => !!t)
  const next = () => {
    setLock(false)
    setAnswered(null)
    setWrongWhy(null)
    setReplay(false)
    taskRef.current = null
    if (i + 1 >= queue.length && phase === 'run') return finish(sRef.current)
    setI((k) => k + 1)
  }

  // what was wrong with your move: Stockfish in the browser, in plain words
  function explain(t: ArenaTask, wrongUci?: string) {
    if (!wrongUci) return
    taskRef.current = t.id
    setWrongWhy('loading')
    const c = new Chess(t.fen)
    c.move({ from: t.moves[0].slice(0, 2), to: t.moves[0].slice(2, 4), promotion: t.moves[0][4] })
    void explainWrong(c.fen(), wrongUci, t.moves[1], t.kind).then((txt) => {
      if (taskRef.current === t.id) setWrongWhy(txt)
    })
  }
  // back to the clock after a fixed mistake: the time you spent looking is given back
  function resume() {
    const f = fixRef.current
    const cur = sRef.current
    const n = f ? { ...cur, end: cur.end + (Date.now() - f.pausedAt) } : cur
    setS(n)
    sRef.current = n
    setFix(null)
    fixRef.current = null
    if (n.lives <= 0) {
      setLock(false)
      setWrongWhy(null)
      setReplay(false)
      return finish(n)
    }
    next()
  }

  function onSolved() {
    if (!item || lock) return
    setLock(true)
    // the right move after a mistake in the rush: no points, the explanation and the replay instead
    if (phase === 'run' && fixRef.current) {
      step(1)
      setReplay(true)
      return
    }
    if (phase === 'calm') {
      setReplay(true)
      mark(item.id, answered !== 'wrong')
      if (answered !== 'wrong') setCalmScore((c) => ({ right: c.right + 1, done: c.done + 1 }))
      else setCalmScore((c) => ({ ...c, done: c.done + 1 }))
      setAnswered((a) => a ?? 'right')
      step(1)
      center(0.5, 0.5, 22, false)
      checkBelt()
      return
    }
    mark(item.id, true)
    solvedIds.current.push(item.id)
    const r = solveTask(s, item.kind)
    setS(r.s)
    step(r.s.streak)
    buzz(15)
    center(0.5, 0.5, 22, false)
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
        setWord({ text: `${KIND[item.kind].praise} +5 s`, n: Date.now() })
      }, 120)
    } else setWord({ text: KIND[item.kind].praise, n: Date.now() })
    window.setTimeout(next, 650)
  }
  function onMistake(wrongUci?: string) {
    if (phase === 'review') {
      const t = missed[review]
      if (t && !wrongWhy) explain(t, wrongUci)
      return void wrong()
    }
    if (!item) return
    if (phase === 'calm') {
      // first try counts; you then play the arrow to go on
      if (!answered) {
        setAnswered('wrong')
        mark(item.id, false)
        explain(item, wrongUci)
      }
      wrong()
      return
    }
    if (lock || fixRef.current) return void wrong()
    // the rush: a life is gone, the clock stops, now play the right move (the green arrow)
    mark(item.id, false)
    const n = missTask(s, item.id)
    setS(n)
    sRef.current = n
    wrong()
    buzz(80)
    const f = { pausedAt: Date.now() }
    setFix(f)
    fixRef.current = f
    explain(item, wrongUci)
  }

  if (!tasks) return <div className="screen rush"><p className="note">Loading…</p></div>
  if (!tasks.length)
    return (
      <div className="screen rush">
        <div className="done">
          <div className="done-title">No tasks here yet</div>
          <button type="button" className="primary" onClick={() => go('opening-rush')}>Back</button>
        </div>
      </div>
    )

  const counts = { book: 0, react: 0, punish: 0 }
  for (const t of tasks) counts[t.kind]++
  const stars = runStars(s.score)
  const belt = beltOf(pct)
  const nb = nextBelt(pct)

  const head = (t: ArenaTask) => {
    const cut = t.path.lastIndexOf(' ')
    return (
      <div className={`or-task k-${t.kind}`}>
        <span className="or-tag">{KIND[t.kind].icon} {KIND[t.kind].tag}</span>
        <span className="or-path">{cut > 0 ? t.path.slice(0, cut) + ' ' : ''}<b>{t.path.slice(cut + 1)}</b></span>
      </div>
    )
  }

  const replayOf = (t: ArenaTask) => {
    const c = new Chess(t.fen)
    const me = c.turn() === 'w' ? 'black' : 'white'
    c.move({ from: t.moves[0].slice(0, 2), to: t.moves[0].slice(2, 4), promotion: t.moves[0][4] })
    const ans = c.move({ from: t.moves[1].slice(0, 2), to: t.moves[1].slice(2, 4), promotion: t.moves[1][4] })
    return <MoveReplay key={'mr' + t.id} sans={[...pathSans(t.path), ans.san]} orientation={me} />
  }
  const feedback = (t: ArenaTask, wrongOnce: boolean, onNext: () => void, nextLabel = 'Next') => (
    <div className={`king-fb ${wrongOnce ? '' : 'ok'}`}>
      <b>{wrongOnce ? 'Now you know it' : KIND[t.kind].praise}</b>
      {wrongOnce && wrongWhy !== null && (
        <p className="or-wrong">
          <span>Your move</span>
          {wrongWhy === 'loading' ? 'Hoppy is checking your move…' : wrongWhy}
        </p>
      )}
      <p><span className="or-right">The right move</span>{t.why}</p>
      <button type="button" className="primary wide" onClick={onNext}>{nextLabel}</button>
    </div>
  )

  if (phase === 'review' || phase === 'calm') {
    const list = phase === 'review' ? missed : queue
    const k = phase === 'review' ? review : i
    const t = list[k]
    if (!t) {
      return (
        <div className="screen rush prush">
          <div className="done">
            <div className="done-title">{phase === 'calm' ? `All ${calmScore.done} done – ${calmScore.right} right first try` : 'All looked at again'}</div>
            <p>Mastered: {masteryPct(mastery, tasks)}%. Missed ones come back early in your next runs.</p>
            <div className="done-actions">
              <button type="button" onClick={() => setPhase('intro')}>Back</button>
              <button type="button" className="primary" onClick={() => begin(false)}>Rush on time</button>
            </div>
          </div>
        </div>
      )
    }
    const done = phase === 'review' ? answered === 'right' : lock
    const wrongOnce = phase === 'review' ? wrongWhy !== null : answered === 'wrong'
    return (
      <div className="screen rush prush">
        <div className="rush-head">
          <button type="button" className="back" onClick={() => setPhase(phase === 'review' ? 'over' : 'intro')} aria-label="Back">←</button>
          <h1>{phase === 'review' ? `Look again · ${k + 1} of ${list.length}` : `${title} · ${k + 1} of ${list.length}`}</h1>
        </div>
        {phase === 'calm' && (
          <div className="or-calm-top">
            <span>No clock. Think first, then move.</span>
            <span className="or-mini" aria-label={`Mastered ${pct}%`}><i style={{ width: `${pct}%` }} /></span>
          </div>
        )}
        {head(t)}
        {done && replay ? (
          replayOf(t)
        ) : (
          <OnePuzzle key={phase + t.id + k} p={toPuzzle(t)} onMistake={onMistake} onSolved={phase === 'review' ? () => { mark(t.id, true); setAnswered('right'); setReplay(true) } : onSolved} />
        )}
        {done &&
          feedback(t, wrongOnce, () => {
            if (phase === 'review') {
              setReview(review + 1)
              setAnswered(null)
              setWrongWhy(null)
              setReplay(false)
              taskRef.current = null
            } else next()
          })}
      </div>
    )
  }

  const cur = item
  return (
    <div className="screen rush prush">
      <div className="rush-head">
        <button type="button" className="back" onClick={() => go('opening-rush')} aria-label="Back">←</button>
        <h1>{title}</h1>
      </div>
      <div className="rush-hud">
        <div className="rush-score"><small>Score</small>{s.score}</div>
        <div className="pr-lives" aria-label={`${s.lives} of ${OR_LIVES} lives`}>
          {Array.from({ length: OR_LIVES }, (_, k) => <span key={k} className={k < s.lives ? '' : 'off'}>❤</span>)}
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
      <div className="rush-combo pr-combo" aria-label={`Combo ${s.combo} of ${OR_COMBO}`}>
        {Array.from({ length: OR_COMBO }, (_, k) => <i key={k} className={phase === 'run' && k < s.combo ? 'on' : ''} />)}
      </div>
      {phase === 'run' && cur ? head(cur) : <div className="or-task or-task-blank" />}
      <div className="pr-stage">
        {phase === 'run' && cur ? (
          fix && replay ? replayOf(cur) : <OnePuzzle key={cur.id + '/' + i} p={toPuzzle(cur)} onMistake={onMistake} onSolved={onSolved} />
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
                {beltUp && <span className={`or-belt big b-${beltUp.name.toLowerCase()}`}>{beltUp.name} belt!{beltUp.nuts > 0 ? ` +${beltUp.nuts} 🌰` : ''}</span>}
                <div className="pr-end-btns">
                  {missed.length > 0 && <button type="button" className="rush-btn ghost" onClick={() => { setReview(0); setAnswered(null); setPhase('review') }}>Look again ({missed.length})</button>}
                  <button type="button" className="rush-btn" onClick={() => begin(false)}>Beat it again</button>
                </div>
              </div>
            ) : phase === 'over' ? (
              <>
                <h2>{s.lives <= 0 ? 'Out of lives' : 'Time!'}</h2>
                <div className="rush-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((k) => <span key={k} className={k < stars ? '' : 'off'}>★</span>)}</div>
                <p>{s.score} points · {s.solved} solved · {s.missed.length} missed</p>
                {beltUp && <span className={`or-belt big b-${beltUp.name.toLowerCase()}`}>{beltUp.name} belt!{beltUp.nuts > 0 ? ` +${beltUp.nuts} 🌰` : ''}</span>}
                <p className="or-mtext">Mastered {pct}%{nb ? ` · ${nb.name} at ${nb.pct}%` : ''}</p>
                <div className="pr-end-btns">
                  {missed.length > 0 && <button type="button" className="rush-btn ghost" onClick={() => { setReview(0); setAnswered(null); setPhase('review') }}>Look again ({missed.length})</button>}
                  <button type="button" className="rush-btn" onClick={() => begin(false)}>Play again</button>
                </div>
              </>
            ) : (
              <div className="or-intro">
                <h2>{title}</h2>
                <p>{tasks.length} situations: {counts.book} from your book, {counts.react} out of book, {counts.punish} mistakes to punish.</p>
                <div className="or-mastery">
                  <span className="or-mbar big"><i style={{ width: `${pct}%` }} /></span>
                  <small>
                    Mastered {pct}%{belt ? ` · ${belt.name} belt` : ''}
                    {nb ? ` · ${nb.name} at ${nb.pct}%` : ''}
                  </small>
                </div>
                <p className="or-rules">3 minutes, 3 lives. Three right in a row: +5 s. Out of book and punishing count more.</p>
                <div className="pr-end-btns">
                  <button type="button" className="rush-btn" onClick={() => begin(false)}>Play</button>
                  <button type="button" className="rush-btn ghost" onClick={() => begin(true)}>Practice – no clock</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {phase === 'run' && cur && fix && !replay && <p className="or-fix">⏸ Clock stopped. Play the right move – follow the green arrow.</p>}
      {phase === 'run' && cur && fix && replay && feedback(cur, true, resume, s.lives <= 0 ? 'See your score' : 'Continue – the clock runs again')}
      <div className="rush-time" aria-hidden="true"><i style={{ width: `${(phase === 'run' ? left : 1) * 100}%` }} className={phase === 'run' && (left < 1 / 6) ? 'low' : ''} /></div>
      <p className="note small">Book moves from your lines; out-of-book answers and mistakes checked by Stockfish. A task is mastered after two right in a row.</p>
    </div>
  )
}
