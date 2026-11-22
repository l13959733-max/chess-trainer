import { Chess } from 'chess.js'
import { useMemo, useState } from 'react'
import { LAST_MOVE } from './Board'
import { KBoard } from '../screens/King'

// Step through the moves of a task again (Lu, 22.11.2026: "zurück und vorwärts Taste unten, damit man den Zug noch
// mal visuell wiederholen kann"). Starts at the end – the position after your right move.
export function MoveReplay({ sans, orientation }: { sans: string[]; orientation: 'white' | 'black' }) {
  const steps = useMemo(() => {
    const c = new Chess()
    const out: { fen: string; from?: string; to?: string; label?: string }[] = [{ fen: c.fen() }]
    for (const s of sans) {
      const no = c.moveNumber()
      const w = c.turn() === 'w'
      let m
      try {
        m = c.move(s)
      } catch {
        break
      }
      out.push({ fen: c.fen(), from: m.from, to: m.to, label: w ? `${no}.${m.san}` : `${no}...${m.san}` })
    }
    return out
  }, [sans])
  const [k, setK] = useState(steps.length - 1)
  const at = steps[Math.min(k, steps.length - 1)]
  const last = steps.length - 1
  return (
    <div className="mr">
      <KBoard fen={at.fen} orientation={orientation} squareStyles={at.from && at.to ? { [at.from]: LAST_MOVE, [at.to]: LAST_MOVE } : {}} />
      <div className="mr-bar">
        <button type="button" onClick={() => setK(0)} disabled={k === 0} aria-label="To the start">⏮</button>
        <button type="button" onClick={() => setK(Math.max(0, k - 1))} disabled={k === 0} aria-label="One move back">◀</button>
        <span className="mr-at" aria-live="polite">{at.label ?? 'Start'}<small>{k}/{last}</small></span>
        <button type="button" onClick={() => setK(Math.min(last, k + 1))} disabled={k === last} aria-label="One move forward">▶</button>
        <button type="button" onClick={() => setK(last)} disabled={k === last} aria-label="To the end">⏭</button>
      </div>
    </div>
  )
}
