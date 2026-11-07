import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../components/KingArt'
import { go } from '../hooks/useHashRoute'
import { useAnalyzer } from '../hooks/useAnalyzer'
import type { Repertoire } from '../hooks/useRepertoire'
import { analyzeOnly } from '../lib/analyzer'
import { buildBook, compare, shapeReport } from '../lib/check'
import { fetchRapidRating, getPlayer, myColor, type ChessComGame } from '../lib/chesscom'
import { getPuzzles, type Puzzle } from '../lib/db'
import { earn, loadKing, saveKing, stationById } from '../lib/king'
import { REAL_QUESTS, REPORT_EVERY, followAsWhite, rapidSince, romeDone, type RealQuest } from '../lib/portal'
import '../king.css'

// The portal to the real world: your chess.com games are the quests here
export function Portal({ rep }: { rep: Repertoire }) {
  const k = loadKing()
  const player = k.baseline?.player ?? getPlayer()
  const starts = Object.values(k.quests ?? {})
  const [opened] = useState(() => Date.now())
  const since = Math.min(k.baseline?.at ?? opened, ...starts)
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState(false)

  useEffect(() => {
    rapidSince(player, since)
      .then(setGames)
      .catch(() => setError('chess.com cannot be reached right now. Try again later.'))
  }, [player, since])

  const afterStart = useMemo(() => (games ?? []).filter((g) => k.baseline && g.end_time * 1000 > k.baseline.at).sort((a, b) => a.end_time - b.end_time), [games, k.baseline])
  const reports = k.reports ?? 0
  const block = afterStart.slice(reports * REPORT_EVERY, (reports + 1) * REPORT_EVERY)

  if (report && k.baseline && block.length === REPORT_EVERY) return <Report games={block} onDone={() => { saveKing({ ...loadKing(), reports: reports + 1 }); setReport(false) }} />

  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the world map">←</button>
        <div>
          <div className="eyebrow">Portal · chess.com</div>
          <h2>The real world</h2>
        </div>
      </div>
      <div className="king-say-row">
        <Avatar who="hoppy" className="king-avatar" />
        <p className="king-say">Here your chess counts for real. Play on chess.com and come back afterwards – I only read games that are finished. During a game you fight alone.</p>
      </div>

      {!k.baseline ? (
        <section className="check-section">
          <h3>First: your chess check</h3>
          <p>So that we can see how much better you get, I need your starting value from your last 20 rapid games.</p>
          <button type="button" className="primary wide" onClick={() => go('check')}>Check my chess</button>
        </section>
      ) : (
        <section className="check-section">
          <h3>Your next report</h3>
          {games ? (
            <>
              <p>
                {Math.min(block.length, REPORT_EVERY)} of {REPORT_EVERY} rapid games played since {reports ? 'your last report' : 'your chess check'}.
              </p>
              <div className="king-hp"><span style={{ width: `${(100 * Math.min(block.length, REPORT_EVERY)) / REPORT_EVERY}%` }} /></div>
              {block.length >= REPORT_EVERY ? (
                <button type="button" className="primary wide" onClick={() => setReport(true)}>Your report is ready</button>
              ) : (
                <p className="note">{block.length >= REPORT_EVERY / 2 ? 'Halfway there. ' : ''}The report counts games, not days – no games, no report.</p>
              )}
            </>
          ) : (
            <p className="note">{error ?? 'Hoppy looks for your new games…'}</p>
          )}
        </section>
      )}

      <section className="check-section">
        <h3>Quests in the real world</h3>
        {REAL_QUESTS.map((q) => (
          <QuestCard key={q.id} q={q} games={games} rep={rep} player={player} />
        ))}
      </section>

      <p className="note">Fair play: the app never shows anything during a running game on chess.com. It reads your games only after they are finished.</p>
    </div>
  )
}

function QuestCard({ q, games, rep, player }: { q: RealQuest; games: ChessComGame[] | null; rep: Repertoire; player: string }) {
  const k = loadKing()
  const start = k.quests?.[q.id]
  const station = stationById(q.after)
  const book = useMemo(() => buildBook(rep.lines.filter((l) => l.source !== 'import')), [rep.lines])
  const mine = (games ?? []).filter((g) => start && g.end_time * 1000 >= start).sort((a, b) => a.end_time - b.end_time)
  const done =
    q.id === 'guard' ? mine.length >= q.games : mine.some((g) => myColor(g, player) === 'w' && romeDone(followAsWhite(g, book)))
  // the reward is paid once; the card always shows what the quest was worth
  useEffect(() => {
    if (done) earn(`real/${q.id}`, q.chestnuts)
  }, [done, q])

  if (!start) {
    return (
      <div className="real-quest locked">
        <b>🔒 {q.title}</b>
        <p>Opens when you beat the boss in {station?.name}.</p>
      </div>
    )
  }
  return (
    <div className={`real-quest ${done ? 'complete' : ''}`}>
      <b>{done ? '✓ ' : ''}{q.title}</b>
      <p>{q.text}</p>
      {q.id === 'guard' && <p className="note">{Math.min(mine.length, q.games)} of {q.games} games played.</p>}
      {done && <div className="king-coins-won">+{q.chestnuts} 🌰</div>}
      {q.id === 'guard' && done && <GuardResult games={mine.slice(0, q.games)} />}
    </div>
  )
}

