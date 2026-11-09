// Daily Threat Check (BAUPLAN 18): one puzzle a day for everyone, one try, a spoiler-free result to share.
import { useRef, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { dailyPuzzle, dayNumber, loadResults, saveResult, shareText, squares, type DailyResult } from '../lib/threatcheck'
import { OnePuzzle } from './King'
import '../king.css'

export function ThreatCheck() {
  const [day] = useState(() => dayNumber())
  const p = dailyPuzzle(day)
  // played before today: show the result, not the puzzle again (one try a day)
  const [earlier] = useState(() => loadResults()[day] ?? null)
  const [result, setResult] = useState<DailyResult | null>(earlier)
  const done = useRef(!!earlier)
  // the clock starts when your move is on the board (OnePuzzle plays it after 0.7 s)
  const [start] = useState(() => Date.now() + 700)
  const [shared, setShared] = useState<'copied' | 'failed' | null>(null)

  function finish(ok: boolean) {
    if (done.current) return
    done.current = true
    const r = { ok, secs: Math.max(1, Math.round((Date.now() - start) / 1000)) }
    saveResult(day, r)
    setResult(r)
  }

  async function share() {
    if (!result) return
    const text = shareText(day, result, location.origin + location.pathname + '#/threat-check')
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // closed the share sheet: nothing to do
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setShared('copied')
    } catch {
      setShared('failed')
    }
  }

  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back">←</button>
        <div>
          <div className="eyebrow">Daily Threat Check · #{day}</div>
          <h2>What does your opponent threaten?</h2>
        </div>
      </div>
      <p className="king-lesson">You just made your move. Before the next one, ask: what can my opponent do now? Play his best move. One try – the same puzzle for everyone today.</p>
      {earlier ? (
        <p className="king-lesson">You played today's puzzle already. A new one comes tomorrow.</p>
      ) : (
        <OnePuzzle p={p} threat onMistake={() => finish(false)} onSolved={() => finish(true)} />
      )}
      {result && (
        <div className={`king-fb ${result.ok ? 'ok knack' : ''}`}>
          <b>{result.ok ? `Spotted in ${result.secs} s` : 'The Shadow got you this time'}</b>
          <p className="threat-squares" aria-label={result.ok ? 'spotted' : 'missed'}>{squares(result)}</p>
          <p>{result.ok ? 'That is the habit: look at what your opponent can do before you move.' : earlier ? 'Tomorrow is a new chance.' : 'The green arrow shows his move. Play it and see why it hurts.'}</p>
          <button type="button" className="primary wide" onClick={share}>Share result</button>
          {shared === 'copied' && <p className="note small">Copied – paste it anywhere.</p>}
          {shared === 'failed' && <pre className="threat-share">{shareText(day, result, location.origin + location.pathname + '#/threat-check')}</pre>}
        </div>
      )}
      <p className="note small">Puzzles from the Lichess database.</p>
    </div>
  )
}
