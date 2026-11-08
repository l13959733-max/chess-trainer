// Test page for BAUPLAN point 16 (#/accuracy): the same games, three numbers side by side,
// and every step behind them when you tap a game. Lu decides afterwards which number the app shows.
import { useRef, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { SAFE_CP } from '../lib/accuracy'
import { loadScores, scoreRecent, type ScoredGame } from '../lib/scores'

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x)}%`)
const pawns = (cp: number) => (cp >= 1000 ? 'mate' : cp <= -1000 ? '−mate' : (cp / 100).toFixed(1).replace('-', '−'))

export function Accuracy({ player }: { player: string }) {
  const [games, setGames] = useState<ScoredGame[]>(loadScores)
  const [depth, setDepth] = useState(14)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const stop = useRef(false)

  async function run(count: number) {
    stop.current = false
    setError(null)
    setBusy('Starting …')
    try {
      setGames(await scoreRecent(player, count, depth, setBusy, () => stop.current))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="screen accuracy">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('tent')} aria-label="Back">←</button>
        <div>
          <div className="eyebrow">Test · your finished rapid games</div>
          <h2>How well did I play?</h2>
        </div>
      </div>

      <p className="hint">
        Our own Stockfish in this browser rates every move. Three ways to turn that into one number:
      </p>
      <ul className="acc-legend">
        <li><b>Safe</b>: share of your moves that did not give away {SAFE_CP / 100} pawns or more.</li>
        <li><b>Lichess</b>: the public Lichess formula (winning chance before and after each move).</li>
        <li><b>chess.com</b>: their own number, only if you opened the game review there.</li>
      </ul>

      <div className="acc-controls">
        <label>
          Depth{' '}
          <select value={depth} onChange={(e) => setDepth(+e.target.value)} disabled={!!busy}>
            <option value={12}>12 (fast)</option>
            <option value={14}>14</option>
            <option value={18}>18 (slow, more exact)</option>
          </select>
        </label>
        {busy ? (
          <button type="button" onClick={() => (stop.current = true)}>Stop</button>
        ) : (
          <>
            <button type="button" className="primary" onClick={() => run(5)}>Score my last 5 games</button>
            <button type="button" onClick={() => run(20)}>Last 20</button>
          </>
        )}
      </div>
      {busy && <p className="hint">{busy}</p>}
      {error && <p className="hint error">{error}</p>}

      {games.length > 0 && (
        <table className="acc-table">
          <thead>
            <tr><th>Game</th><th>Safe</th><th>Lichess</th><th>chess.com</th></tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const key = `${g.uuid}/${g.depth}`
              return (
                <GameRows key={key} g={g} open={open === key} toggle={() => setOpen(open === key ? null : key)} />
              )
            })}
          </tbody>
        </table>
      )}
      {!games.length && !busy && <p className="hint">No games scored yet. Start with your last 5.</p>}
    </div>
  )
}

function GameRows({ g, open, toggle }: { g: ScoredGame; open: boolean; toggle: () => void }) {
  const date = new Date(g.endTime * 1000).toLocaleDateString('en-GB')
  return (
    <>
      <tr className="acc-game" onClick={toggle}>
        <td>
          <b>{g.opponent}</b> <span className="muted">{g.side === 'w' ? 'White' : 'Black'} · {g.result} · {date} · depth {g.depth}</span>
        </td>
        <td>{pct(g.safePct)}</td>
        <td>{pct(g.lichess)}</td>
        <td>{pct(g.chesscom)}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4}>
            <table className="acc-moves">
              <thead>
                <tr><th>Move</th><th>Before</th><th>After</th><th>Win% before → after</th><th>Lichess</th><th>Safe</th></tr>
              </thead>
              <tbody>
                {g.moves.map((m) => (
                  <tr key={m.ply} className={m.safe ? '' : 'unsafe'}>
                    <td>{Math.floor(m.ply / 2) + 1}{m.ply % 2 ? '…' : '.'} {m.san}</td>
                    <td>{pawns(m.cpBefore)}</td>
                    <td>{pawns(m.cpAfter)}</td>
                    <td>{Math.round(m.winBefore)} → {Math.round(m.winAfter)}</td>
                    <td>{Math.round(m.accuracy)}%</td>
                    <td>{m.safe ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              Plain average of the Lichess move numbers: {pct(g.meanAccuracy)}. Pawns are from your side.{' '}
              <a href={g.url} target="_blank" rel="noreferrer">Open on chess.com</a>
            </p>
          </td>
        </tr>
      )}
    </>
  )
}