function useMistakes(games: ChessComGame[], run: boolean) {
  const analyzer = useAnalyzer()
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const player = loadKing().baseline?.player ?? getPlayer()
  const ids = useMemo(() => new Set(games.map((g) => g.uuid)), [games])
  useEffect(() => {
    if (run && games.length) analyzeOnly(games)
  }, [run, games])
  useEffect(() => {
    getPuzzles().then((all) => setPuzzles(all.filter((p) => ids.has(p.gameUuid) && (p.player ?? 'l0o2') === player && p.source !== 'bot')))
  }, [ids, player, analyzer.analyzed])
  const ready = analyzer.status === 'done' && run
  return { ready, puzzles, analyzer }
}

function GuardResult({ games }: { games: ChessComGame[] }) {
  const [run, setRun] = useState(false)
  const { ready, puzzles, analyzer } = useMistakes(games, run)
  const base = loadKing().baseline
  if (!run) return <button type="button" className="wide" onClick={() => setRun(true)}>See how the guard did</button>
  if (!ready) return <p className="note">Hoppy reads these games: {analyzer.analyzed} of {games.length}…</p>
  const s = shapeReport(games.length, puzzles)
  return (
    <p>
      Threats not seen per game: <b>{s.threats.toFixed(1)}</b>
      {base ? ` (at your chess check: ${base.threats.toFixed(1)})` : ''}. {base && s.threats < base.threats ? 'The guard is working!' : 'Keep asking before every move: what does my opponent attack?'}
    </p>
  )
}

// The report after 20 games: built like the chess check – calm, then the numbers, then the road
function Report({ games, onDone }: { games: ChessComGame[]; onDone: () => void }) {
  const { ready, puzzles, analyzer } = useMistakes(games, true)
  const [rating, setRating] = useState<number | null>(null)
  const base = loadKing().baseline!
  useEffect(() => {
    fetchRapidRating(base.player).then(setRating).catch(() => setRating(null))
  }, [base.player])
  const now = shapeReport(games.length, puzzles)
  const c = compare(base, now, rating)
  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('portal')} aria-label="Back to the portal">←</button>
        <div>
          <div className="eyebrow">Portal · your report</div>
          <h2>Then and now</h2>
        </div>
      </div>
      {!ready ? (
        <div className="check-progress check-section">
          <span>Hoppy reads your {games.length} new games: {analyzer.analyzed} of {games.length}</span>
          <div className="king-hp"><span style={{ width: `${(100 * analyzer.analyzed) / games.length}%` }} /></div>
          <small>Takes a few minutes. Keep this screen open.</small>
        </div>
      ) : (
        <>
          <section className="check-section">
            <h3>Your chess check vs. your last {games.length} games</h3>
            <div className="check-compare">
              <span></span><b>Then</b><b>Now</b>
              <span>Big mistakes per game</span><span>{c.mistakes.before.toFixed(1)}</span><b>{c.mistakes.now.toFixed(1)}</b>
              <span>Threats not seen per game</span><span>{c.threats.before.toFixed(1)}</span><b>{c.threats.now.toFixed(1)}</b>
              <span>Rapid rating</span><span>{c.rating.before ?? '–'}</span><b>{c.rating.now ?? '–'}</b>
            </div>
          </section>
          <div className={`king-fb ${c.better ? 'ok knack' : 'no'}`}>
            {c.better ? (
              <>
                <b>Better!</b>
                <p>You make fewer big mistakes than at the start: {c.mistakes.before.toFixed(1)} → {c.mistakes.now.toFixed(1)} per game.</p>
              </>
            ) : (
              <>
                <b>Not better yet</b>
                <p>That happens – progress comes in steps. {now.worst ? `Your most expensive habit now: ${now.worst.title}. ${now.worst.rule}` : 'Keep warming up before your games.'}</p>
              </>
            )}
          </div>
          <button type="button" className="primary wide" onClick={onDone}>On to the next 20 games</button>
        </>
      )}
    </div>
  )
}
