import { Chess } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { clampScore, pvToSan } from '../lib/blunders'
import type { Puzzle } from '../lib/db'
import { evaluate } from '../lib/engine'
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
      setSolvedWith({ san: move.san, from, to, fen: move.after, exact: true })
      setPhase('solved')
      return true
    }
    if (move.san === puzzle.played) {
      setMistakes((m) => m + 1)
      setWrong({ from, to, note: 'That is the move from your game. Look for something better.' })
      return false
    }
    // Another move: let Stockfish rate it and the best move the same way, then compare
    setPhase('checking')
    setPending(move.after)
    const afterBest = new Chess(puzzle.fen)
    afterBest.move({ from: best.from, to: best.to, promotion: puzzle.best[4] })
    Promise.all([evaluate(move.after, CHECK_DEPTH, true), evaluate(afterBest.fen(), CHECK_DEPTH, true)]).then(([mineEv, bestEv]) => {
      setPending(null)
      const mine = -clampScore(mineEv.score)
      const top = -clampScore(bestEv.score)
      if (top - mine <= GOOD_ENOUGH) {
        setSolvedWith({ san: move.san, from, to, fen: move.after, exact: false })
        setPhase('solved')
      } else {
        setMistakes((m) => m + 1)
        setWrong({ from, to, note: `${move.san} is not good enough here. Try again.` })
        setPhase('solving')
      }
    })
    return true
  }

  const fen = solvedWith?.fen ?? pending ?? puzzle.fen
  const styles: Record<string, React.CSSProperties> = {}
  const arrows: Arrow[] = []
  if (solvedWith) {
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

      <Board fen={fen} orientation={puzzle.myColor === 'w' ? 'white' : 'black'} onMove={phase === 'solving' ? onMove : undefined} arrows={arrows} squareStyles={styles} />

      <div className="drill-status">
        <span>
          {phase === 'solved' ? 'Solved' : phase === 'checking' ? 'Checking your move …' : `You play ${puzzle.myColor === 'w' ? 'White' : 'Black'}`}
        </span>
        <span className={mistakes ? 'bad' : 'good'}>{mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}</span>
      </div>

      {phase !== 'solved' && (
        <div className={`explain ${wrong ? 'wrong' : ''}`}>
          <div className="move">
            vs {puzzle.opponent} · {new Date(puzzle.endTime * 1000).toLocaleDateString('en-GB')}
          </div>
          <p>
            In the game you played <b>{puzzle.played}</b> (red arrow). {why}
          </p>
          {wrong && <p className="bad">{wrong.note}</p>}
          {revealed && <p>The best move is <b>{puzzle.bestSan}</b> – play the green arrow.</p>}
        </div>
      )}

      {phase === 'solved' && (
        <div className="done">
          <div className="done-title">
            {solvedWith?.exact ? `${solvedWith.san} – the best move` : `${solvedWith?.san} works too`}
          </div>
          {!solvedWith?.exact && <p>The engine's first choice was {puzzle.bestSan}.</p>}
          <p>Best line: {pvToSan(puzzle.fen, puzzle.pv, 5).join(' ')}</p>
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
