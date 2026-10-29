import { useCallback, useEffect, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { checkMove, firstPlayerPly, isFinished } from '../lib/drill'
import { toGerman, type Line, type LineMove } from '../lib/pgn'
import { daysUntil, type SrsState } from '../lib/srs'
import { go } from '../hooks/useHashRoute'
import { moveLabel } from './Learn'

type Feedback =
  | { kind: 'wrong'; tried: { from: string; to: string }; expected: LineMove; ply: number }
  | { kind: 'info'; move: LineMove; ply: number }
  | null

interface Props {
  line: Line
  onDone: (mistakes: number) => Promise<SrsState>
  // Wird gezeigt, wenn die Linie geschafft ist (z. B. „Nächste fällige Linie").
  after: (restart: () => void) => React.ReactNode
  progress?: string
}

const OPPONENT_DELAY = 550

// Drill-Modus: Lu spielt seine Seite, die App die Gegnerzüge.
export function Drill({ line, onDone, after, progress }: Props) {
  const [ply, setPly] = useState(0)
  const [mistakePlies, setMistakePlies] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [nextDays, setNextDays] = useState<number | null>(null)
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
  }, [])

  // Gegnerzug automatisch ausführen
  useEffect(() => {
    if (finished || !current || current.color === line.side) return
    timer.current = window.setTimeout(() => {
      setPly((p) => p + 1)
      if (current.comment) setFeedback({ kind: 'info', move: current, ply })
    }, ply === 0 ? 300 : OPPONENT_DELAY)
    return () => window.clearTimeout(timer.current)
  }, [ply, finished, current, line.side])

  // Linie geschafft → Wiederholungsplan aktualisieren (einmal)
  useEffect(() => {
    if (!finished || recorded.current || ply < firstPlayerPly(line)) return
    recorded.current = true
    onDone(mistakePlies.size).then((s) => setNextDays(daysUntil(s, Date.now())))
  }, [finished, ply, line, mistakePlies, onDone])

  function onMove(from: string, to: string): boolean {
    if (!myTurn) return false
    const res = checkMove(current, from, to)
    if (res === 'illegal') return false
    if (res === 'wrong') {
      setMistakePlies((s) => new Set(s).add(ply))
      setFeedback({ kind: 'wrong', tried: { from, to }, expected: current, ply })
      return false
    }
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

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Zurück zur Übersicht">←</button>
        <div>
          <div className="eyebrow">Drill · {line.side === 'w' ? 'Weiß' : 'Schwarz'}{progress ? ` · ${progress}` : ''}</div>
          <h2>{line.title}</h2>
        </div>
      </div>

      <Board fen={fen} orientation={line.side === 'w' ? 'white' : 'black'} onMove={finished ? undefined : onMove} arrows={arrows} squareStyles={styles} />

      <div className="drill-status">
        <span>{finished ? 'Linie geschafft' : myTurn ? 'Du bist am Zug' : 'Gegner zieht …'}</span>
        <span className={mistakes ? 'bad' : 'good'}>{mistakes === 1 ? '1 Fehler' : `${mistakes} Fehler`}</span>
      </div>

      {feedback?.kind === 'wrong' && feedback.ply === ply && (
        <div className="explain wrong" role="alert">
          <div className="move">Richtig ist {toGerman(feedback.expected.san)}</div>
          <p>{feedback.expected.comment ?? 'Spiel den grünen Pfeil nach, um weiterzumachen.'}</p>
        </div>
      )}
      {feedback?.kind === 'info' && (
        <div className="explain">
          <div className={`move ${feedback.move.color === line.side ? 'mine' : ''}`}>{moveLabel(line, feedback.ply)}</div>
          <p>{feedback.move.comment}</p>
        </div>
      )}

      {finished && (
        <div className="done">
          <div className="done-title">{mistakes === 0 ? 'Fehlerfrei!' : mistakes === 1 ? 'Geschafft – 1 Fehler' : `Geschafft – ${mistakes} Fehler`}</div>
          {nextDays !== null && <p>Nächste Wiederholung: {nextDays <= 1 ? 'morgen' : `in ${nextDays} Tagen`}</p>}
          <div className="done-actions">{after(restart)}</div>
        </div>
      )}
    </div>
  )
}
