import { Chess, type Square } from 'chess.js'
import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard, type Arrow } from 'react-chessboard'

interface Props {
  fen: string
  orientation: 'white' | 'black'
  // Returns true if the move was played.
  onMove?: (from: string, to: string) => boolean
  arrows?: Arrow[]
  squareStyles?: Record<string, CSSProperties>
  // King of Chess: painted pieces and a carved board instead of the plain one
  skin?: BoardSkin
}

export type BoardSkin = 'army' | 'palace'
const PIECES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']
const skinPieces = (skin: BoardSkin) =>
  Object.fromEntries(
    PIECES.map((p) => [
      p,
      // The piece stands on its square: base low in the square, a soft painted shadow on the ground
      () => (
        <span className="skin-piece">
          <span className="skin-shadow" />
          <img src={`${import.meta.env.BASE_URL}king/pieces/${skin}-${p}.png`} alt="" draggable={false} />
        </span>
      ),
    ]),
  )
const SKIN_PIECES = { army: skinPieces('army'), palace: skinPieces('palace') }

const SELECTED: CSSProperties = { backgroundColor: 'rgba(255, 214, 102, 0.6)' }
// The king in check glows red, so a check is never missed
const CHECK: CSSProperties = { background: 'radial-gradient(circle, rgba(255, 40, 40, 0.85) 0%, rgba(231, 0, 0, 0.5) 45%, transparent 75%)' }
const DOT: CSSProperties = { background: 'radial-gradient(circle, rgba(20,23,28,0.35) 22%, transparent 24%)', animation: 'dot-pop 0.16s ease-out' }
const RING: CSSProperties = { background: 'radial-gradient(circle, transparent 58%, rgba(20,23,28,0.35) 60%)', animation: 'dot-pop 0.16s ease-out' }

// Board with dragging AND tapping (tap a piece, then the target square) – often easier on a phone.
export function Board({ fen, orientation, onMove, arrows = [], squareStyles = {}, skin }: Props) {
  // A board always opens at the top of the screen, ready to play – also when it appears on the same page
  // (e.g. after "Start game"), where the browser would otherwise stay scrolled down at the button.
  // Braces matter: new Chrome returns a promise from scrollTo, and React would call it as a cleanup (white screen)
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])
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

  // On the painted board the last move glows like gold paint instead of a flat yellow square
  const styles: Record<string, CSSProperties> = skin
    ? Object.fromEntries(Object.entries(squareStyles).map(([q, st]) => [q, st === LAST_MOVE ? PAINT_LAST : st]))
    : { ...squareStyles }
  if (checkSquare) styles[checkSquare] = { ...styles[checkSquare], ...CHECK }
  if (sel) styles[sel] = { ...styles[sel], ...(skin ? PAINT_SELECTED : SELECTED) }
  for (const t of targets) styles[t.to] = { ...styles[t.to], ...(skin ? (t.capture ? PAINT_RING : PAINT_DOT) : t.capture ? RING : DOT) }

  return (
    <div className={`board-wrap ${skin ? `skin skin-${skin}` : ''}`} onAnimationEnd={(e) => e.currentTarget.classList.remove('shake')}>
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
        // King of Chess: the painted board lies under transparent squares
        lightSquareStyle: skin ? { backgroundColor: 'transparent' } : { backgroundColor: 'var(--board-light)' },
        darkSquareStyle: skin ? { backgroundColor: 'transparent' } : { backgroundColor: 'var(--board-dark)' },
        ...(skin && {
          pieces: SKIN_PIECES[skin],
          boardStyle: { backgroundImage: `url(${import.meta.env.BASE_URL}king/board-polo.jpg)`, backgroundSize: '100% 100%' },
          lightSquareNotationStyle: { color: 'var(--skin-dark-ink)' },
          darkSquareNotationStyle: { color: 'var(--skin-light-ink)' },
        }),
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

const PAINT_LAST: CSSProperties = { background: 'radial-gradient(circle at 50% 50%, rgba(255, 210, 110, .7), rgba(232, 176, 60, .42) 55%, rgba(232, 176, 60, .12) 80%, transparent)' }
const PAINT_SELECTED: CSSProperties = { background: 'radial-gradient(circle at 50% 50%, rgba(255, 226, 140, .85), rgba(240, 190, 70, .55) 60%, rgba(240, 190, 70, .2) 85%, transparent)' }
const PAINT_DOT: CSSProperties = { background: 'radial-gradient(circle, rgba(60, 35, 12, .5) 15%, rgba(60, 35, 12, .22) 21%, transparent 27%)', animation: 'dot-pop 0.16s ease-out' }
const PAINT_RING: CSSProperties = { background: 'radial-gradient(circle, transparent 54%, rgba(60, 35, 12, .38) 58%, rgba(60, 35, 12, .15) 66%, transparent 70%)', animation: 'dot-pop 0.16s ease-out' }
export const LAST_MOVE: CSSProperties = { backgroundColor: 'rgba(255, 214, 102, 0.45)' }
export const WRONG: CSSProperties = { backgroundColor: 'rgba(229, 72, 77, 0.75)' }
export const ARROW = { idea: 'rgba(143, 191, 106, 0.85)', next: 'rgba(110, 160, 230, 0.8)', correct: 'rgba(143, 191, 106, 0.95)' }
