import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Arrow } from 'react-chessboard'
import { Board } from '../components/Board'
import { ChestnutReward } from '../components/Chestnut'
import { Mascot, type Mood } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import { feedback as fx, resetCareful, takeCareful } from '../lib/feedback'
import { earn, type Station } from '../lib/king'
import { fenAfter, writeDiary, type Lesson as LessonData, type Say } from '../lib/lessons'
import '../lesson.css'

// A short lesson (Lu, 13.11., prototype "Hoppy Mix"): one question per screen, you answer on the board, the
// explanation comes after the answer in a sheet with Hoppy's face. No bottom bar while you practise – only the task,
// a close button and three progress strokes. At the end: real numbers from this round and a line in Hoppy's diary.

const IMG = import.meta.env.BASE_URL + 'king/'
type Sheet = { kind: 'good' | 'bad' | 'meh'; say: Say } | null
const COLOR = { good: 'rgba(79, 111, 44, 0.9)', idea: 'rgba(122, 52, 32, 0.45)', main: 'rgba(122, 52, 32, 0.85)' }
const FOCUS: CSSProperties = { boxShadow: 'inset 0 0 0 3px #7a3420' }
const GOOD: CSSProperties = { backgroundColor: 'rgba(79, 111, 44, 0.5)' }
const BAD: CSSProperties = { backgroundColor: 'rgba(122, 52, 32, 0.55)' }

const toArrows = (a: Say['arrows'] = []): Arrow[] => a.map(([s, e, k]) => ({ startSquare: s, endSquare: e, color: k ? COLOR[k] : COLOR.main }))

export function Lesson({ s, lesson }: { s: Station; lesson: LessonData }) {
  const [i, setI] = useState(0)
  const [missed, setMissed] = useState<boolean[]>(() => lesson.steps.map(() => false))
  const [mistakes, setMistakes] = useState(0)
  const [started] = useState(() => Date.now())
  const [done, setDone] = useState<null | { secs: number; coins: number; gold: boolean }>(null)
  useEffect(() => {
    resetCareful()
  }, [])

  function finish() {
    const coins = earn(`${s.id}/${lesson.id}`, 10)
    writeDiary({ id: lesson.id, city: s.name, text: lesson.diary, at: Date.now() })
    setDone({ secs: Math.max(1, Math.round((Date.now() - started) / 1000)), coins, gold: takeCareful() })
  }

  if (done) {
    const first = missed.filter((m) => !m).length
    return (
      <div className="lsn lsn-done">
        <div className="lsn-hoppy-big jump"><Mascot mood="cheer" /></div>
        <h2>Practice done</h2>
        <p className="lsn-from">{s.name} · {lesson.eyebrow}</p>
        <div className="lsn-facts">
          <div><b>{first}/{lesson.steps.length}</b><small>first try</small></div>
          <div><b>{Math.floor(done.secs / 60)}:{String(done.secs % 60).padStart(2, '0')}</b><small>time</small></div>
          <div><b>{mistakes}</b><small>mistakes</small></div>
        </div>
        {done.coins > 0 && <ChestnutReward amount={done.coins} gold={done.gold} />}
        <div className="lsn-letter">
          <img src={`${IMG}stamp-${s.id}.jpg`} alt="" />
          <div>
            <small>New in Hoppy’s diary</small>
            <p>{lesson.diary}</p>
          </div>
        </div>
        <button type="button" className="lsn-btn" onClick={() => go('king/' + s.id)}>Back to {s.name}</button>
      </div>
    )
  }

  return (
    <LessonStepView
      key={i}
      s={s}
      lesson={lesson}
      i={i}
      onMiss={() => {
        setMistakes((m) => m + 1)
        setMissed((ms) => ms.map((m, k) => (k === i ? true : m)))
      }}
      onNext={() => (i + 1 < lesson.steps.length ? setI(i + 1) : finish())}
    />
  )
}

