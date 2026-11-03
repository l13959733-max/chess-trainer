import { useCallback, useEffect, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { SpeakButton } from '../components/SpeakButton'
import { checkMove, firstPlayerPly, isFinished } from '../lib/drill'
import { feedback as fx } from '../lib/feedback'
import type { Line, LineMove } from '../lib/pgn'
import { explanationText } from '../lib/speech'
import { daysUntil, type SrsState } from '../lib/srs'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { moveLabel } from './Learn'

type Feedback =
  | { kind: 'wrong'; tried: { from: string; to: string }; expected: LineMove; ply: number }
  | { kind: 'info'; move: LineMove; ply: number }
  | null

interface Props {
  line: Line
  onDone: (mistakes: number) => Promise<{ srs: SrsState; reward: Reward }>
  // Shown when the line is done (e.g. “Next due line”).
  after: (restart: () => void) => React.ReactNode
  progress?: string
}

const OPPONENT_DELAY = 550

// Drill mode: Lu plays their side, the app plays the opponent's moves.
export function Drill({ line, onDone, after, progress }: Props) {
  const [ply, setPly] = useState(0)
  const [mistakePlies, setMistakePlies] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [nextDays, setNextDays] = useState<number | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const [review, setReview] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const recorded = useRef(false)

  const finished = isFinished(line, ply)
  const current = line.moves[ply]
  const myTurn = !finished && current?.color === line.side

  const restart = useCallback(() => {
    window.clearTimeout(timer.current)
    recorded.current = false
    setPly(0)
    setMistakePlies(new Set())
    setFeedback(null)
    setNextDays(null)
    setReward(null)
    setReview(null)
  }, [])

  // Play the opponent's move automatically
  useEffect(() => {
    if (finished || !current || current.color === line.side) return
    timer.current = window.setTimeout(() => {
      fx.move(current.san, false)
      setPly((p) => p + 1)
      if (current.comment) setFeedback({ kind: 'info', move: current, ply })
    }, ply === 0 ? 300 : OPPONENT_DELAY)
    return () => window.clearTimeout(timer.current)
  }, [ply, finished, current, line.side])

  // Line done → update the review schedule (once)
  useEffect(() => {
    if (!finished || recorded.current || ply < firstPlayerPly(line)) return
    recorded.current = true
    fx.success()
    onDone(mistakePlies.size).then(({ srs, reward }) => {
      setNextDays(daysUntil(srs, Date.now()))
      setReward(reward)
    })
  }, [finished, ply, line, mistakePlies, onDone])

  function onMove(from: string, to: string): boolean {
    if (!myTurn) return false
    const res = checkMove(current, from, to)
    if (res === 'illegal') return false
    if (res === 'wrong') {
      fx.wrong()
      setMistakePlies((s) => new Set(s).add(ply))
      setFeedback({ kind: 'wrong', tried: { from, to }, expected: current, ply })
      return false
    }
    fx.move(current.san)
    setFeedback(current.comment ? { kind: 'info', move: current, ply } : null)
    setPly(ply + 1)
    return true
  }

  const last = ply > 0 ? line.moves[ply - 1] : null
  const fen = last ? last.fenAfter : line.moves[0].fenBefore
  const styles: Record<string, React.CSSProperties> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}
  const arrows: Arrow[] = []
  if (feedback?.kind === 'wrong' && feedback.ply === ply) {
    styles[feedback.tried.from] = WRONG
    styles[feedback.tried.to] = WRONG
    arrows.push({ startSquare: feedback.expected.from, endSquare: feedback.expected.to, color: ARROW.correct })
  }

  const mistakes = mistakePlies.size
  // After the line: look back through it move by move (null = final position)
  const shown = finished && review !== null ? line.moves[review - 1] : null
  const boardFen = finished && review !== null ? (review === 0 ? line.moves[0].fenBefore : line.moves[review - 1].fenAfter) : fen
  const boardStyles = finished && review !== null ? (shown ? { [shown.from]: LAST_MOVE, [shown.to]: LAST_MOVE } : {}) : styles

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">Drill · {line.side === 'w' ? 'White' : 'Black'}{progress ? ` · ${progress}` : ''}</div>
          <h2>{line.title}</h2>
        </div>
      </div>

      <Board fen={boardFen} orientation={line.side === 'w' ? 'white' : 'black'} onMove={finished ? undefined : onMove} arrows={finished ? [] : arrows} squareStyles={boardStyles} />

      <div className="drill-status">
        <span>{finished ? 'Line complete' : myTurn ? 'Your move' : 'Opponent is moving …'}</span>
        <span className={mistakes ? 'bad' : 'good'}>{mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}</span>
      </div>

      {feedback?.kind === 'wrong' && feedback.ply === ply && (
        <div className="explain wrong" role="alert">
          <Mascot mood="oops" />
          <div className="move">The right move is {feedback.expected.san}</div>
          <p>{feedback.expected.comment ?? 'Play the green arrow to continue.'}</p>
          <SpeakButton text={explanationText(feedback.expected.san, feedback.expected.comment, 'The right move is')} />
        </div>
      )}
      {feedback?.kind === 'info' && !finished && (
        <div className="explain">
          <Mascot mood="happy" />
          <div className={`move ${feedback.move.color === line.side ? 'mine' : ''}`}>{moveLabel(line, feedback.ply)}</div>
          <p>{feedback.move.comment}</p>
          <SpeakButton text={explanationText(feedback.move.san, feedback.move.comment)} />
        </div>
      )}

      {finished && (
        <div className="done">
          <Mascot mood="cheer" />
          <div className="done-title">{mistakes === 0 ? 'Perfect!' : mistakes === 1 ? 'Well done!' : 'You did it!'}</div>
          {reward && <Celebrate reward={reward} />}
          {nextDays !== null && <p>Next review: {nextDays <= 1 ? 'tomorrow' : `in ${nextDays} days`}</p>}
          <div className="done-actions">{after(restart)}</div>
        </div>
      )}

      {finished && (
        <section className="review-card">
          <div className="label">Look back through the line</div>
          <div className="nav-row" role="group" aria-label="Look through the line">
            <button type="button" aria-label="Start position" onClick={() => setReview(0)}>⏮</button>
            <button type="button" aria-label="Previous move" disabled={review === 0} onClick={() => setReview((review ?? line.moves.length) - 1)}>◀</button>
            <span className="nav-pos">{review === null ? 'End of the line' : review === 0 ? 'Start' : `Move ${review} of ${line.moves.length}`}</span>
            <button type="button" aria-label="Next move" disabled={review === null} onClick={() => setReview(review! + 1 >= line.moves.length ? null : review! + 1)}>▶</button>
            <button type="button" aria-label="End of the line" disabled={review === null} onClick={() => setReview(null)}>⏭</button>
          </div>
          <ol className="movelist" aria-label="Moves of the line">
            {line.moves.map((m, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`chip ${m.color === line.side ? (mistakePlies.has(i) ? 'missed' : 'right') : ''} ${(review === null ? i === line.moves.length - 1 : i === review - 1) ? 'current' : ''}`}
                  onClick={() => setReview(i + 1 >= line.moves.length ? null : i + 1)}
                >
                  {moveLabel(line, i)}
                </button>
              </li>
            ))}
          </ol>
          {shown?.comment && (
            <p>
              <b>{moveLabel(line, review! - 1)}</b> {shown.comment}
            </p>
          )}
          <p className="note small">Green = you played it right. Red = you needed a second try.</p>
        </section>
      )}
    </div>
  )
}
