import { useEffect, useState } from 'react'
import { MoveReplay } from '../components/MoveReplay'
import { DuoBar } from '../components/DuoBar'
import { go } from '../hooks/useHashRoute'
import { recentRapid } from '../lib/analyzer'
import type { ChessComGame } from '../lib/chesscom'
import { estimateElo } from '../lib/gameElo'
import { loadReview, reviewGame, saveReview, type Moment, type Review } from '../lib/review'

// #/review – "Your last game" (Lu, 28.11.2026): pick one of your newest rapid games, Hoppy checks every move and says
// how strong the game was (estimate), what went wrong and why, the better move, and three tips.
const DEPTH = 14
const KIND: Record<Moment['kind'], { name: string; cls: string }> = { blunder: { name: 'Blunder', cls: 'bad' }, mistake: { name: 'Mistake', cls: 'mid' }, inaccuracy: { name: 'Inaccuracy', cls: 'soft' } }

export function GameReview({ player }: { player: string }) {
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [pick, setPick] = useState(0)
  const [done, setDone] = useState<Record<string, Review>>({}) // reviewed in this visit
  const [busy, setBusy] = useState<{ uuid: string; ply: number; plies: number } | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let gone = false
    recentRapid(player, 5)
      .then((g) => !gone && setGames(g))
      .catch(() => !gone && setFailed(true))
    return () => {
      gone = true
    }
  }, [player])

  const game = games?.[pick]
  // a game reviewed before is read from this phone, else Hoppy checks it now (state only changes from the engine's answers)
  const review = game ? done[game.uuid] ?? loadReview(game.uuid, DEPTH) : null
  const needs = !!game && !review
  useEffect(() => {
    if (!needs || !game) return
    let gone = false
    reviewGame(game, player, DEPTH, (ply, plies) => !gone && setBusy({ uuid: game.uuid, ply, plies }))
      .then((r) => {
        saveReview(r)
        if (!gone) setDone((d) => ({ ...d, [r.uuid]: r }))
      })
      .catch(() => {})
      .finally(() => !gone && setBusy(null))
    return () => {
      gone = true
    }
  }, [needs, game, player])
  const progress = busy && busy.uuid === game?.uuid ? busy : needs ? { ply: 0, plies: 1 } : null

  const est = review?.accuracy != null ? estimateElo(review.accuracy) : null

  return (
    <div className="pn pn-page">
      <div className="pn-screen">
        <header className="pn-head">
          <button type="button" className="pn-back" onClick={() => go('progress')} aria-label="Back to Progress">←</button>
          <h1>Your last game</h1>
        </header>
        <div className="pn-scroll">
          {!games && <p className="pv-note">{failed ? 'chess.com did not answer. Try again later.' : 'Loading your games from chess.com …'}</p>}
          {games && !games.length && <p className="pv-note">No finished rapid games on chess.com yet.</p>}
          {games && games.length > 1 && (
            <div className="rv-pick" role="group" aria-label="Pick a game">
              {games.map((g, i) => {
                const me = g.white.username.toLowerCase() === player.toLowerCase() ? g.white : g.black
                const opp = me === g.white ? g.black : g.white
                const r = me.result === 'win' ? 'w' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(me.result) ? 'd' : 'l'
                return (
                  <button key={g.uuid} type="button" aria-pressed={pick === i} className={r} onClick={() => { setPick(i); setOpen(null) }}>
                    <b>{r === 'w' ? 'Won' : r === 'd' ? 'Draw' : 'Lost'}</b>
                    <small>vs {opp.username}</small>
                  </button>
                )
              })}
            </div>
          )}

          {progress && (
            <div className="rv-busy">
              <b>Hoppy checks every move …</b>
              <i><em style={{ width: `${(100 * progress.ply) / Math.max(progress.plies, 1)}%` }} /></i>
              <small>Move {Math.ceil((progress.ply + 1) / 2)} of {Math.ceil(progress.plies / 2)} · stays saved on this phone</small>
            </div>
          )}

          {review && (
            <>
              <div className={`rv-head ${review.result}`}>
                <div>
                  <small>{review.side === 'w' ? '♔ White' : '♚ Black'} vs {review.opponent} ({review.oppRating})</small>
                  <b>{review.result === 'win' ? 'You won' : review.result === 'draw' ? 'Draw' : 'You lost'}</b>
                  <span>{new Date(review.endTime * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {review.how}</span>
                </div>
                <a href={review.url} target="_blank" rel="noopener">chess.com ›</a>
              </div>

              <div className="rv-elo">
                <div>
                  <small>This game played like</small>
                  <b>{est ? `≈ ${est.elo}` : '–'}</b>
                  <span>{est ? `range ${est.low}–${est.high} · your rating ${review.myRating}` : 'No estimate for this game'}</span>
                </div>
                <div className="rv-acc">
                  <span><b>{review.accuracy == null ? '–' : Math.round(review.accuracy)}%</b>you</span>
                  <span><b>{review.oppAccuracy == null ? '–' : Math.round(review.oppAccuracy)}%</b>{review.opponent}</span>
                  <small>accuracy</small>
                </div>
              </div>
              {est && <p className="rv-note">{est.note}</p>}

              <div className="rv-counts">
                {(['blunder', 'mistake', 'inaccuracy'] as const).map((k) => (
                  <span key={k} className={KIND[k].cls}><b>{review.counts[k]}</b>{KIND[k].name}{review.counts[k] === 1 ? '' : 's'}</span>
                ))}
              </div>

              {review.tips.length > 0 && (
                <div className="rv-tips">
                  <h3>Hoppy’s tips for this game</h3>
                  {review.tips.map((t) => (
                    <p key={t.title}><b>{t.title}{t.n > 1 ? ` · ${t.n}×` : ''}</b>{t.rule}</p>
                  ))}
                </div>
              )}

              <h2 className="rv-h">Key moments</h2>
              {!review.moments.length && <p className="pv-note">No real mistakes in this game – well played!</p>}
              {review.moments.map((m, i) => (
                <div key={m.ply} className={`rv-m ${KIND[m.kind].cls}`}>
                  <button type="button" className="rv-mh" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                    <span className="rv-tag">{KIND[m.kind].name}</span>
                    <b>{m.label}</b>
                    <small>{m.phase}</small>
                    <span aria-hidden="true">{open === i ? '▾' : '▸'}</span>
                  </button>
                  <div className="rv-why">
                    <p className="rv-q">Why it is not good</p>
                    {m.why.map((x) => <p key={x}>{x}</p>)}
                    {m.better && (
                      <>
                        <p className="rv-q">Better: <span className="rv-san">{m.better}</span></p>
                        {m.betterWhy.map((x) => <p key={x}>{x}</p>)}
                      </>
                    )}
                  </div>
                  {open === i && <MoveReplay sans={m.line} orientation={review.side === 'w' ? 'white' : 'black'} />}
                  {open !== i && <button type="button" className="rv-show" onClick={() => setOpen(i)}>Show on the board</button>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <DuoBar active="progress" />
    </div>
  )
}
