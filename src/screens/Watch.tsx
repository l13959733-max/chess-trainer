import { useEffect, useMemo, useRef, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import { buildBook } from '../lib/book'
import { deviceId, isOver, isPlayingNow, joinRoom, leaveRoom, liveStateOf, newRoomCode, normalizeCode, othersGames, shareGame, useBeat, useLive, withHelp, type LiveGame, type LiveState } from '../lib/live'
import type { Line } from '../lib/pgn'
import { bookLines, GameView } from './Play'
import { t } from '../lib/i18n'

function Head({ title }: { title: string }) {
  return (
    <div className="screen-head">
      <button type="button" className="back" onClick={() => go('')} aria-label={t('Back to overview')}>←</button>
      <div>
        <div className="eyebrow">{t('Watch')}</div>
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
      if (navigator.share) await navigator.share({ title: 'Hoppy', text: t('Watch my chess games on Hoppy:'), url: link })
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
      <div className="label">{t('Invite someone')}</div>
      <p className="note">{t('Everyone with this link can watch your games and play for you. Send it only to people you trust.')}</p>
      <button type="button" className="primary wide" onClick={send}>{copied ? t('Link copied ✓') : t('Send invite link')}</button>
      <p className="note small">{t('App on the iPhone home screen? Links open in Safari there, so paste this code in the app instead:')}</p>
      <code className="room-code">{code}</code>
    </section>
  )
}

function CodeEntry() {
  const [text, setText] = useState('')
  const code = normalizeCode(text)
  return (
    <section className="play-card">
      <div className="label">{t('I have a code')}</div>
      <input className="room-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-label={t('Invite code')} />
      <button type="button" className="wide" disabled={!code} onClick={() => { joinRoom(code!); go('watch') }}>{t('Connect')}</button>
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
        <Head title={t('This invite does not work')} />
        <CodeEntry />
      </div>
    )
  }
  return (
    <div className="screen">
      <Head title={t('You are invited')} />
      <div className="greet">
        <Mascot mood="happy" />
        {t("You and the person who invited you can watch each other's games, and each of you can take over and play on for the other.")}
      </div>
      {live.room && <p className="note">{t('This replaces the connection you have now.')}</p>}
      <section className="play-card">
        <button type="button" className="primary wide" onClick={() => { joinRoom(code); go('watch') }}>{t('Connect')}</button>
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
        <b>{now && <span className="live-dot" />} {state.driverName}{now ? t(' is playing') : t(' left a game')}</b><br />
        <small>{t('vs Hoppy-Bot')} {state.game.botRating} · {n === 1 ? t('1 move') : t('{n} moves', { n })}</small>
      </span>
      <span className="live-go">{now ? t('Watch') : t('Open')}</span>
    </button>
  )
}

function Lobby() {
  const live = useLive()
  if (!live.room) {
    return (
      <div className="screen">
        <Head title={t('Watch each other')} />
        <div className="greet">
          <Mascot mood="happy" />
          {t("Connect once, then you can watch each other's games live – and take over whenever you feel like it.")}
        </div>
        <section className="play-card">
          <div className="label">{t('Start')}</div>
          <button type="button" className="primary wide" onClick={() => joinRoom(newRoomCode())}>{t('Create an invite')}</button>
        </section>
        <CodeEntry />
      </div>
    )
  }
  const games = othersGames(live)
  return (
    <div className="screen">
      <Head title={t('Watch each other')} />
      <p className={`live-status ${live.connected ? 'on' : ''}`}><span className="live-dot" /> {live.connected ? t('Connected') : t('Connecting …')}</p>
      {games.length ? games.map((s) => <GameRow key={s.owner} state={s} />) : (
        <div className="greet">
          <Mascot mood="happy" />
          {t('Nobody is playing right now. A game appears here as soon as someone starts one against Hoppy-Bot.')}
        </div>
      )}
      <Invite code={live.room} />
      <section className="play-card">
        <button type="button" className="link-btn" onClick={leaveRoom}>{t('Disconnect this device')}</button>
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
        <Head title={t('Looking for the game …')} />
        <p className="note">{live.connected ? t('This game is not there (any more).') : t('Connecting …')}</p>
        <section className="play-card">
          <button type="button" className="wide" onClick={() => go('watch')}>{t('All games')}</button>
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
        <div className="live-bar mine"><span>{t('You are playing for')} <b>{state.ownerName}</b>{t(". Your moves don't count as theirs.")}</span></div>
      ) : (
        <div className="live-bar">
          <span>{here ? <><span className="live-dot" /> <b>{state.driverName}</b> {t('is playing')}</> : <><b>{state.driverName}</b> {t('left this game')}</>}</span>
          <button type="button" className="primary" onClick={takeOver}>{here ? t('Take over') : t('Play on')}</button>
        </div>
      )}
    />
  )
}

export function Watch({ id, arg, lines }: { id?: string; arg?: string; lines: Line[] }) {
  if (id === 'join') return <Join code={normalizeCode(decodeURIComponent(arg ?? ''))} />
  if (id) return <Table key={id} owner={id} lines={lines} />
  return <Lobby />
}
