import { useEffect, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { SpeakButton } from '../components/SpeakButton'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { feedback } from '../lib/feedback'
import type { Line, LineArrow } from '../lib/pgn'
import { explanationText } from '../lib/speech'

const CAL: Record<LineArrow['color'], string> = {
  G: ARROW.idea,
  R: 'rgba(229, 72, 77, 0.85)',
  Y: 'rgba(255, 214, 102, 0.9)',
  B: ARROW.next,
}

export function moveLabel(line: Line, i: number) {
  const m = line.moves[i]
  const no = Math.floor(i / 2) + 1
  return `${no}.${m.color === 'b' ? '..' : ''} ${m.san}`
}

// Learn mode: step through a line move by move, with an explanation for each move.
export function Learn({ line, onComplete }: { line: Line; onComplete: () => Promise<Reward> }) {
  const [ply, setPly] = useState(0)
  const [reward, setReward] = useState<Reward | null>(null)
  const completed = useRef(false)
  const last = ply > 0 ? line.moves[ply - 1] : null
  const next = line.moves[ply]
  const fen = last ? last.fenAfter : line.moves[0].fenBefore

  const arrows: Arrow[] = (last?.arrows ?? []).map((a) => ({ startSquare: a.from, endSquare: a.to, color: CAL[a.color] }))
  if (next) arrows.push({ startSquare: next.from, endSquare: next.to, color: ARROW.next })

  const styles = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}

  // XP once per visit, the first time the end of the line is reached
  useEffect(() => {
    if (next || completed.current) return
    completed.current = true
    onComplete().then(setReward)
  }, [next, onComplete])

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">Learn · {line.side === 'w' ? 'White' : 'Black'}</div>
          <h2>{line.title}</h2>
        </div>
      </div>

      <Board fen={fen} orientation={line.side === 'w' ? 'white' : 'black'} arrows={arrows} squareStyles={styles} />

      <div className="explain">
        <Mascot mood="happy" />
        {last ? (
          <>
            <div className={`move ${last.color === line.side ? 'mine' : ''}`}>{moveLabel(line, ply - 1)}</div>
            <p>{last.comment ?? (last.color === line.side ? 'Your move in this line.' : 'Your opponent\'s move.')}</p>
            {last.comment && <SpeakButton text={explanationText(last.san, last.comment)} />}
          </>
        ) : (
          <p>Starting position. The blue arrow always shows the next move. Tap “Next”.</p>
        )}
      </div>

      <div className="controls">
        <button type="button" onClick={() => setPly(0)} disabled={ply === 0} aria-label="To the start">⏮</button>
        <button type="button" onClick={() => setPly(ply - 1)} disabled={ply === 0}>Back</button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (next) feedback.move(next.san, next.color === line.side)
            setPly(ply + 1)
          }}
          disabled={!next}
        >
          Next
        </button>
      </div>

      <ol className="movelist" aria-label="Moves of the line">
        {line.moves.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              className={`chip ${i === ply - 1 ? 'current' : ''} ${m.color === line.side ? 'mine' : ''} ${m.comment ? 'has-comment' : ''}`}
              onClick={() => setPly(i + 1)}
            >
              {moveLabel(line, i)}
            </button>
          </li>
        ))}
      </ol>

      {!next && reward && (
        <div className="learn-reward">
          <Celebrate reward={reward} />
        </div>
      )}
      {!next && (
        <button type="button" className="primary wide" onClick={() => go('drill/' + line.id)}>
          Now play it yourself (drill)
        </button>
      )}
    </div>
  )
}
