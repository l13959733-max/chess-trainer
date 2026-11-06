import { useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE, WRONG } from '../components/Board'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import { buildBook } from '../lib/book'
import { deviceId, isOver, isPlayingNow, joinRoom, leaveRoom, liveStateOf, newRoomCode, normalizeCode, othersDrills, othersGames, shareGame, useBeat, useLive, withHelp, type LiveDrill, type LiveGame, type LiveState } from '../lib/live'
import type { Line } from '../lib/pgn'
import { bookLines, GameView } from './Play'

function Head({ title }: { title: string }) {
  return (
    <div className="screen-head">
      <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
      <div>
        <div className="eyebrow">Watch</div>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

function Invite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}${window.location.pathname}#/watch/join/${code}`
  async function send() {
    try {
      if (navigator.share) await navigator.share({ title: 'Hoppy', text: 'Watch my chess games on Hoppy:', url: link })
      else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
      }
    } catch {
      // the share sheet was closed
    }
  }
  return (
    <section className="play-card">
      <div className="label">Invite someone</div>
      <p className="note">Everyone with this link can watch your games and play for you. Send it only to people you trust.</p>
      <button type="button" className="primary wide" onClick={send}>{copied ? 'Link copied ✓' : 'Send invite link'}</button>
      <p className="note small">App on the iPhone home screen? Links open in Safari there, so paste this code in the app instead:</p>
      <code className="room-code">{code}</code>
    </section>
  )
}

function CodeEntry() {
  const [text, setText] = useState('')
  const code = normalizeCode(text)
  return (
    <section className="play-card">
      <div className="label">I have a code</div>
      <input className="room-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-label="Invite code" />
      <button type="button" className="wide" disabled={!code} onClick={() => { joinRoom(code!); go('watch') }}>Connect</button>
    </section>
  )
}

// Opened from an invite link: connecting needs a yes
function Join({ code }: { code: string | null }) {
  const live = useLive()
  const already = !!code && live.room === code
  useEffect(() => {
    if (already) go('watch')
  }, [already])
  if (already) return null
  if (!code) {
    return (
      <div className="screen">
        <Head title="This invite does not work" />
        <CodeEntry />
      </div>
    )
  }
  return (
    <div className="screen">
      <Head title="You are invited" />
      <div className="greet">
        <Mascot mood="happy" />
        You and the person who invited you can watch each other's games, and each of you can take over and play on for the other.
      </div>
      {live.room && <p className="note">This replaces the connection you have now.</p>}
      <section className="play-card">
        <button type="button" className="primary wide" onClick={() => { joinRoom(code); go('watch') }}>Connect</button>
      </section>
    </div>
  )
}

export function GameRow({ state }: { state: LiveState }) {
  const now = isPlayingNow(state)
  const n = state.game.moves.length
  return (
    <button type="button" className={`live-row ${now ? 'now' : ''}`} onClick={() => go('watch/' + state.owner)}>
      <span>
        <b>{now && <span className="live-dot" />} {state.driverName}{now ? ' is playing' : ' left a game'}</b><br />
        <small>vs Hoppy-Bot {state.game.botRating} · {n} {n === 1 ? 'move' : 'moves'}</small>
      </span>
      <span className="live-go">{now ? 'Watch' : 'Open'}</span>
    </button>
  )
}

export function DrillRow({ drill }: { drill: LiveDrill }) {
  return (
    <button type="button" className="live-row now" onClick={() => go('watch/drill/' + drill.owner)}>
      <span>
        <b><span className="live-dot" /> {drill.ownerName} is practising</b><br />
        <small>{drill.title} · {drill.done ? 'line complete' : `move ${drill.ply} of ${drill.total}`} · {drill.mistakes === 1 ? '1 mistake' : `${drill.mistakes} mistakes`}</small>
      </span>
      <span className="live-go">Watch</span>
    </button>
  )
}

// Watching someone practise an opening line: just the board, nothing to touch
function DrillTable({ owner }: { owner: string }) {
  const live = useLive()
  const drill = othersDrills(live).find((d) => d.owner === owner)
  if (!drill) {
    return (
      <div className="screen">
        <Head title="Not practising right now" />
        <p className="note">{live.connected ? 'This line is over or was left.' : 'Connecting …'}</p>
        <section className="play-card">
          <button type="button" className="wide" onClick={() => go('watch')}>All games</button>
        </section>
      </div>
    )
  }
  const styles: Record<string, React.CSSProperties> = drill.last ? { [drill.last.from]: LAST_MOVE, [drill.last.to]: LAST_MOVE } : {}
  const arrows: Arrow[] = []
  if (drill.wrong) {
    styles[drill.wrong.tried.from] = WRONG
    styles[drill.wrong.tried.to] = WRONG
    arrows.push({ startSquare: drill.wrong.from, endSquare: drill.wrong.to, color: ARROW.correct })
  }
  const mine = drill.ply < drill.total && (drill.fen.split(' ')[1] === drill.side)
  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('watch')} aria-label="Back to all games">←</button>
        <div>
          <div className="eyebrow">{drill.ownerName} is practising · {drill.side === 'w' ? 'White' : 'Black'}</div>
          <h2>{drill.title}</h2>
        </div>
      </div>
      <Board fen={drill.fen} orientation={drill.side === 'w' ? 'white' : 'black'} arrows={arrows} squareStyles={styles} />
      <div className="drill-status">
        <span>{drill.done ? 'Line complete' : mine ? `${drill.ownerName}'s move` : 'Opponent is moving …'}</span>
        <span className={drill.mistakes ? 'bad' : 'good'}>{drill.mistakes === 1 ? '1 mistake' : `${drill.mistakes} mistakes`}</span>
      </div>
      {drill.wrong && (
        <div className="explain wrong" role="alert">
          <Mascot mood="oops" />
          <div className="move">Not that one – the right move is {drill.wrong.san}</div>
          {drill.wrong.comment && <p>{drill.wrong.comment}</p>}
        </div>
      )}
      {drill.note && !drill.wrong && (
        <div className="explain">
          <Mascot mood="happy" />
          <div className="move">{drill.note.label}</div>
          <p>{drill.note.comment}</p>
        </div>
      )}
      {drill.done && (
        <div className="done">
          <Mascot mood="cheer" />
          <div className="done-title">{drill.mistakes === 0 ? `${drill.ownerName} played it perfectly!` : `${drill.ownerName} finished the line`}</div>
        </div>
      )}
    </div>
  )
}

