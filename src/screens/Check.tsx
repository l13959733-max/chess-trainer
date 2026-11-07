import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../components/KingArt'
import { go } from '../hooks/useHashRoute'
import { useAnalyzer } from '../hooks/useAnalyzer'
import type { Repertoire } from '../hooks/useRepertoire'
import { analyzeOnly, pause, recentRapid } from '../lib/analyzer'
import { bookReport, shapeReport, type BookReport, type Departure, type SideReport } from '../lib/check'
import { fetchRapidRating, findPlayer, getPlayer, myColor, setPlayer, type ChessComGame } from '../lib/chesscom'
import { getPuzzles, type Puzzle } from '../lib/db'
import { loadKing, saveKing } from '../lib/king'
import '../king.css'

const GAMES = 20

// The chess check, built like Lu's letters to his website clients: first calm, then "your chess
// today", then the road ahead, and a bonus at the end.
export function ChessCheck({ rep }: { rep: Repertoire }) {
  const [name, setName] = useState(() => getPlayer())
  const [player, setPlayerName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const found = await findPlayer(name)
      if (!found) {
        setError(`chess.com does not know “${name}”. Check the spelling of your username.`)
        return
      }
      setPlayer(found)
      setPlayerName(found)
    } catch {
      setError('chess.com cannot be reached right now. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (player) return <Report player={player} rep={rep} />
  return (
    <div className="screen king-screen">
      <Head title="Your chess check" />
      <div className="king-say-row">
        <Avatar who="hoppy" className="king-avatar" />
        <p className="king-say">Let's look at your real games. I read your last {GAMES} rapid games on chess.com and show you what costs you the most points – and how we fix it.</p>
      </div>
      <label className="check-label" htmlFor="check-name">Your chess.com username</label>
      <input id="check-name" className="room-input" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      {error && <p className="king-fb no" role="alert">{error}</p>}
      <button type="button" className="primary wide" disabled={busy || !name.trim()} onClick={start}>
        {busy ? 'Looking for you…' : 'Check my games'}
      </button>
      <p className="note">Only your public games are read, after they are finished. Nothing is posted anywhere.</p>
    </div>
  )
}

function Head({ title }: { title: string }) {
  return (
    <div className="screen-head">
      <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to the Training Camp">←</button>
      <div>
        <div className="eyebrow">Training Camp · chess check</div>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

function Report({ player, rep }: { player: string; rep: Repertoire }) {
  const analyzer = useAnalyzer()
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([recentRapid(player, GAMES), fetchRapidRating(player).catch(() => null)])
      .then(([g, r]) => {
        if (!alive) return
        setGames(g)
        setRating(r)
        if (g.length) analyzeOnly(g)
      })
      .catch(() => alive && setError('chess.com cannot be reached right now. Try again later.'))
    return () => {
      alive = false
      pause()
    }
  }, [player])

  // the mistakes of exactly these games, refreshed while the analysis runs
  const ids = useMemo(() => new Set(games?.map((g) => g.uuid) ?? []), [games])
  useEffect(() => {
    if (!ids.size) return
    getPuzzles().then((all) => setPuzzles(all.filter((p) => ids.has(p.gameUuid) && (p.player ?? 'l0o2') === player && p.source !== 'bot')))
  }, [ids, player, analyzer.analyzed])

  const book = useMemo<BookReport | null>(
    () => (games ? bookReport(games.map((g) => ({ pgn: g.pgn, color: myColor(g, player) })), rep.lines.filter((l) => l.source !== 'import')) : null),
    [games, player, rep.lines],
  )
  const ready = analyzer.status === 'done' && analyzer.player === player
  const shape = shapeReport(games?.length ?? 0, puzzles)

  // the starting value, saved once the analysis is complete
  useEffect(() => {
    if (!ready || !games?.length || loadKing().baseline) return
    saveKing({ ...loadKing(), baseline: { at: Date.now(), player, games: games.map((g) => g.uuid), rating, mistakes: shape.mistakes, threats: shape.threats } })
  }, [ready, games, player, rating, shape.mistakes, shape.threats])

  if (error) {
    return (
      <div className="screen king-screen">
        <Head title="Your chess check" />
        <p className="king-fb no" role="alert">{error}</p>
      </div>
    )
  }
  if (!games) {
    return (
      <div className="screen king-screen">
        <Head title="Your chess check" />
        <p className="note">Hoppy fetches your games from chess.com…</p>
      </div>
    )
  }
  if (!games.length) {
    return (
      <div className="screen king-screen">
        <Head title="Your chess check" />
        <p className="king-lesson">No rapid games found for {player}. Play a few rapid games on chess.com, then come back.</p>
      </div>
    )
  }

  const whiteStarts = situations(games, player)
  return (
    <div className="screen king-screen">
      <Head title={`${player}'s chess today`} />

      <div className="king-say-row">
        <Avatar who="hoppy" className="king-avatar" />
        <p className="king-say">
          Don't worry – this is normal. Around 800, about one move in four loses material (in 336 million chess.com moves). That is exactly what we train, and it is the fastest way up.
        </p>
      </div>

      <section className="check-section">
        <h3>Your chess today</h3>
        <div className="check-stats">
          <Stat value={rating ?? '–'} label="Rapid rating" />
          <Stat value={games.length} label="Games checked" />
          <Stat value={ready ? shape.mistakes.toFixed(1) : '…'} label="Big mistakes per game" />
          <Stat value={ready ? shape.threats.toFixed(1) : '…'} label="Threats not seen per game" />
        </div>
        {!ready && (
          <div className="check-progress">
            <span>Hoppy reads your games with the engine: {analyzer.analyzed} of {games.length}</span>
            <div className="king-hp"><span style={{ width: `${(100 * analyzer.analyzed) / games.length}%` }} /></div>
            <small>Takes a few minutes. Keep this screen open.</small>
          </div>
        )}
        {ready && shape.worst && (
          <div className="king-fb no">
            <b>Your most expensive habit: {shape.worst.title}</b>
            <p>{shape.worst.count} times in {games.length} games. The rule against it: {shape.worst.rule}</p>
          </div>
        )}
        {book && <BookLines book={book} />}
      </section>

      <section className="check-section">
        <h3>Your road</h3>
        <ol className="check-road">
          <li>
            <b>Kannauj – the guard.</b> Before every move: what is attacked, what is guarded? This saves the most points at your level.
          </li>
          {whiteStarts.map((x) => (
            <li key={x.moves}>
              <b>{x.station ? `${x.station} – ` : ''}{x.moves}</b> came up in {x.count} of your games.{x.station ? ' Your lines are waiting there.' : ' This station is coming soon.'}
            </li>
          ))}
        </ol>
      </section>

      <section className="check-section bonus">
        <h3>Bonus: your shadow</h3>
        <p>{ready ? `${puzzles.length} mistakes from these games are waiting for you as your own shadow. Beat them one by one – each one is a habit you leave behind.` : 'When Hoppy has read all games, your shadow is ready: your own mistakes as puzzles.'}</p>
        <button type="button" className="wide" disabled={!ready || !puzzles.length} onClick={() => go('puzzles')}>Face your shadow</button>
      </section>

      <button type="button" className="primary wide" onClick={() => go('')}>Start the journey</button>
      <p className="note">After every {GAMES} new rapid games you get a new report: then you see how much better you have become.</p>
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="check-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

function BookLines({ book }: { book: BookReport }) {
  const side = (s: SideReport, color: string) =>
    s.games ? (
      <div className="check-book" key={color}>
        <b>With {color} ({s.games} games)</b>
        <p>You leave your book after {Math.round(s.inBook)} moves on average.</p>
        {s.youLeftAt[0] && <p>Most often you leave it here: {departure(s.youLeftAt[0], 'you played')}</p>}
        {s.gaps[0] && <p>Your book does not cover yet: {s.gaps.map((g) => `${line(g)} (${g.count}×)`).join(', ')}</p>}
      </div>
    ) : null
  return (
    <>
      {side(book.w, 'White')}
      {side(book.b, 'Black')}
    </>
  )
}

function moveNo(d: Departure): string {
  const plies = d.moves ? d.moves.split(' ').filter((t) => !/^\d+\.$/.test(t)).length : 0
  return plies % 2 === 0 ? `${plies / 2 + 1}.` : `${Math.ceil(plies / 2)}…`
}

function departure(d: Departure, verb: string): string {
  return `${d.moves} – ${verb} ${moveNo(d)}${d.played}, your book plays ${d.book.map((b) => moveNo(d) + b).join(' or ')} (${d.count}×)`
}

// The moves with the new one at the end, written like a scoresheet: "1.e4 e5 2.Qh5"
function line(d: Departure): string {
  const no = moveNo(d)
  return `${d.moves ? d.moves + ' ' : ''}${no.endsWith('…') && d.moves ? '' : no}${d.played}`
}

// What came up most often with White, and which station teaches it
function situations(games: ChessComGame[], player: string) {
  const counts = new Map<string, number>()
  for (const g of games) {
    if (myColor(g, player) !== 'w') continue
    const m = g.pgn.match(/\n1\. ?(\S+) (?:\{[^}]*\} )?(?:1\.\.\. )?(\S+)/)
    if (!m) continue
    const k = `1.${m[1]} ${m[2]}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const STATION: Record<string, string> = { '1.e4 e5': 'Rome' }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([moves, count]) => ({ moves, count, station: STATION[moves] }))
}