function LessonStepView({ s, lesson, i, onMiss, onNext }: { s: Station; lesson: LessonData; i: number; onMiss: () => void; onNext: () => void }) {
  const st = lesson.steps[i]
  const base = useMemo(() => fenAfter(st.moves), [st.moves])
  const [fen, setFen] = useState(base)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [hint, setHint] = useState<{ text: string; warn?: boolean }>({ text: st.hint })
  const [marks, setMarks] = useState<Record<string, CSSProperties>>({})
  const [arrows, setArrows] = useState<Say['arrows']>(st.arrows)
  const [picked, setPicked] = useState<number | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const focus: Record<string, CSSProperties> = {}
  for (const sq of st.focus ?? []) focus[sq] = FOCUS
  const styles = { ...focus, ...marks }

  function nudge(text: string) {
    setHint({ text, warn: true })
    const el = boardRef.current
    if (el) {
      el.classList.remove('lsn-shake')
      void el.offsetWidth
      el.classList.add('lsn-shake')
    }
  }
  function show(kind: 'good' | 'bad' | 'meh', say: Say, extra: Record<string, CSSProperties> = {}) {
    const m: Record<string, CSSProperties> = { ...extra }
    for (const sq of say.good ?? []) m[sq] = GOOD
    setMarks(m)
    if (say.arrows) setArrows(say.arrows)
    setSheet({ kind, say })
    if (kind === 'good') fx.success()
    if (kind === 'bad') {
      fx.wrong()
      onMiss()
    }
  }
  function again() {
    setSheet(null)
    setFen(base)
    setMarks({})
    setArrows(st.arrows)
    setPicked(null)
    setHint({ text: st.hint })
  }

  function onMove(from: string, to: string): boolean {
    if (sheet || st.kind !== 'move') return false
    const c = new Chess(fen)
    let san: string
    try {
      san = c.move({ from, to, promotion: 'q' }).san
    } catch {
      return false
    }
    const other = st.others?.[san]
    if (san === st.answer) {
      setFen(c.fen())
      fx.move(san)
      show('good', st.ok)
    } else if (other) {
      setFen(c.fen())
      if (other.kind === 'meh') fx.move(san)
      show(other.kind, other, other.kind === 'bad' ? { [to]: BAD } : {})
    } else if (from === st.piece) {
      setFen(c.fen())
      show('bad', { title: 'Not this time', text: st.wrong }, { [to]: BAD })
    } else {
      nudge(st.offTask)
      return false
    }
    return true
  }

  function onTap(sq: string) {
    if (sheet || st.kind !== 'tap') return
    const p = new Chess(fen).get(sq as Square)
    if (sq === st.answer) show('good', st.ok)
    else if (p && p.color === st.side && (!st.type || p.type === st.type)) show('bad', { title: 'Not that one', text: st.wrongs?.[sq] ?? st.wrong }, { [sq]: BAD })
    else nudge(st.notThis)
  }

  function check() {
    if (st.kind !== 'choice' || picked === null) return
    const o = st.options[picked]
    if (o.ok) show('good', st.ok)
    else show('bad', { title: 'Not quite', text: o.why ?? '' })
  }

  const mood: Mood = sheet?.kind === 'good' ? 'cheer' : sheet?.kind === 'bad' ? 'oops' : 'happy'
  return (
    <div className="lsn">
      <div className="lsn-top">
        <button type="button" className="lsn-x" onClick={() => go('king/' + s.id)} aria-label="Close the lesson">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
        <div className="lsn-segs" aria-label={`Task ${i + 1} of ${lesson.steps.length}`}>
          {lesson.steps.map((_, k) => <i key={k} className={k < i ? 'seg-done' : k === i ? 'seg-now' : ''} />)}
        </div>
      </div>
      <div className="lsn-ask">
        <div className="lsn-eyebrow">{lesson.eyebrow}</div>
        <h2>{st.prompt}</h2>
        <p className={`lsn-hint${hint.warn ? ' warn' : ''}`}>{hint.text}</p>
      </div>
      <div ref={boardRef} className={`lsn-board${st.kind === 'choice' ? ' small' : ''}`} onAnimationEnd={(e) => e.currentTarget.classList.remove('lsn-shake')}>
        <Board
          fen={fen}
          orientation="white"
          arrows={toArrows(arrows)}
          squareStyles={styles}
          onMove={st.kind === 'move' && !sheet ? onMove : undefined}
          onTap={st.kind === 'tap' ? onTap : undefined}
        />
      </div>
      {st.kind === 'choice' && (
        <>
          <div className="lsn-options">
            {st.options.map((o, k) => (
              <button type="button" key={o.t} className={picked === k ? 'picked' : ''} disabled={!!sheet} onClick={() => setPicked(k)}>
                {o.t}
              </button>
            ))}
          </div>
          <button type="button" className="lsn-btn lsn-check" disabled={picked === null || !!sheet} onClick={check}>Check</button>
        </>
      )}
      <div className={`lsn-sheet ${sheet ? 'open ' + sheet.kind : ''}`} aria-live="polite">
        {sheet && (
          <>
            <div className="lsn-sheet-row">
              <div key={sheet.kind + sheet.say.title} className={sheet.kind === 'good' ? 'jump' : 'wobble'}><Mascot mood={mood} /></div>
              <div>
                <h4>{sheet.say.title}</h4>
                <p>{sheet.say.text}</p>
              </div>
            </div>
            <button type="button" className="lsn-btn" autoFocus onClick={sheet.kind === 'good' ? onNext : again}>
              {sheet.kind === 'good' ? 'Continue' : sheet.kind === 'meh' ? 'Back to the task' : 'Try again'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
