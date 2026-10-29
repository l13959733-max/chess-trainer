import { useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE } from '../components/Board'
import { go } from '../hooks/useHashRoute'
import { toGerman, type Line, type LineArrow } from '../lib/pgn'

const CAL: Record<LineArrow['color'], string> = {
  G: ARROW.idea,
  R: 'rgba(229, 72, 77, 0.85)',
  Y: 'rgba(255, 214, 102, 0.9)',
  B: ARROW.next,
}

export function moveLabel(line: Line, i: number) {
  const m = line.moves[i]
  const no = Math.floor(i / 2) + 1
  return `${no}.${m.color === 'b' ? '..' : ''} ${toGerman(m.san)}`
}

// Lernen-Modus: Linie Zug für Zug durchgehen, Erklärung zu jedem Zug.
export function Learn({ line }: { line: Line }) {
  const [ply, setPly] = useState(0)
  const last = ply > 0 ? line.moves[ply - 1] : null
  const next = line.moves[ply]
  const fen = last ? last.fenAfter : line.moves[0].fenBefore

  const arrows: Arrow[] = (last?.arrows ?? []).map((a) => ({ startSquare: a.from, endSquare: a.to, color: CAL[a.color] }))
  if (next) arrows.push({ startSquare: next.from, endSquare: next.to, color: ARROW.next })

  const styles = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Zurück zur Übersicht">←</button>
        <div>
          <div className="eyebrow">Lernen · {line.side === 'w' ? 'Weiß' : 'Schwarz'}</div>
          <h2>{line.title}</h2>
        </div>
      </div>

      <Board fen={fen} orientation={line.side === 'w' ? 'white' : 'black'} arrows={arrows} squareStyles={styles} />

      <div className="explain">
        {last ? (
          <>
            <div className={`move ${last.color === line.side ? 'mine' : ''}`}>{moveLabel(line, ply - 1)}</div>
            <p>{last.comment ?? (last.color === line.side ? 'Dein Zug in dieser Linie.' : 'Zug des Gegners.')}</p>
          </>
        ) : (
          <p>Startstellung. Der blaue Pfeil zeigt immer den nächsten Zug. Tippe auf „Weiter".</p>
        )}
      </div>

      <div className="controls">
        <button type="button" onClick={() => setPly(0)} disabled={ply === 0} aria-label="Zum Anfang">⏮</button>
        <button type="button" onClick={() => setPly(ply - 1)} disabled={ply === 0}>Zurück</button>
        <button type="button" className="primary" onClick={() => setPly(ply + 1)} disabled={!next}>Weiter</button>
      </div>

      <ol className="movelist" aria-label="Züge der Linie">
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

      {!next && (
        <button type="button" className="primary wide" onClick={() => go('drill/' + line.id)}>
          Jetzt selbst spielen (Drill)
        </button>
      )}
    </div>
  )
}
