import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { OpeningStory } from '../components/OpeningStory'
import { SpeakButton } from '../components/SpeakButton'
import { checkMove, firstPlayerPly, isFinished } from '../lib/drill'
import { feedback as fx } from '../lib/feedback'
import { onDrillMoves, shareDrill, type Mover } from '../lib/live'
import type { Line, LineMove } from '../lib/pgn'
import { explanationText } from '../lib/speech'
import { canRewind, rewindTo } from '../lib/rewind'
import { rewindSound } from '../lib/rushFx'
import { daysUntil, type SrsState } from '../lib/srs'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { moveLabel } from './Learn'
import { lineName, nameAt } from '../lib/lineNames'

type Feedback =
  | { kind: 'wrong'; tried: { from: string; to: string }; expected: LineMove; ply: number; by?: Mover }
  | { kind: 'info'; move: LineMove; ply: number }
  | null

interface Props {
  line: Line
  onDone: (mistakes: number, strictClean?: boolean) => Promise<{ srs: SrsState; reward: Reward }>
  // Shown when the line is done (e.g. “Next due line”).
  after: (restart: () => void) => React.ReactNode
  progress?: string
}

const OPPONENT_DELAY = 550
const STRICT_KEY = 'hoppy-drill-strict'
function loadStrict(): boolean {
  try {
    return localStorage.getItem(STRICT_KEY) === '1'
  } catch {
    return false
  }
}

