import { Chess } from 'chess.js'
import { useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { decodeChallenge } from '../lib/together'
import { OnePuzzle } from './King'

// #/challenge/<link> – a friend's challenge (Lu, 28.11.2026: "die App soll sich verbreiten, Freunde schicken sie
// einander"). Opens without an account or a name: one position from the sender's own game, find the better move,
// then an invitation to Hoppy. Nothing is saved for someone who is not using Hoppy yet.
export function Challenge({ payload, named }: { payload?: string; named: boolean }) {
  const c = payload ? decodeChallenge(decodeURIComponent(payload)) : null
  const [state, setState] = useState<'play' | 'solved' | 'helped'>('play')
  const [missed, setMissed] = useState(false)
  if (!c) {
    return (
      <div className="pn pn-page"><div className="pn-screen"><div className="pn-scroll">
        <div className="tg-wait"><b>This challenge link is broken</b><span>Ask your friend to send it again.</span>
          <button type="button" className="tg-go" onClick={() => go('')}>Open Hoppy</button></div>
      </div></div></div>
    )
  }
  const side = new Chess(c.fen).turn() === 'w' ? 'White' : 'Black'
  return (
    <div className="pn pn-page ch">
      <div className="pn-screen">
        <div className="pn-scroll">
          <div className="ch-head">
            <span aria-hidden="true">🤝</span>
            <div><small>{c.from} challenges you</small><b>Find the better move</b><span>You play {side}{c.played ? ` · in the game ${c.from} played ${c.played}` : ''}</span></div>
          </div>
          <OnePuzzle
            p={{ id: 'challenge', fen: c.fen, moves: c.best, rating: 0, direct: true }}
            onMistake={() => setMissed(true)}
            onSolved={() => setState(missed ? 'helped' : 'solved')}
          />
          {state === 'play' && <p className="ch-tip">{missed ? 'Not quite – the arrow shows the better move. Play it.' : 'Look at checks, captures and attacks first.'}</p>}
          {state !== 'play' && (
            <div className={`ch-done ${state}`}>
              <b>{state === 'solved' ? '🎉 You found it!' : '👍 Now you know it'}</b>
              <span>{state === 'solved' ? `Better than ${c.from} in the game!` : `${c.from} missed it too – that’s how you learn.`}</span>
            </div>
          )}
          {state !== 'play' && (
            <div className="ch-cta">
              <b>{named ? `Challenge ${c.from} back` : `Learn chess with ${c.from} in Hoppy`}</b>
              <span>{named ? 'Send one of your own mistakes.' : 'Free, in the browser: openings, your own mistakes as puzzles, a streak with your friends.'}</span>
              <button type="button" className="tg-go" onClick={() => go(named ? 'together' : '')}>{named ? 'Challenge back' : 'Start Hoppy'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
