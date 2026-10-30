import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Board, LAST_MOVE } from '../components/Board'
import { Celebrate } from '../components/Celebrate'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Reward } from '../hooks/useProgress'
import { analyzeBotGame } from '../lib/analyzer'
import { bookMove, buildBook } from '../lib/book'
import { isMeasured, pickMove, updateRating, winChance } from '../lib/bot'
import { fetchRapidRating } from '../lib/chesscom'
import { getBotStats, putBotStats, type BotStats, type Puzzle } from '../lib/db'
import { allMoves } from '../lib/engine'
import { feedback } from '../lib/feedback'
import type { Line } from '../lib/pgn'
import { piecesInDanger } from '../lib/safety'

export type PlayMode = { kind: 'new' } | { kind: 'line'; line: Line } | { kind: 'puzzle'; puzzle: Puzzle }

interface Game {
  id: string
  title: string
  startFen: string
  moves: string[] // UCI
  me: 'w' | 'b'
  botRating: number
  rated: boolean // only full games without take-backs change the rating
  resigned?: boolean
}

const START = new Chess().fen()
const SAVE_KEY = 'chess-trainer-game'
const LEVELS = [200, 400, 600, 800, 1000, 1200, 1500, 2000]
const MIN_THINK = 650 // ms – an instant answer feels like a machine
const DANGER = { boxShadow: 'inset 0 0 0 4px rgba(239, 74, 90, 0.95)', backgroundColor: 'rgba(239, 74, 90, 0.25)' }

function loadSaved(): Game | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as Game) : null
  } catch {
    return null
  }
}

function save(game: Game | null) {
  try {
    if (game) localStorage.setItem(SAVE_KEY, JSON.stringify(game))
    else localStorage.removeItem(SAVE_KEY)
  } catch {
    // private mode: the game just isn't kept when the app closes
  }
}

function replay(game: Game) {
  const c = new Chess(game.startFen)
  for (const uci of game.moves) c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  return c
}

// Book from the repertoire, without trap lines and moves the lines call a mistake
function bookLines(lines: Line[]): Line[] {
  return lines
    .filter((l) => !/trap/i.test(l.title))
    .map((l) => {
      const bad = l.moves.findIndex((m) => m.color !== l.side && /mistake|greedy/i.test(m.comment ?? ''))
      return bad < 0 ? l : { ...l, moves: l.moves.slice(0, bad) }
    })
}

interface Props {
  mode: PlayMode
  lines: Line[]
  player: string
  onGame: (score: number) => Promise<Reward>
  onPuzzlesFound: () => void
}

