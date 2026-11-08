import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../components/KingArt'
import { go } from '../hooks/useHashRoute'
import { useAnalyzer } from '../hooks/useAnalyzer'
import { analyzeOnly } from '../lib/analyzer'
import { fetchArchives, fetchMonth, getPlayer, isTrainingGame, myColor, type ChessComGame } from '../lib/chesscom'
import { isClean } from '../lib/clean'
import { getGameRecords, getPuzzles, type GameRecord, type Puzzle } from '../lib/db'
import { loadKing, saveKing } from '../lib/king'
import { CATEGORY } from '../lib/weakness'
import '../king.css'

// Back from chess.com after the warm-up: "How did it go?" Only finished games exist in the
// chess.com archive, so the app can never see a game that is still running.
async function gamesSince(player: string, since: number): Promise<ChessComGame[]> {
  const out: ChessComGame[] = []
  const first = new Date(since)
  const firstMonth = first.getUTCFullYear() * 12 + first.getUTCMonth()
  for (const url of (await fetchArchives(player)).reverse()) {
    const [y, m] = url.split('/').slice(-2).map(Number)
    if (y * 12 + (m - 1) < firstMonth) break
    out.push(...(await fetchMonth(url)).filter((g) => isTrainingGame(g, player) && g.end_time * 1000 >= since))
  }
  return out.sort((a, b) => b.end_time - a.end_time).slice(0, 5)
}

function result(g: ChessComGame, player: string): string {
  const me = myColor(g, player) === 'w' ? g.white : g.black
  if (me.result === 'win') return 'won'
  if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(me.result)) return 'draw'
  return 'lost'
}

export function Afterwards() {
  const player = getPlayer()
  // since the warm-up; without one, the last 12 hours
  const [since] = useState(() => loadKing().warmupAt ?? Date.now() - 12 * 3600 * 1000)
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<GameRecord[]>([])
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const analyzer = useAnalyzer()

  useEffect(() => {
    gamesSince(player, since)
      .then((g) => {
        setGames(g)
        if (g.length) analyzeOnly(g)
      })
      .catch(() => setError('chess.com cannot be reached right now. Try again later.'))
  }, [player, since])

  const ids = useMemo(() => new Set((games ?? []).map((g) => g.uuid)), [games])
  useEffect(() => {
    getGameRecords(player).then(setRecords)
    getPuzzles().then((all) => setPuzzles(all.filter((p) => ids.has(p.gameUuid) && p.source !== 'bot')))
  }, [player, ids, analyzer.analyzed, analyzer.status])

  const read = (games ?? []).filter((g) => isClean(records, g.uuid) !== null)
  const ready = !!games?.length && read.length === games.length
  // the moments where checking the opponent's threat would have saved the game
  const watch = puzzles.filter((p) => p.refutation && p.category && CATEGORY[p.category].family === 'opponent')
  const done = () => saveKing({ ...loadKing(), warmupAt: undefined })

  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the world map">←</button>
        <div>
          <div className="eyebrow">Back from chess.com</div>
          <h2>How did it go?</h2>
        </div>
      </div>
      <div className="king-say-row">
        <Avatar who="hoppy" className="king-avatar" />
        <p className="king-say">
          {error ??
            (!games
              ? 'Hoppy looks for your finished games…'
              : !games.length
                ? 'No finished rapid or daily game since your warm-up yet. I only read games that are over – play, then come back.'
                : ready
                  ? watch.length
                    ? 'Here is where the watch would have helped. Can you find what your opponent threatened?'
                    : 'No threat slipped through. That is exactly the habit we train.'
                  : `Hoppy reads your game${games.length > 1 ? 's' : ''}: ${Math.min(read.length, games.length)} of ${games.length}… (takes a minute)`)}
        </p>
      </div>

      {!!games?.length && (
        <section className="check-section after-games">
          {games.map((g) => {
            const clean = isClean(records, g.uuid)
            const opp = myColor(g, player) === 'w' ? g.black : g.white
            const mine = puzzles.filter((p) => p.gameUuid === g.uuid).length
            return (
              <div key={g.uuid} className={`after-game ${clean ? 'clean' : ''}`}>
                <b>{clean ? '✦ ' : ''}vs {opp.username}</b>
                <span>{result(g, player)}</span>
                <small>{clean === null ? 'reading…' : clean ? 'clean – no big mistake' : `${mine} big ${mine === 1 ? 'mistake' : 'mistakes'}`}</small>
              </div>
            )
          })}
          {ready && read.some((g) => isClean(records, g.uuid)) && <p className="note">Every clean game makes the world map a little brighter.</p>}
        </section>
      )}

      <div className="done-actions">
        {ready && watch.length > 0 ? (
          <button type="button" className="primary wide" onClick={() => { done(); go('threats/games/' + [...new Set(watch.map((p) => p.gameUuid))].join(',')) }}>
            Where would the watch have helped? ({watch.length})
          </button>
        ) : (
          <a className="button primary" href="https://www.chess.com/play/online" target="_blank" rel="noopener">Play on chess.com</a>
        )}
        <button type="button" onClick={() => { done(); go('') }}>World map</button>
      </div>
      <p className="note">Fair play: the app never shows anything during a running game. It reads your games only after they are finished.</p>
    </div>
  )
}
