import { Chess, type Square } from 'chess.js'
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard, defaultPieces, type Arrow } from 'react-chessboard'
import { onGlow, type Glow } from '../lib/feedback'

interface Props {
  fen: string
  orientation: 'white' | 'black'
  // Returns true if the move was played.
  onMove?: (from: string, to: string) => boolean
  arrows?: Arrow[]
  squareStyles?: Record<string, CSSProperties>
  // King of Chess: in the Indian army the rook is an elephant (Haathi)
  elephants?: boolean
}

// The Haathi: a war elephant with a small tower, drawn like the other pieces (same line, same base as the rook)
function Elephant({ black }: { black?: boolean }) {
  const line = black ? '#ffffff' : '#000000'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
      <g style={{ fill: black ? '#000000' : '#ffffff', stroke: '#000000', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <path d="M 9,39 L 36,39 L 36,36 L 9,36 Z" style={{ strokeLinecap: 'butt' }} />
        <path d="M 12,36 L 12,32 L 33,32 L 33,36 Z" style={{ strokeLinecap: 'butt' }} />
        <path d="M 36,21.5 C 38.3,22.5 38.4,25.5 37.6,27.5" style={{ fill: 'none' }} />
        <path d="M 18,32 L 18,25.5 C 18,18.5 22,15.5 28,15.5 C 33.5,15.5 36,18.8 36,23 L 36,32 L 31.5,32 L 31.5,27.5 L 22.5,27.5 L 22.5,32 Z" />
        <path d="M 24.5,16.2 L 24.5,9.5 L 26.6,9.5 L 26.6,11 L 28.7,11 L 28.7,9.5 L 30.8,9.5 L 30.8,11 L 32.9,11 L 32.9,9.5 L 35,9.5 L 35,17.6 C 31.5,15.9 27.8,15.6 24.5,16.2 Z" />
        <path d="M 24.5,13 L 35,13" style={{ fill: 'none', stroke: line }} />
        <path d="M 22.5,15.8 C 18.5,12.6 12.4,13 11,18 C 10.3,20.8 10.9,24 10.4,27 C 10,29.4 8.6,30.8 9.4,32 L 12.6,32 C 12.9,29.3 13.4,27.2 14.6,25.3 C 16.8,26.1 19.8,25.4 21.5,22.6" />
        <path d="M 17.2,16.8 C 21.2,15.6 24.4,18.2 23.9,22 C 23.5,24.7 20.4,25.4 18.6,23.7 C 17.6,21.6 17.4,19 17.2,16.8 Z" style={{ stroke: line }} />
        <path d="M 14.3,22.6 C 14.4,25.4 12.9,27.6 10.8,28.3 C 12.1,26.6 12.7,24.9 12.7,22.9 Z" style={{ fill: '#ffffff' }} />
        <circle cx="14.2" cy="18.6" r="0.75" style={{ fill: line, stroke: line }} />
      </g>
    </svg>
  )
}
const ELEPHANT_PIECES = { ...defaultPieces, wR: () => <Elephant />, bR: () => <Elephant black /> }

const SELECTED: CSSProperties = { backgroundColor: 'rgba(255, 214, 102, 0.6)' }
// The king in check glows red, so a check is never missed
const CHECK: CSSProperties = { backgroundImage: 'radial-gradient(circle, rgba(255, 40, 40, 0.85) 0%, rgba(231, 0, 0, 0.5) 45%, transparent 75%)' }
// backgroundImage, not the background shorthand: it sits on top of the last-move colour instead of fighting it
const DOT: CSSProperties = { backgroundImage: 'radial-gradient(circle, rgba(20,23,28,0.35) 22%, transparent 24%)', animation: 'dot-pop 0.16s ease-out' }
const RING: CSSProperties = { backgroundImage: 'radial-gradient(circle, transparent 58%, rgba(20,23,28,0.35) 60%)', animation: 'dot-pop 0.16s ease-out' }
// The right move pulses green, careful play gold (keyframes in theme-kids.css). Only box-shadow, so it never
// fights the background of the last-move colour. Without motion: the colour simply stays for a moment.
const GLOW: Record<Glow, CSSProperties> = {
  good: { position: 'relative', zIndex: 2, animation: 'glow-good 0.85s ease-out 2' },
  gold: { position: 'relative', zIndex: 2, animation: 'glow-gold 0.8s ease-out 3' },
}
const GLOW_STILL: Record<Glow, CSSProperties> = {
  good: { boxShadow: 'inset 0 0 0 100px rgba(94, 224, 138, 0.45)' },
  gold: { boxShadow: 'inset 0 0 0 100px rgba(245, 197, 66, 0.55)' },
}
const GLOW_MS: Record<Glow, number> = { good: 1700, gold: 2400 }

// Board with dragging AND tapping (tap a piece, then the target square) – often easier on a phone.
export function Board({ fen, orientation, onMove, arrows = [], squareStyles = {}, elephants }: Props) {
  // A board always opens at the top of the screen, ready to play – also when it appears on the same page
  // (e.g. after "Start game"), where the browser would otherwise stay scrolled down at the button.
  // Braces matter: new Chrome returns a promise from scrollTo, and React would call it as a cleanup (white screen)
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const [selected, setSelected] = useState<{ square: string; fen: string } | null>(null)
  const sel = selected && selected.fen === fen ? selected.square : null

  const [glow, setGlow] = useState<{ square: string; kind: Glow } | null>(null)
  useEffect(() => {
    let t: number | undefined
    const off = onGlow((square, kind) => {
      setGlow({ square, kind })
      window.clearTimeout(t)
      t = window.setTimeout(() => setGlow(null), GLOW_MS[kind])
    })
    return () => {
      off()
      window.clearTimeout(t)
    }
  }, [])

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

  // Illegal moves never reach the screen: the piece simply goes back
  function tryMove(from: string, to: string): boolean {
    if (!onMove || from === to) return false
    if (!new Chess(fen).moves({ square: from as Square, verbose: true }).some((m) => m.to === to)) return false
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
  if (glow) {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    styles[glow.square] = { ...styles[glow.square], ...(still ? GLOW_STILL : GLOW)[glow.kind] }
  }

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
        // Lu, 12.11.: a real finger always wobbles a few pixels. With the default (1 px) every wobbly tap became
        // a tiny drag, so the tap was lost or the piece landed on the next square. Below 10 px it is a tap.
        dragActivationDistance: 10,
        ...(elephants && { pieces: ELEPHANT_PIECES }),
        onSquareClick,
        onPieceDrop: ({ sourceSquare, targetSquare }) => {
          // a drag that ends where it started is a tap: select the piece like a tap would
          if (targetSquare === sourceSquare) {
            const own = new Chess(fen).get(sourceSquare as Square)?.color === turn
            setSelected(own && sel !== sourceSquare ? { square: sourceSquare, fen } : null)
            return false
          }
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
