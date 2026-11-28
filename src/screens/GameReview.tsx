import { useEffect, useState } from 'react'
import { MoveReplay } from '../components/MoveReplay'
import { DuoBar } from '../components/DuoBar'
import { go } from '../hooks/useHashRoute'
import { recentRapid } from '../lib/analyzer'
import type { ChessComGame } from '../lib/chesscom'
import { LEVEL_SOURCE, levelOf } from '../lib/gameLevel'
import { loadReview, momentPuzzles, reviewGame, saveReview, type Moment, type Review } from '../lib/review'
import { putPuzzle, type Puzzle } from '../lib/db'

// #/review – "Your last game" (Lu, 28.11.2026): pick one of your newest rapid games, Hoppy checks every move and says
// how strong the game was (estimate), what went wrong and why, the better move, and three tips.
const DEPTH = 14
const KIND: Record<Moment['kind'], { name: string; cls: string }> = { blunder: { name: 'Blunder', cls: 'bad' }, mistake: { name: 'Mistake', cls: 'mid' }, inaccuracy: { name: 'Inaccuracy', cls: 'soft' } }

export function GameReview({ player, puzzles, onPuzzlesAdded }: { player: string; puzzles: Puzzle[]; onPuzzlesAdded: () => void }) {
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [pick, setPick] = useState(0)
  const [done, setDone] = useState<Record<string, Review>>({}) // reviewed in this visit
  const [busy, setBusy] = useState<{ uuid: string; ply: number; plies: number } | null>(null)
  const [open, setOpen] = useState<number | null>(null) // the moment whose explanation is open (Lu, 28.11.: Dropdown)
  const [board, setBoard] = useState<number | null>(null) // the moment shown on the board

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

  // "Practise these mistakes" (Lu, 28.11.: "aus seinen Fehlern lernen"): the moments become puzzles (kept with your other
  // puzzles and their repetition), then a round with only this game's mistakes starts – once the app has loaded them
  const toPractise = review ? momentPuzzles(review, player) : []
  const [waiting, setWaiting] = useState<string | null>(null)
  const loaded = !!waiting && toPractise.length > 0 && toPractise.every((p) => puzzles.some((x) => x.id === p.id))
  useEffect(() => {
    if (loaded && waiting) go('puzzles/game/' + encodeURIComponent(waiting))
  }, [loaded, waiting])
  async function practise() {
    if (!review || !toPractise.length) return
    await Promise.all(toPractise.map((p) => putPuzzle(puzzles.find((x) => x.id === p.id) ? { ...puzzles.find((x) => x.id === p.id)!, ...p } : p)))
    setWaiting(review.uuid)
    onPuzzlesAdded()
  }

  const lvl = review?.accuracy != null ? levelOf(review.accuracy, review.myRating) : null

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
                  <button key={g.uuid} type="button" aria-pressed={pick === i} className={r} onClick={() => { setPick(i); setOpen(null); setBoard(null) }}>
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

              {/* Lu wanted an Elo per game – measured: one game says almost nothing about the rating (lib/gameLevel.ts), so
                  the honest number is how this game compares with games of players around your rating */}
              <div className={`rv-elo ${lvl?.label ?? ''}`}>
                <div>
                  <small>{lvl ? `For players rated ${lvl.from}–${lvl.to}` : 'Your level'}</small>
                  <b>{lvl ? `Better than ${lvl.better} of 100` : '–'}</b>
                  <span>{lvl ? (lvl.label === 'strong' ? '💪 A strong game for your level' : lvl.label === 'weak' ? '🙈 A weak game for your level' : '👍 A normal game for your level') : 'No comparison for this game'}</span>
                </div>
                <div className="rv-acc">
                  <span><b>{review.accuracy == null ? '–' : Math.round(review.accuracy)}%</b>you</span>
                  <span><b>{review.oppAccuracy == null ? '–' : Math.round(review.oppAccuracy)}%</b>{review.opponent}</span>
                  <small>accuracy</small>
                </div>
              </div>
              {lvl && <details className="rv-note"><summary>Why no Elo for one game?</summary>Measured in {LEVEL_SOURCE}: stronger players are more accurate on average, but one game tells almost nothing about the rating – games of every accuracy came from players around 620–650. So Hoppy compares your game with the games of players of your level instead of guessing an Elo.</details>}

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
              {toPractise.length > 0 && (
                <button type="button" className="rv-practise" onClick={practise} disabled={!!waiting}>
                  <span aria-hidden="true">🎯</span>
                  <span><b>{waiting ? 'Getting them ready …' : toPractise.length === 1 ? 'Practise this mistake' : `Practise these ${toPractise.length} mistakes`}</b><small>Find the better move yourself – they come back in your repetitions</small></span>
                </button>
              )}
              {!review.moments.length && <p className="pv-note">No real mistakes in this game – well played!</p>}
              {review.moments.map((m, i) => (
                <div key={m.ply} className={`rv-m ${KIND[m.kind].cls}`}>
                  <button type="button" className="rv-mh" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                    <span className="rv-tag">{KIND[m.kind].name}</span>
                    <b>{m.label}</b>
                    <small>{m.phase}</small>
                    <span aria-hidden="true">{open === i ? '▾' : '▸'}</span>
                  </button>
                  {open === i && (
                    <>
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
                      {board === i ? <MoveReplay sans={m.line} orientation={review.side === 'w' ? 'white' : 'black'} /> : <button type="button" className="rv-show" onClick={() => setBoard(i)}>Show on the board</button>}
                    </>
                  )}
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
