import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { clampScore } from '../lib/blunders'
import type { Puzzle } from '../lib/db'
import { evaluate } from '../lib/engine'
import { explainBest, explainMistake, type Explanation, type LineStep } from '../lib/explain'
import { feedback } from '../lib/feedback'
import { daysUntil, type SrsState } from '../lib/srs'

// A move within this many centipawns of the engine's best move also solves the puzzle.
const GOOD_ENOUGH = 50
const CHECK_DEPTH = 14
const REVEAL_AFTER = 2

type Phase = 'solving' | 'checking' | 'solved'

interface Props {
  puzzle: Puzzle
  progress: string
  onSolved: (mistakes: number) => Promise<{ srs: SrsState; reward: Reward }>
  onNext: () => void
  isLast: boolean
}

export function PuzzleView({ puzzle, progress, onSolved, onNext, isLast }: Props) {
  const [phase, setPhase] = useState<Phase>('solving')
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<{ from: string; to: string; note: string } | null>(null)
  const [solvedWith, setSolvedWith] = useState<{ san: string; from: string; to: string; fen: string; exact: boolean } | null>(null)
  const [result, setResult] = useState<{ days: number; reward: Reward } | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const recorded = useRef(false)

  const revealed = mistakes >= REVEAL_AFTER
  // Explanations: why the game move was bad (engine answer computed on demand), why the best move is better
  const [mistakeEx, setMistakeEx] = useState<Explanation | 'loading' | null>(null)
  const [viewer, setViewer] = useState<{ line: LineStep[]; idx: number; title: string } | null>(null)
  const bestEx = useMemo(() => explainBest(puzzle.fen, puzzle.pv, puzzle.scoreBefore), [puzzle])

  function loadMistake() {
    if (mistakeEx) return
    setMistakeEx('loading')
    const after = new Chess(puzzle.fen).move(puzzle.played).after
    evaluate(after, 14, true)
      .then((ev) => setMistakeEx(explainMistake(puzzle.fen, puzzle.played, { score: ev.score, pv: ev.pv })))
      .catch(() => setMistakeEx({ sentences: ['The engine could not look at this position right now.'], line: [] }))
  }

  // Once the answer is known, explain both moves right away
  useEffect(() => {
    if (phase === 'solved' || revealed) loadMistake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed])
  const best = { from: puzzle.best.slice(0, 2), to: puzzle.best.slice(2, 4) }
  const playedMove = new Chess(puzzle.fen).move(puzzle.played)

  // Record the result exactly once (onSolved changes identity on every parent render)
  useEffect(() => {
    if (phase !== 'solved' || recorded.current) return
    recorded.current = true
    onSolved(mistakes).then(({ srs, reward }) => setResult({ days: daysUntil(srs, Date.now()), reward }))
  }, [phase, mistakes, onSolved])

  function onMove(from: string, to: string): boolean {
    if (phase !== 'solving') return false
    const chess = new Chess(puzzle.fen)
    let move
    try {
      move = chess.move({ from, to, promotion: from + to === puzzle.best.slice(0, 4) ? puzzle.best[4] ?? 'q' : 'q' })
    } catch {
      return false
    }
    const uci = move.from + move.to + (move.promotion ?? '')
    if (uci === puzzle.best) {
      feedback.move(move.san)
      feedback.success()
      setSolvedWith({ san: move.san, from, to, fen: move.after, exact: true })
      setPhase('solved')
      return true
    }
    if (move.san === puzzle.played) {
      feedback.wrong()
      setMistakes((m) => m + 1)
      setWrong({ from, to, note: 'That is the move from your game. Look for something better.' })
      return false
    }
    // Another move: let Stockfish rate it and the best move the same way, then compare
    feedback.move(move.san)
    setPhase('checking')
    setPending(move.after)
    const afterBest = new Chess(puzzle.fen)
    afterBest.move({ from: best.from, to: best.to, promotion: puzzle.best[4] })
    Promise.all([evaluate(move.after, CHECK_DEPTH, true), evaluate(afterBest.fen(), CHECK_DEPTH, true)]).then(([mineEv, bestEv]) => {
      setPending(null)
      const mine = -clampScore(mineEv.score)
      const top = -clampScore(bestEv.score)
      if (top - mine <= GOOD_ENOUGH) {
        feedback.success()
        setSolvedWith({ san: move.san, from, to, fen: move.after, exact: false })
        setPhase('solved')
      } else {
        feedback.wrong()
        setMistakes((m) => m + 1)
        setWrong({ from, to, note: `${move.san} is not good enough here. Try again.` })
        setPhase('solving')
      }
    })
    return true
  }

  const step = viewer && viewer.idx >= 0 ? viewer.line[viewer.idx] : null
  const fen = viewer ? (step ? step.fenAfter : puzzle.fen) : (solvedWith?.fen ?? pending ?? puzzle.fen)
  const styles: Record<string, React.CSSProperties> = {}
  const arrows: Arrow[] = []
  if (viewer) {
    if (step) {
      styles[step.from] = LAST_MOVE
      styles[step.to] = LAST_MOVE
    }
    const next = viewer.line[viewer.idx + 1]
    if (next) arrows.push({ startSquare: next.from, endSquare: next.to, color: ARROW.next })
  } else if (solvedWith) {
    styles[solvedWith.from] = LAST_MOVE
    styles[solvedWith.to] = LAST_MOVE
  } else {
    if (wrong) {
      styles[wrong.from] = WRONG
      styles[wrong.to] = WRONG
    }
    arrows.push({ startSquare: playedMove.from, endSquare: playedMove.to, color: 'rgba(229, 72, 77, 0.55)' })
    if (revealed) arrows.push({ startSquare: best.from, endSquare: best.to, color: ARROW.correct })
  }

  const pawns = Math.round(puzzle.loss / 100)
  const why =
    puzzle.kind === 'missed-mate'
      ? `There was a checkmate in ${puzzle.mateIn}.`
      : pawns >= 9
        ? 'It turned the game around.'
        : `It cost you about ${pawns} pawns' worth.`

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">Blunder puzzle · {progress}</div>
          <h2>Find a better move</h2>
        </div>
      </div>

      <Board fen={fen} orientation={puzzle.myColor === 'w' ? 'white' : 'black'} onMove={phase === 'solving' && !viewer ? onMove : undefined} arrows={arrows} squareStyles={styles} />

      {viewer && (
        <div className="line-viewer">
          <div className="line-viewer-head">
            <span className="label">{viewer.title}</span>
            <span className="count">{viewer.idx + 1} / {viewer.line.length}</span>
          </div>
          <div className="line-moves">
            {viewer.line.map((s, i) => (
              <button key={i} type="button" className={`chip ${i === viewer.idx ? 'current' : ''}`} onClick={() => setViewer({ ...viewer, idx: i })}>
                {s.san}
              </button>
            ))}
          </div>
          <div className="controls">
            <button type="button" onClick={() => setViewer(null)} aria-label="Close">✕</button>
            <button type="button" disabled={viewer.idx < 0} onClick={() => setViewer({ ...viewer, idx: viewer.idx - 1 })}>Back</button>
            <button type="button" className="primary" disabled={viewer.idx >= viewer.line.length - 1} onClick={() => setViewer({ ...viewer, idx: viewer.idx + 1 })}>Next</button>
          </div>
        </div>
      )}

      <div className="drill-status">
        <span>
          {phase === 'solved' ? 'Solved' : phase === 'checking' ? 'Checking your move …' : `You play ${puzzle.myColor === 'w' ? 'White' : 'Black'}`}
        </span>
        <span className={mistakes ? 'bad' : 'good'}>{mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}</span>
      </div>

      {phase !== 'solved' && (
        <div className={`explain ${wrong ? 'wrong' : ''}`}>
          <Mascot mood={wrong ? 'oops' : 'happy'} />
          <div className="move">
            vs {puzzle.opponent} · {new Date(puzzle.endTime * 1000).toLocaleDateString('en-GB')}
          </div>
          <p>
            In the game you played <b>{puzzle.played}</b> (red arrow). {why}
          </p>
          {wrong && <p className="bad">{wrong.note}</p>}
          {revealed && <p>The best move is <b>{puzzle.bestSan}</b> – play the green arrow.</p>}
          {!mistakeEx && (
            <button type="button" className="speak-btn" onClick={loadMistake}>Why is {puzzle.played} bad?</button>
          )}
        </div>
      )}

      {mistakeEx && (
        <ExplainCard
          title={`Why ${puzzle.played} was a mistake`}
          ex={mistakeEx}
          onShow={(line) => setViewer({ line, idx: -1, title: `After ${puzzle.played}` })}
        />
      )}
      {(phase === 'solved' || revealed) && bestEx.sentences.length > 0 && (
        <ExplainCard title={`Why ${puzzle.bestSan} is better`} ex={bestEx} onShow={(line) => setViewer({ line, idx: -1, title: `After ${puzzle.bestSan}` })} />
      )}

      {phase === 'solved' && (
        <div className="done">
          <Mascot mood="cheer" />
          <div className="done-title">
            {solvedWith?.exact ? `${solvedWith.san} – the best move` : `${solvedWith?.san} works too`}
          </div>
          {!solvedWith?.exact && <p>The engine's first choice was {puzzle.bestSan}.</p>}
          <p>
            <a href={`${puzzle.gameUrl}?move=${puzzle.ply}`} target="_blank" rel="noreferrer">Open the game on chess.com</a>
          </p>
          {result && <Celebrate reward={result.reward} />}
          {result && <p>Next review: {result.days <= 1 ? 'tomorrow' : `in ${result.days} days`}</p>}
          <div className="done-actions">
            <button type="button" onClick={() => go('')}>Overview</button>
            <button type="button" className="primary" onClick={onNext}>{isLast ? 'Finish' : 'Next puzzle'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExplainCard({ title, ex, onShow }: { title: string; ex: Explanation | 'loading'; onShow: (line: LineStep[]) => void }) {
  // The board is at the top of the screen: bring it into view when a line is shown
  const show = (line: LineStep[]) => {
    onShow(line)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <section className="explain-card">
      <div className="label">{title}</div>
      {ex === 'loading' ? (
        <p className="note">Looking at the position …</p>
      ) : (
        <>
          {ex.sentences.map((s) => (
            <p key={s}>{s}</p>
          ))}
          {ex.line.length > 0 && (
            <button type="button" className="speak-btn" onClick={() => show(ex.line)}>▶ Show it on the board</button>
          )}
        </>
      )}
    </section>
  )
}

