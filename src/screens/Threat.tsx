import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { clampScore, uciToSan } from '../lib/blunders'
import type { Puzzle } from '../lib/db'
import { evaluate } from '../lib/engine'
import { explainMistake, type LineStep } from '../lib/explain'
import { feedback } from '../lib/feedback'
import { daysUntil, type SrsState } from '../lib/srs'
import { CATEGORY } from '../lib/weakness'
import { ExplainCard } from './PuzzleScreen'

const GOOD_ENOUGH = 80 // centipawns – another punishing move counts too
const REVEAL_AFTER = 2

interface Props {
  puzzle: Puzzle
  progress: string
  onSolved: (mistakes: number) => Promise<{ srs: SrsState; reward: Reward }>
  onNext: () => void
  isLast: boolean
}

// "What's the threat?": the position right after Lu's mistake. Lu plays the OPPONENT and finds the
// move that punishes it – training the check Lu skips most often (what can my opponent do now?).
export function ThreatView({ puzzle, progress, onSolved, onNext, isLast }: Props) {
  const ref = puzzle.refutation!
  const after = useMemo(() => {
    const c = new Chess(puzzle.fen)
    const m = c.move(puzzle.played)
    return { fen: c.fen(), from: m.from, to: m.to }
  }, [puzzle])
  const answerSan = uciToSan(after.fen, ref.best) ?? ref.best
  const [phase, setPhase] = useState<'solving' | 'checking' | 'solved'>('solving')
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<{ from: string; to: string; note: string } | null>(null)
  const [solved, setSolved] = useState<{ san: string; fen: string; from: string; to: string; exact: boolean } | null>(null)
  const [result, setResult] = useState<{ days: number; reward: Reward } | null>(null)
  const [viewer, setViewer] = useState<{ line: LineStep[]; idx: number } | null>(null)
  const recorded = useRef(false)
  const revealed = mistakes >= REVEAL_AFTER
  const ex = useMemo(() => explainMistake(puzzle.fen, puzzle.played, { score: ref.score, pv: ref.pv }), [puzzle, ref])
  const cat = puzzle.category ? CATEGORY[puzzle.category] : null
  const oppColor = puzzle.myColor === 'w' ? 'Black' : 'White'

  useEffect(() => {
    if (phase !== 'solved' || recorded.current) return
    recorded.current = true
    onSolved(mistakes).then(({ srs, reward }) => setResult({ days: daysUntil(srs, Date.now()), reward }))
  }, [phase, mistakes, onSolved])

  function onMove(from: string, to: string): boolean {
    if (phase !== 'solving') return false
    let move
    try {
      move = new Chess(after.fen).move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    const uci = move.from + move.to + (move.promotion ?? '')
    feedback.move(move.san, false)
    if (uci === ref.best || uci.slice(0, 4) === ref.best.slice(0, 4)) {
      feedback.success()
      setSolved({ san: move.san, fen: move.after, from, to, exact: true })
      setPhase('solved')
      return true
    }
    // Another move: does it punish the mistake just as well?
    setPhase('checking')
    const best = new Chess(after.fen)
    best.move({ from: ref.best.slice(0, 2), to: ref.best.slice(2, 4), promotion: ref.best[4] })
    Promise.all([evaluate(move.after, 12, true), evaluate(best.fen(), 12, true)]).then(([mine, top]) => {
      if (-clampScore(top.score) - -clampScore(mine.score) <= GOOD_ENOUGH) {
        feedback.success()
        setSolved({ san: move.san, fen: move.after, from, to, exact: false })
        setPhase('solved')
      } else {
        feedback.wrong()
        setMistakes((m) => m + 1)
        setWrong({ from, to, note: `${move.san} doesn't punish it. Look again: what did ${puzzle.played} leave unprotected?` })
        setPhase('solving')
      }
    })
    return true
  }

  const step = viewer && viewer.idx >= 0 ? viewer.line[viewer.idx] : null
  const fen = viewer ? (step ? step.fenAfter : puzzle.fen) : (solved?.fen ?? after.fen)
  const styles: Record<string, React.CSSProperties> = {}
  const arrows: Arrow[] = []
  if (viewer) {
    if (step) {
      styles[step.from] = LAST_MOVE
      styles[step.to] = LAST_MOVE
    }
    const next = viewer.line[viewer.idx + 1]
    if (next) arrows.push({ startSquare: next.from, endSquare: next.to, color: ARROW.next })
  } else if (solved) {
    styles[solved.from] = LAST_MOVE
    styles[solved.to] = LAST_MOVE
  } else {
    styles[after.from] = LAST_MOVE
    styles[after.to] = LAST_MOVE
    if (wrong) {
      styles[wrong.from] = WRONG
      styles[wrong.to] = WRONG
    }
    if (revealed) arrows.push({ startSquare: ref.best.slice(0, 2), endSquare: ref.best.slice(2, 4), color: ARROW.correct })
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('weaknesses')} aria-label="Back to my weaknesses">←</button>
        <div>
          <div className="eyebrow">What's the threat? · {progress}</div>
          <h2>Play {oppColor}: punish {puzzle.played}</h2>
        </div>
      </div>

      <Board fen={fen} orientation={puzzle.myColor === 'w' ? 'white' : 'black'} onMove={phase === 'solving' && !viewer ? onMove : undefined} arrows={arrows} squareStyles={styles} />

      {viewer && (
        <div className="line-viewer">
          <div className="line-viewer-head">
            <span className="label">After {puzzle.played}</span>
            <span className="count">{viewer.idx + 1} / {viewer.line.length}</span>
          </div>
          <div className="controls">
            <button type="button" onClick={() => setViewer(null)} aria-label="Close">✕</button>
            <button type="button" disabled={viewer.idx < 0} onClick={() => setViewer({ ...viewer, idx: viewer.idx - 1 })}>Back</button>
            <button type="button" className="primary" disabled={viewer.idx >= viewer.line.length - 1} onClick={() => setViewer({ ...viewer, idx: viewer.idx + 1 })}>Next</button>
          </div>
        </div>
      )}

      <div className="drill-status">
        <span>{phase === 'solved' ? 'Found it' : phase === 'checking' ? 'Checking …' : `You move ${oppColor}'s pieces`}</span>
        <span className={mistakes ? 'bad' : 'good'}>{mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}</span>
      </div>

      {phase !== 'solved' && (
        <div className={`explain ${wrong ? 'wrong' : ''}`}>
          <Mascot mood={wrong ? 'oops' : 'happy'} />
          <div className="move">vs {puzzle.opponent} · {new Date(puzzle.endTime * 1000).toLocaleDateString('en-GB')}</div>
          <p>
            In your game you played <b>{puzzle.played}</b> (yellow). Now switch sides: you are {oppColor}. Find the move that punishes it.
          </p>
          {wrong && <p className="bad">{wrong.note}</p>}
          {revealed && <p>The answer is <b>{answerSan}</b> – play the green arrow.</p>}
        </div>
      )}

      {phase === 'solved' && (
        <>
          <ExplainCard title={`What ${puzzle.played} allowed`} ex={ex} onShow={(line) => setViewer({ line, idx: -1 })} />
          {cat && (
            <section className="explain-card rule-card">
              <div className="label">{cat.title} · the rule</div>
              <p><b>{cat.rule}</b></p>
            </section>
          )}
          <div className="done">
            <Mascot mood="cheer" />
            <div className="done-title">{solved?.exact ? `${solved.san} – that's the threat!` : `${solved?.san} works too`}</div>
            {!solved?.exact && <p>The strongest answer was {answerSan}.</p>}
            <p>Better in your game: <b>{puzzle.bestSan}</b>.</p>
            {result && <Celebrate reward={result.reward} />}
            {result && <p>Next review: {result.days <= 1 ? 'tomorrow' : `in ${result.days} days`}</p>}
            <div className="done-actions">
              <button type="button" onClick={() => go('weaknesses')}>My weaknesses</button>
              <button type="button" className="primary" onClick={onNext}>{isLast ? 'Finish' : 'Next'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
