import { useEffect, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { SpeakButton } from '../components/SpeakButton'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { checkMove } from '../lib/drill'
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

const OPPONENT_DELAY = 700

// Learn mode: Lu moves the pieces of their side along the blue arrow (to get a feel for the moves),
// the opponent's replies play by themselves, and every move comes with its explanation.
// Next/Back still step through the line without moving pieces.
export function Learn({ line, onComplete }: { line: Line; onComplete: () => Promise<Reward> }) {
  const [ply, setPly] = useState(0)
  const [reward, setReward] = useState<Reward | null>(null)
  // flow = the opponent answers by itself; off while Lu browses back through the line
  const [flow, setFlow] = useState(true)
  const [missed, setMissed] = useState<{ from: string; to: string; ply: number } | null>(null)
  const completed = useRef(false)
  const last = ply > 0 ? line.moves[ply - 1] : null
  const next = line.moves[ply]
  const fen = last ? last.fenAfter : line.moves[0].fenBefore
  const myTurn = !!next && next.color === line.side
  // When the reply has no explanation of its own, keep showing the explanation of the move before it
  const prev = ply > 1 ? line.moves[ply - 2] : null
  const shownIndex = last && !last.comment && prev?.comment ? ply - 2 : ply - 1
  const shown = shownIndex >= 0 ? line.moves[shownIndex] : null
  const waiting = !!next && !myTurn && flow

  const arrows: Arrow[] = (last?.arrows ?? []).map((a) => ({ startSquare: a.from, endSquare: a.to, color: CAL[a.color] }))
  if (next && !waiting) arrows.push({ startSquare: next.from, endSquare: next.to, color: ARROW.next })

  const styles: Record<string, React.CSSProperties> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}
  const wrongNow = missed && missed.ply === ply
  if (wrongNow) {
    styles[missed.from] = WRONG
    styles[missed.to] = WRONG
  }

  // The opponent's reply plays by itself
  useEffect(() => {
    if (!waiting) return
    const t = window.setTimeout(() => {
      feedback.move(next.san, false)
      setPly((p) => p + 1)
    }, ply === 0 ? 450 : OPPONENT_DELAY)
    return () => window.clearTimeout(t)
  }, [waiting, next, ply])

  function onMove(from: string, to: string): boolean {
    if (!myTurn) return false
    const res = checkMove(next, from, to)
    if (res === 'illegal') return false
    if (res === 'wrong') {
      feedback.wrong()
      setMissed({ from, to, ply })
      return false
    }
    feedback.move(next.san)
    setMissed(null)
    setFlow(true)
    setPly(ply + 1)
    return true
  }

  function jump(to: number) {
    setFlow(false)
    setMissed(null)
    setPly(to)
  }

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

      <Board fen={fen} orientation={line.side === 'w' ? 'white' : 'black'} onMove={myTurn ? onMove : undefined} arrows={arrows} squareStyles={styles} />

      <div className="drill-status">
        <span>{!next ? 'Line complete' : myTurn ? 'Your move: follow the blue arrow' : waiting ? 'Opponent is moving …' : 'Opponent’s move – tap Next'}</span>
        {wrongNow && <span className="bad">Not this one</span>}
      </div>

      <div className="explain">
        <Mascot mood="happy" />
        {shown ? (
          <>
            <div className={`move ${shown.color === line.side ? 'mine' : ''}`}>{moveLabel(line, shownIndex)}</div>
            <p>{shown.comment ?? (shown.color === line.side ? 'Your move in this line.' : 'Your opponent\'s move.')}</p>
            {shown.comment && <SpeakButton text={explanationText(shown.san, shown.comment)} />}
          </>
        ) : (
          <p>{myTurn ? 'Starting position. Move your piece along the blue arrow.' : 'Starting position. Your opponent starts.'}</p>
        )}
      </div>

      <div className="controls">
        <button type="button" onClick={() => jump(0)} disabled={ply === 0} aria-label="To the start">⏮</button>
        <button type="button" onClick={() => jump(ply - 1)} disabled={ply === 0}>Back</button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (next) feedback.move(next.san, next.color === line.side)
            setMissed(null)
            setFlow(true)
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
              onClick={() => jump(i + 1)}
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
      {!next && (
        <button type="button" className="wide" onClick={() => go('play/line/' + line.id)}>
          Play on from here vs Hoppy-Bot
        </button>
      )}
    </div>
  )
}