function Lobby() {
  const live = useLive()
  if (!live.room) {
    return (
      <div className="screen">
        <Head title="Watch each other" />
        <div className="greet">
          <Mascot mood="happy" />
          Connect once, then you can watch each other's games live – and take over whenever you feel like it.
        </div>
        <section className="play-card">
          <div className="label">Start</div>
          <button type="button" className="primary wide" onClick={() => joinRoom(newRoomCode())}>Create an invite</button>
        </section>
        <CodeEntry />
      </div>
    )
  }
  const games = othersGames(live)
  const drills = othersDrills(live)
  return (
    <div className="screen">
      <Head title="Watch each other" />
      <p className={`live-status ${live.connected ? 'on' : ''}`}><span className="live-dot" /> {live.connected ? 'Connected' : 'Connecting …'}</p>
      {drills.map((d) => <DrillRow key={'d' + d.owner} drill={d} />)}
      {games.map((s) => <GameRow key={s.owner} state={s} />)}
      {!games.length && !drills.length && (
        <div className="greet">
          <Mascot mood="happy" />
          Nobody is playing right now. It appears here as soon as someone plays against Hoppy-Bot or practises an opening.
        </div>
      )}
      <Invite code={live.room} />
      <section className="play-card">
        <button type="button" className="link-btn" onClick={leaveRoom}>Disconnect this device</button>
      </section>
    </div>
  )
}

function Table({ owner, lines }: { owner: string; lines: Line[] }) {
  const live = useLive()
  const state = live.states.find((s) => s.owner === owner) ?? null
  const book = useMemo(() => buildBook(bookLines(lines)), [lines])
  const [thinking, setThinking] = useState(false)
  const [safety, setSafety] = useState(true)
  const lastBotWin = useRef<number | null>(null)
  const driving = state?.driver === deviceId()
  const over = state ? isOver(state.game) : false
  useBeat(owner, driving && !over)

  if (!state) {
    return (
      <div className="screen">
        <Head title="Looking for the game …" />
        <p className="note">{live.connected ? 'This game is not there (any more).' : 'Connecting …'}</p>
        <section className="play-card">
          <button type="button" className="wide" onClick={() => go('watch')}>All games</button>
        </section>
      </div>
    )
  }

  // Taking over needs nothing from the other device: the whole game is in the message
  const takeOver = () => {
    lastBotWin.current = null
    shareGame(owner, { ...state.game, rated: false })
  }
  const setGame = (g: LiveGame) => shareGame(owner, withHelp(liveStateOf(owner)?.game ?? state.game, g))
  const here = isPlayingNow(state)

  return (
    <GameView
      key={state.game.id}
      game={state.game}
      setGame={setGame}
      book={book}
      thinking={thinking}
      setThinking={setThinking}
      lastBotWin={lastBotWin}
      safety={safety}
      setSafety={setSafety}
      driving={driving}
      forName={state.ownerName}
      driverName={here ? state.driverName : undefined}
      onPuzzlesFound={() => {}}
      onAgain={() => go('play')}
      control={over ? null : driving ? (
        <div className="live-bar mine"><span>You are playing for <b>{state.ownerName}</b>. Your moves don't count as theirs.</span></div>
      ) : (
        <div className="live-bar">
          <span>{here ? <><span className="live-dot" /> <b>{state.driverName}</b> is playing</> : <><b>{state.driverName}</b> left this game</>}</span>
          <button type="button" className="primary" onClick={takeOver}>{here ? 'Take over' : 'Play on'}</button>
        </div>
      )}
    />
  )
}

export function Watch({ id, arg, lines }: { id?: string; arg?: string; lines: Line[] }) {
  if (id === 'join') return <Join code={normalizeCode(decodeURIComponent(arg ?? ''))} />
  if (id === 'drill' && arg) return <DrillTable key={arg} owner={arg} />
  if (id) return <Table key={id} owner={id} lines={lines} />
  return <Lobby />
}
