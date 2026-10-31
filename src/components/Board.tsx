import { Chess, type Square } from 'chess.js'
import { useMemo, useState, type CSSProperties } from 'react'
import { Chessboard, type Arrow } from 'react-chessboard'
import { feedback } from '../lib/feedback'

interface Props {
  fen: string
  orientation: 'white' | 'black'
  // Returns true if the move was played.
  onMove?: (from: string, to: string) => boolean
  arrows?: Arrow[]
  squareStyles?: Record<string, CSSProperties>
}

const SELECTED: CSSProperties = { backgroundColor: 'rgba(255, 214, 102, 0.6)' }
// The king in check glows red, so a check is never missed
const CHECK: CSSProperties = { background: 'radial-gradient(circle, rgba(255, 40, 40, 0.85) 0%, rgba(231, 0, 0, 0.5) 45%, transparent 75%)' }
const DOT: CSSProperties = { background: 'radial-gradient(circle, rgba(20,23,28,0.35) 22%, transparent 24%)', animation: 'dot-pop 0.16s ease-out' }
const RING: CSSProperties = { background: 'radial-gradient(circle, transparent 58%, rgba(20,23,28,0.35) 60%)', animation: 'dot-pop 0.16s ease-out' }

// Board with dragging AND tapping (tap a piece, then the target square) – often easier on a phone.
export function Board({ fen, orientation, onMove, arrows = [], squareStyles = {} }: Props) {
  const [selected, setSelected] = useState<{ square: string; fen: string } | null>(null)
  const sel = selected && selected.fen === fen ? selected.square : null

  const targets = useMemo(() => {
    if (!sel) return []
    try {
      return new Chess(fen).moves({ square: sel as Square, verbose: true }).map((m) => ({ to: m.to, capture: !!m.captured }))
    } catch {
      return []
    }
  }, [fen, sel])

  const turn = fen.split(' ')[1]

  const checkSquare = useMemo(() => {
    try {
      const c = new Chess(fen)
      if (!c.inCheck()) return null
      return c.findPiece({ type: 'k', color: c.turn() })[0] ?? null
    } catch {
      return null
    }
  }, [fen])

  // Illegal moves never reach the screen: the piece goes back with a soft bump
  function tryMove(from: string, to: string): boolean {
    if (!onMove || from === to) return false
    if (!new Chess(fen).moves({ square: from as Square, verbose: true }).some((m) => m.to === to)) {
      feedback.illegal()
      return false
    }
    return onMove(from, to)
  }

  function onSquareClick({ piece, square }: { piece: { pieceType: string } | null; square: string }) {
    if (!onMove) return
    const own = piece && piece.pieceType[0] === turn
    if (sel && sel !== square && !own) {
      tryMove(sel, square)
      setSelected(null)
      return
    }
    setSelected(own && sel !== square ? { square, fen } : null)
  }

  const styles: Record<string, CSSProperties> = { ...squareStyles }
  if (checkSquare) styles[checkSquare] = { ...styles[checkSquare], ...CHECK }
  if (sel) styles[sel] = { ...styles[sel], ...SELECTED }
  for (const t of targets) styles[t.to] = { ...styles[t.to], ...(t.capture ? RING : DOT) }

  return (
    <div className="board-wrap" onAnimationEnd={(e) => e.currentTarget.classList.remove('shake')}>
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        arrows,
        squareStyles: styles,
        allowDragging: !!onMove,
        allowDrawingArrows: false,
        onSquareClick,
        onPieceDrop: ({ sourceSquare, targetSquare }) => {
          setSelected(null)
          return !!(targetSquare && tryMove(sourceSquare, targetSquare))
        },
        lightSquareStyle: { backgroundColor: 'var(--board-light)' },
        darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
        // Feel: pieces glide, lift up while dragged, and the square under the finger gets a white frame
        animationDurationInMs: 190,
        draggingPieceStyle: { transform: 'scale(1.22)', filter: 'drop-shadow(0 10px 8px rgba(40, 30, 60, 0.35))' },
        draggingPieceGhostStyle: { opacity: 0.22 },
        dropSquareStyle: { boxShadow: 'inset 0 0 0 4px rgba(255, 255, 255, 0.85)' },
      }}
    />
    </div>
  )
}

export const LAST_MOVE: CSSProperties = { backgroundColor: 'rgba(255, 214, 102, 0.45)' }
export const WRONG: CSSProperties = { backgroundColor: 'rgba(229, 72, 77, 0.75)' }
export const ARROW = { idea: 'rgba(143, 191, 106, 0.85)', next: 'rgba(110, 160, 230, 0.8)', correct: 'rgba(143, 191, 106, 0.95)' }
