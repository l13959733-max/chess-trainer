import { useEffect, useRef, useState } from 'react'
import { prefetch, speak, stop, type VoiceSource } from '../lib/voice'

type State = 'idle' | 'loading' | 'playing'

export function SpeakButton({ text }: { text: string }) {
  const [state, setState] = useState<State>('idle')
  const [source, setSource] = useState<VoiceSource | null>(null)
  const run = useRef(0)

  // Prepare the cloned voice once the explanation has stayed on screen for a moment
  useEffect(() => {
    const t = window.setTimeout(() => prefetch(text), 1000)
    return () => {
      window.clearTimeout(t)
      run.current++
      stop()
    }
  }, [text])

  function onClick() {
    if (state !== 'idle') {
      run.current++
      stop()
      setState('idle')
      return
    }
    const id = ++run.current
    setState('loading')
    const h = speak(text)
    h.source.then((s) => {
      if (run.current !== id) return
      setSource(s)
      setState('playing')
    })
    h.done.then(() => {
      if (run.current === id) setState('idle')
    })
  }

  return (
    <div className="speak">
      <button type="button" className="speak-btn" onClick={onClick} aria-live="polite">
        {state === 'idle' ? '▶ Listen' : state === 'loading' ? 'Loading your voice … tap to cancel' : '■ Stop'}
      </button>
      {source === 'phone' && <span className="speak-note">Phone voice – your Mac voice is not reachable</span>}
      {source === 'clone' && state === 'playing' && <span className="speak-note">Your voice</span>}
    </div>
  )
}