export function Play({ mode, lines, player, onGame, onPuzzlesFound }: Props) {
  const [stats, setStats] = useState<BotStats | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [color, setColor] = useState<'w' | 'b' | 'random'>('w')
  const [level, setLevel] = useState<number | 'auto'>('auto')
  const [safety, setSafety] = useState(true)
  const [thinking, setThinking] = useState(false)
  const book = useMemo(() => buildBook(bookLines(lines)), [lines])
  // The bot's winning chance after its own last move – a sudden jump means the player blundered
  const lastBotWin = useRef<number | null>(null)

  // Rating: stored on this device per player; the first time it starts from the chess.com rapid rating
  useEffect(() => {
    let alive = true
    ;(async () => {
      let s = await getBotStats(player)
      if (!s) {
        const r = await fetchRapidRating(player).catch(() => null)
        s = { rating: Math.max(100, Math.min(2500, r ?? 600)), games: 0, wins: 0, draws: 0, losses: 0, history: [] }
        await putBotStats(player, s)
      }
      if (alive) setStats(s)
    })().catch(() => alive && setStats({ rating: 600, games: 0, wins: 0, draws: 0, losses: 0, history: [] }))
    return () => {
      alive = false
    }
  }, [player])

  // Lines and winning positions start right away; the opponent plays at your rating
  useEffect(() => {
    if (!stats || game || mode.kind === 'new') return
    const g: Game =
      mode.kind === 'line'
        ? { id: String(Date.now()), title: `Play on: ${mode.line.title}`, startFen: mode.line.moves[mode.line.moves.length - 1].fenAfter, moves: [], me: mode.line.side, botRating: stats.rating, rated: false }
        : { id: String(Date.now()), title: 'Win it again', startFen: mode.puzzle.fen, moves: [], me: mode.puzzle.myColor, botRating: stats.rating, rated: false }
    lastBotWin.current = null
    setGame(g)
    save(g)
  }, [stats, game, mode])

  function startNew() {
    if (!stats) return
    const me = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    const botRating = level === 'auto' ? stats.rating : level
    const g: Game = { id: String(Date.now()), title: 'Game vs Hoppy-Bot', startFen: START, moves: [], me, botRating, rated: true }
    lastBotWin.current = null
    setGame(g)
    save(g)
  }

  if (!stats) return <div className="screen"><p className="loading">Getting Hoppy-Bot ready …</p></div>

  if (!game) {
    const saved = loadSaved()
    return (
      <div className="screen">
        <div className="screen-head">
          <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
          <div>
            <div className="eyebrow">Play</div>
            <h2>Game vs Hoppy-Bot</h2>
          </div>
        </div>
        <div className="greet">
          <Mascot mood="happy" />
          Hoppy-Bot plays like a real person of the same rating – and it makes the same kind of mistakes. Can you catch them?
        </div>
        {saved && (
          <section className="play-card">
            <div className="label">Unfinished game</div>
            <p>{saved.title} · {saved.moves.length} moves played</p>
            <button type="button" className="primary wide" onClick={() => { lastBotWin.current = null; setGame(saved) }}>Continue</button>
          </section>
        )}
        <section className="play-card">
          <div className="label">Your Hoppy-Bot rating</div>
          <div className="bot-rating"><span className="big">{stats.rating}</span><span className="note">{stats.games} games · {stats.wins} won · {stats.draws} draws · {stats.losses} lost</span></div>
          <div className="label">You play</div>
          <div className="seg" role="group" aria-label="Color">
            {(['w', 'b', 'random'] as const).map((c) => (
              <button key={c} type="button" className={color === c ? 'on' : ''} onClick={() => setColor(c)}>{c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}</button>
            ))}
          </div>
          <div className="label">Strength</div>
          <div className="seg wrap" role="group" aria-label="Strength">
            <button type="button" className={level === 'auto' ? 'on' : ''} onClick={() => setLevel('auto')}>Like me ({stats.rating})</button>
            {LEVELS.map((l) => (
              <button key={l} type="button" className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l}</button>
            ))}
          </div>
          <p className="note small">
            {isMeasured(level === 'auto' ? stats.rating : level)
              ? 'This strength is measured: it copies how often real players of this rating find the best move, make mistakes and grab free pieces.'
              : 'Strengths from 300 to 799 are measured on real games. This one is an estimate.'}
          </p>
          <label className="toggle">
            <input type="checkbox" checked={safety} onChange={(e) => setSafety(e.target.checked)} />
            <span>Safety check: show my pieces in danger</span>
          </label>
          <button type="button" className="primary wide" onClick={startNew}>Start game</button>
        </section>
      </div>
    )
  }

  return (
    <GameView
      key={game.id}
      game={game}
      setGame={(g) => {
        setGame(g)
        save(g)
      }}
      book={book}
      thinking={thinking}
      setThinking={setThinking}
      lastBotWin={lastBotWin}
      safety={safety}
      setSafety={setSafety}
      stats={stats}
      onFinished={async (score) => {
        save(null)
        let next = stats
        if (game.rated) {
          const rating = updateRating(stats.rating, game.botRating, score, stats.games)
          next = {
            rating,
            games: stats.games + 1,
            wins: stats.wins + (score === 1 ? 1 : 0),
            draws: stats.draws + (score === 0.5 ? 1 : 0),
            losses: stats.losses + (score === 0 ? 1 : 0),
            history: [...stats.history, { t: Date.now(), r: rating }].slice(-200),
          }
          await putBotStats(player, next)
          setStats(next)
        }
        const reward = await onGame(score)
        return { before: stats.rating, after: next.rating, reward }
      }}
      onPuzzlesFound={onPuzzlesFound}
      onAgain={() => {
        setGame(null)
        if (mode.kind !== 'new') go('play')
      }}
    />
  )
}

