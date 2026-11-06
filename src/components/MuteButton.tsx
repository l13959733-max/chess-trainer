import { useState } from 'react'
import { getFeedbackPrefs, setFeedbackPrefs } from '../lib/feedback'
import { stop } from '../lib/voice'

// One tap silences move sounds and reading aloud; tapping again turns both back on.
// Vibration and the single switches in Settings stay as they are.
export function MuteButton() {
  const [prefs, setPrefs] = useState(getFeedbackPrefs)
  const muted = !prefs.sound && !prefs.autoRead

  function toggle() {
    const next = { ...getFeedbackPrefs(), sound: muted, autoRead: muted }
    if (!muted) stop()
    setFeedbackPrefs(next)
    setPrefs(next)
  }

  return (
    <button type="button" className="settings-link mute-btn" onClick={toggle} aria-pressed={muted} aria-label={muted ? 'Sound is off – turn it on' : 'Sound is on – turn it off'}>
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
