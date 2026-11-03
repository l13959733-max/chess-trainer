import { useEffect, useRef, useState } from 'react'
import { getFeedbackPrefs } from '../lib/feedback'
import { enqueue, onPlayback, prefetch, speakNow, stop, type Playback } from '../lib/voice'

// Listen button under an explanation. With "read aloud automatically" on (the default),
// the explanation is queued for reading as soon as it appears.
export function SpeakButton({ text, auto = true }: { text: string; auto?: boolean }) {
  const [p, setP] = useState<Playback>({ text: '', phase: 'idle' })
  const queued = useRef('')

  useEffect(() => onPlayback(setP), [])

  useEffect(() => {
    if (auto && getFeedbackPrefs().autoRead && queued.current !== text) {
      queued.current = text
      enqueue(text)
      return
    }
    // Not reading by itself: prepare the cloned voice once the explanation stays on screen for a moment
    const t = window.setTimeout(() => prefetch(text), 1000)
    return () => window.clearTimeout(t)
  }, [text, auto])

  const mine = p.text === text
  const state = mine ? p.phase : 'idle'

  return (
    <div className="speak">
      <button type="button" className="speak-btn" onClick={() => (state === 'idle' || state === 'blocked' ? speakNow(text) : stop())} aria-live="polite">
        {state === 'idle' ? '▶ Listen' : state === 'loading' ? 'Loading your voice … tap to stop' : state === 'blocked' ? '▶ Tap to hear it' : '■ Stop'}
      </button>
      {mine && p.source === 'phone' && <span className="speak-note">Phone voice – your Mac voice is not reachable</span>}
      {mine && p.source === 'clone' && <span className="speak-note">Your voice</span>}
    </div>
  )
}