// Drill mode: Lu plays their side, the app plays the opponent's moves.
export function Drill({ line, onDone, after, progress }: Props) {
  const [ply, setPly] = useState(0)
  const [mistakePlies, setMistakePlies] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [nextDays, setNextDays] = useState<number | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const [review, setReview] = useState<number | null>(null)
  const [lastBy, setLastBy] = useState<(Mover & { san: string }) | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const recorded = useRef(false)
  // Strict (BAUPLAN 35, a try – Lu decides after testing): after a mistake and the right move, back 3 own moves
  const [strict, setStrict] = useState(loadStrict)
  const [resets, setResets] = useState<Map<number, number>>(new Map())
  const [rewinding, setRewinding] = useState(false)
  const [rewound, setRewound] = useState(0) // how often today's round went back
  const [streak, setStreak] = useState(0) // right own moves in a row
  const [furthest, setFurthest] = useState(0)
  const [rewindNote, setRewindNote] = useState<string | null>(null)

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
    setLastBy(null)
    setResets(new Map())
    setRewinding(false)
    setRewound(0)
    setStreak(0)
    setFurthest(0)
    setRewindNote(null)
  }, [])
  function toggleStrict() {
    const next = !strict
    setStrict(next)
    try {
      localStorage.setItem(STRICT_KEY, next ? '1' : '0')
    } catch {
      // only for this visit
    }
  }

  // Play the opponent's move automatically
  useEffect(() => {
    if (finished || rewinding || !current || current.color === line.side) return
    timer.current = window.setTimeout(() => {
      fx.move(current.san, false)
      setPly((p) => p + 1)
      if (current.comment) setFeedback({ kind: 'info', move: current, ply })
    }, ply === 0 ? 300 : OPPONENT_DELAY)
    return () => window.clearTimeout(timer.current)
  }, [ply, finished, current, line.side, rewinding])

  // Line done → update the review schedule (once)
  useEffect(() => {
    if (!finished || recorded.current || ply < firstPlayerPly(line)) return
    recorded.current = true
    fx.success()
    onDone(mistakePlies.size, strict && rewound === 0 && mistakePlies.size === 0).then(({ srs, reward }) => {
      setNextDays(daysUntil(srs, Date.now()))
      setReward(reward)
    })
  }, [finished, ply, line, mistakePlies, onDone, strict, rewound])

  // The others in the watch room see this line as it is played
  const watched = useMemo(() => {
    const last = ply > 0 ? line.moves[ply - 1] : null
    const wrong = feedback?.kind === 'wrong' && feedback.ply === ply ? feedback : null
    const note = feedback?.kind === 'info' && !finished && feedback.move.comment ? feedback : null
    return {
      title: line.title,
      side: line.side,
      fen: last ? last.fenAfter : line.moves[0].fenBefore,
      last: last ? { from: last.from, to: last.to } : undefined,
      ply,
      total: line.moves.length,
      mistakes: mistakePlies.size,
      wrong: wrong ? { tried: wrong.tried, san: wrong.expected.san, from: wrong.expected.from, to: wrong.expected.to, comment: wrong.expected.comment, by: wrong.by } : undefined,
      note: note ? { label: moveLabel(line, note.ply), comment: note.move.comment! } : undefined,
      lastBy: lastBy ?? undefined,
      done: finished,
    }
  }, [line, ply, mistakePlies, feedback, finished, lastBy])
  useEffect(() => {
    shareDrill(watched)
    const t = window.setInterval(() => shareDrill(watched), 30_000)
    return () => window.clearInterval(t)
  }, [watched])
  useEffect(() => {
    return () => shareDrill(null)
  }, [])

  // `by`: someone else in the watch room played it on their phone
  function onMove(from: string, to: string, by?: Mover): boolean {
    if (!myTurn || rewinding) return false
    const res = checkMove(current, from, to)
    if (res === 'illegal') return false
    if (res === 'wrong') {
      fx.wrong()
      setMistakePlies((s) => new Set(s).add(ply))
      setFeedback({ kind: 'wrong', tried: { from, to }, expected: current, ply, by })
      setStreak(0)
      return false
    }
    fx.move(current.san)
    // after a wrong try the right move was shown – then it counts, but does not light up
    const hadWrong = feedback?.kind === 'wrong' && feedback.ply === ply
    fx.glow(to, 'good', mistakePlies.has(ply))
    setFeedback(current.comment ? { kind: 'info', move: current, ply } : null)
    setLastBy(by ? { ...by, san: current.san } : null)
    setPly(ply + 1)
    setFurthest((f) => Math.max(f, ply + 1))
    setStreak((n) => (hadWrong ? 0 : n + 1))
    // Strict: the right move after a mistake → the board goes back, the way there is played again from memory
    const count = resets.get(ply) ?? 0
    if (strict && hadWrong && canRewind(count)) {
      const target = rewindTo(line.moves.map((m) => m.color), line.side, ply)
      setResets((m) => new Map(m).set(ply, count + 1))
      setRewound((n) => n + 1)
      setRewinding(true)
      let at = ply + 1
      window.setTimeout(() => {
        rewindSound()
        setFeedback(null)
        setRewindNote(target === 0 ? 'Back to move 1 – play the line again from memory.' : 'Back 3 moves – play the way there again from memory.')
        const back = window.setInterval(() => {
          at -= 1
          setPly(at)
          if (at <= target) {
            window.clearInterval(back)
            setRewinding(false)
          }
        }, 160)
      }, 700)
    } else if (strict && hadWrong) setRewindNote('Twice back at this spot already – on we go.')
    else if (rewindNote && !hadWrong) setRewindNote(null)
    return true
  }

  // Practising together: a move from the other phone counts if it is still that move's turn
  const latest = useRef({ ply, onMove })
  useEffect(() => {
    latest.current = { ply, onMove }
  })
  useEffect(() => {
    return onDrillMoves((m) => {
      if (m.ply === latest.current.ply) latest.current.onMove(m.from, m.to, m.by)
    })
  }, [])

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

      <div className="strict-bar">
        <button type="button" className={`strict-toggle${strict ? ' on' : ''}`} aria-pressed={strict} onClick={toggleStrict} disabled={rewinding}>
          Strict {strict ? 'on' : 'off'}
        </button>
        {strict && (
          <>
            <span className="strict-track" aria-label={`${ply} of ${line.moves.length} moves`}>
              <i className="far" style={{ width: `${(100 * furthest) / line.moves.length}%` }} />
              <i style={{ width: `${(100 * ply) / line.moves.length}%` }} />
            </span>
            <span className="strict-streak" title="Right moves in a row">🔥 {streak}</span>
          </>
        )}
      </div>
      {strict && rewindNote && !finished && <p className={`strict-note${rewinding ? ' going' : ''}`} aria-live="polite">⏪ {rewindNote}</p>}

      <Board fen={boardFen} orientation={line.side === 'w' ? 'white' : 'black'} onMove={finished ? undefined : onMove} arrows={finished ? [] : arrows} squareStyles={boardStyles} />
      {/* Lu, 13.11.: the real name of the position, live under the board */}
      <p className="opening-now" aria-live="polite">{nameAt(line, finished && review !== null ? review : ply) ?? lineName(line) ?? ''}</p>

      <div className="drill-status">
        <span>{finished ? 'Line complete' : myTurn ? 'Your move' : 'Opponent is moving …'}</span>
        <span className={mistakes ? 'bad' : 'good'}>{mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}</span>
      </div>

      {lastBy && !finished && !(feedback?.kind === 'wrong' && feedback.ply === ply) && (
        <p className="together-note"><b>{lastBy.name}</b> played {lastBy.san}</p>
      )}

      {feedback?.kind === 'wrong' && feedback.ply === ply && (
        <div className="explain wrong" role="alert">
          <Mascot mood="oops" />
          <div className="move">{feedback.by ? `${feedback.by.name} tried another move. ` : ''}The right move is {feedback.expected.san}</div>
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

      {!finished && <OpeningStory line={line} />}

      {finished && (
        <div className="done">
          <Mascot mood="cheer" />
          <div className="done-title">{strict && mistakes === 0 && rewound === 0 ? 'Clean run!' : mistakes === 0 ? 'Perfect!' : mistakes === 1 ? 'Well done!' : 'You did it!'}</div>
          {strict && mistakes === 0 && rewound === 0 && <p>You remembered the whole order – no step back. It comes back a little later.</p>}
          {strict && rewound > 0 && <p>{rewound === 1 ? 'One step back' : `${rewound} steps back`} – next time the whole line in one go.</p>}
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