interface GameViewProps {
  game: Game
  setGame: (g: Game) => void
  book: Map<string, string[]>
  thinking: boolean
  setThinking: (b: boolean) => void
  lastBotWin: React.MutableRefObject<number | null>
  safety: boolean
  setSafety: (b: boolean) => void
  stats: BotStats
  onFinished: (score: number) => Promise<{ before: number; after: number; reward: Reward }>
  onPuzzlesFound: () => void
  onAgain: () => void
}

function GameView({ game, setGame, book, thinking, setThinking, lastBotWin, safety, setSafety, onFinished, onPuzzlesFound, onAgain }: GameViewProps) {
  const chess = useMemo(() => replay(game), [game])
  const fen = chess.fen()
  const turn = chess.turn()
  const over = game.resigned || chess.isGameOver()
  const [result, setResult] = useState<{ before: number; after: number; reward: Reward } | null>(null)
  const [analysis, setAnalysis] = useState<{ done: number; total: number; found?: number } | null>(null)
  const finished = useRef(false)

  // Hoppy-Bot's move
  useEffect(() => {
    if (over || turn === game.me) return
    let cancelled = false
    setThinking(true)
    const t0 = Date.now()
    ;(async () => {
      let uci = game.moves.length < 30 ? bookMove(book, fen) : null
      if (uci) lastBotWin.current = null
      else {
        const cands = await allMoves(fen, game.botRating >= 1200 ? 10 : 8)
        if (!cands.length) return
        const top = Math.max(...cands.map((c) => winChance(c.score)))
        const gift = lastBotWin.current !== null && top - lastBotWin.current >= 30
        const pick = pickMove(cands, game.botRating, gift)
        uci = pick.uci
        lastBotWin.current = winChance(cands.find((c) => c.uci === uci)!.score)
      }
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_THINK - (Date.now() - t0))))
      if (cancelled) return
      const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      feedback.move(m.san, false)
      setGame({ ...game, moves: [...game.moves, uci] })
    })()
      .catch(() => {})
      .finally(() => !cancelled && setThinking(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, over])

  // Game over: rating, XP, then look for the player's mistakes (once)
  useEffect(() => {
    if (!over || finished.current) return
    finished.current = true
    const score = game.resigned ? 0 : chess.isCheckmate() ? (chess.turn() === game.me ? 0 : 1) : 0.5
    if (score === 1) feedback.success()
    onFinished(score).then(setResult)
    if (game.moves.length >= 2) {
      setAnalysis({ done: 0, total: game.moves.length + 1 })
      analyzeBotGame(game, (done, total) => setAnalysis({ done, total }))
        .then((p) => {
          setAnalysis({ done: 1, total: 1, found: p.filter((x) => x.myColor === game.me).length })
          if (p.length) onPuzzlesFound()
        })
        .catch(() => setAnalysis(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over])

  function onMove(from: string, to: string): boolean {
    if (over || turn !== game.me || thinking) return false
    let m
    try {
      m = new Chess(fen).move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    feedback.move(m.san)
    setGame({ ...game, moves: [...game.moves, m.from + m.to + (m.promotion ?? '')] })
    return true
  }

  function takeBack() {
    // Back to the player's last turn: remove the bot's answer and the player's move
    const moves = [...game.moves]
    const startTurn = new Chess(game.startFen).turn()
    do moves.pop()
    while (moves.length && (moves.length % 2 === 0 ? startTurn : startTurn === 'w' ? 'b' : 'w') !== game.me)
    lastBotWin.current = null
    setGame({ ...game, moves, rated: false })
  }

  const last = chess.history({ verbose: true }).at(-1)
  const styles: Record<string, React.CSSProperties> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}
  const danger = safety && !over && turn === game.me ? piecesInDanger(fen, game.me) : []
  for (const sq of danger) styles[sq] = { ...styles[sq], ...DANGER }

  const score = over ? (game.resigned ? 0 : chess.isCheckmate() ? (chess.turn() === game.me ? 0 : 1) : 0.5) : null
  const history = chess.history()
  const startNo = Number(game.startFen.split(' ')[5]) || 1
  const startBlack = game.startFen.split(' ')[1] === 'b'

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">vs Hoppy-Bot {game.botRating}{game.rated ? ' · rated' : ' · practice'}</div>
          <h2>{game.title}</h2>
        </div>
      </div>

      <Board fen={fen} orientation={game.me === 'w' ? 'white' : 'black'} onMove={!over && turn === game.me ? onMove : undefined} squareStyles={styles} />

      <div className="drill-status">
        <span>
          {over
            ? 'Game over'
            : turn === game.me
              ? chess.inCheck() ? 'Check! Protect your king' : 'Your move'
              : 'Hoppy-Bot is thinking …'}
        </span>
        {danger.length > 0 && <span className="bad">{danger.length === 1 ? '1 piece in danger' : `${danger.length} pieces in danger`}</span>}
      </div>

      {!over && (
        <div className="play-controls">
          <button type="button" onClick={takeBack} disabled={thinking || game.moves.length < 1 || turn !== game.me}>Take back</button>
          <button type="button" className={safety ? 'on' : ''} onClick={() => setSafety(!safety)}>🛡 Safety {safety ? 'on' : 'off'}</button>
          <button type="button" className="danger" onClick={() => setGame({ ...game, resigned: true })}>Resign</button>
        </div>
      )}

      {!over && danger.length > 0 && (
        <div className="explain wrong">
          <Mascot mood="oops" />
          <p>Careful! The red {danger.length === 1 ? 'piece can' : 'pieces can'} be taken for free – or by a cheaper piece. Move {danger.length === 1 ? 'it' : 'them'} to safety or protect {danger.length === 1 ? 'it' : 'them'}.</p>
        </div>
      )}

      {over && (
        <div className="done">
          <Mascot mood={score === 1 ? 'cheer' : score === 0.5 ? 'happy' : 'oops'} />
          <div className="done-title">{score === 1 ? 'You won!' : score === 0.5 ? 'Draw' : game.resigned ? 'You resigned' : 'Hoppy-Bot won'}</div>
          <p>
            {chess.isCheckmate() ? 'Checkmate.' : chess.isStalemate() ? 'Stalemate – the king has no move but is not in check.' : chess.isThreefoldRepetition() ? 'The same position three times.' : chess.isInsufficientMaterial() ? 'Not enough pieces left to checkmate.' : chess.isDraw() ? '50 moves without a capture or pawn move.' : ''}
          </p>
          {result && game.rated && (
            <p className="rating-change">
              Your Hoppy-Bot rating: {result.before} → <b>{result.after}</b> ({result.after >= result.before ? '+' : ''}{result.after - result.before})
            </p>
          )}
          {result && <Celebrate reward={result.reward} />}
          {analysis && (
            <p className="note">
              {analysis.found === undefined
                ? `Looking for your mistakes … ${Math.round((analysis.done / analysis.total) * 100)}%`
                : analysis.found
                  ? `${analysis.found} ${analysis.found === 1 ? 'mistake' : 'mistakes'} found – ${analysis.found === 1 ? 'it is' : 'they are'} now in your puzzles.`
                  : game.resigned ? 'No big mistakes found in this game.' : 'No big mistakes in this game. Well played!'}
            </p>
          )}
          <div className="done-actions">
            {analysis?.found ? (
              <button type="button" onClick={() => go('puzzles')}>Solve my mistakes</button>
            ) : (
              <button type="button" onClick={() => go('')}>Overview</button>
            )}
            <button type="button" className="primary" onClick={onAgain}>New game</button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <ol className="movelist" aria-label="Moves of the game">
          {history.map((san, i) => {
            const ply = i + (startBlack ? 1 : 0)
            const no = startNo + Math.floor(ply / 2)
            return (
              <li key={i}>
                <span className={`chip ${i === history.length - 1 ? 'current' : ''}`}>{ply % 2 === 0 ? `${no}. ` : i === 0 ? `${no}... ` : ''}{san}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
