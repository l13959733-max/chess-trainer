import { Chess } from 'chess.js'
import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import './App.css'

// Schritt 1: App-Gerüst. Das freie Brett zeigt, dass Brett + Regeln laufen.
// Startseiten-Kacheln werden in Schritt 2/3 mit echten Daten gefüllt.
function App() {
  const [game] = useState(() => new Chess())
  const [fen, setFen] = useState(game.fen())

  function onPieceDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false
    try {
      game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch {
      return false
    }
    setFen(game.fen())
    return true
  }

  function reset() {
    game.reset()
    setFen(game.fen())
  }

  const turn = game.turn() === 'w' ? 'Weiß' : 'Schwarz'
  const status = game.isCheckmate() ? `Matt – ${turn} hat verloren` : game.isDraw() ? 'Remis' : `${turn} am Zug`

  return (
    <main className="app">
      <header className="top">
        <h1>Chess Trainer</h1>
        <span className="user">l0o2</span>
      </header>

      <div className="board">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop,
            lightSquareStyle: { backgroundColor: 'var(--board-light)' },
            darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
          }}
        />
      </div>

      <div className="status">
        <span>{status}</span>
        <button type="button" onClick={reset}>Neu aufstellen</button>
      </div>

      <section className="tiles" aria-label="Heute">
        <div className="tile">
          <div className="label">Tagesziel</div>
          <div className="value">0 / 20</div>
          <div className="note">ab Schritt 3</div>
        </div>
        <div className="tile">
          <div className="label">Streak</div>
          <div className="value">0 Tage</div>
          <div className="note">ab Schritt 3</div>
        </div>
        <div className="tile">
          <div className="label">Fällige Linien</div>
          <div className="value">–</div>
          <div className="note">ab Schritt 2</div>
        </div>
        <div className="tile">
          <div className="label">Fällige Puzzles</div>
          <div className="value">–</div>
          <div className="note">ab Schritt 4</div>
        </div>
      </section>
    </main>
  )
}

export default App
