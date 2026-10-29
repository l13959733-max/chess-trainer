import { useEffect, useState } from 'react'
import { SpeakButton } from '../components/SpeakButton'
import { go } from '../hooks/useHashRoute'
import { loadVoiceSettings, saveVoiceSettings } from '../lib/voice'

type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'fail'; why: string }

export function Settings() {
  const [url, setUrl] = useState('')
  const [voiceName, setVoiceName] = useState('stimme1')
  const [saved, setSaved] = useState(false)
  const [check, setCheck] = useState<Check>({ kind: 'idle' })

  useEffect(() => {
    loadVoiceSettings().then((s) => {
      setUrl(s.serverUrl)
      setVoiceName(s.voiceName)
    })
  }, [])

  async function save() {
    await saveVoiceSettings({ serverUrl: url, voiceName })
    setSaved(true)
    if (!url.trim()) return setCheck({ kind: 'idle' })
    setCheck({ kind: 'checking' })
    try {
      // The voice changer serves its own page at "/": an answer means Mac, server and tunnel are up
      const res = await fetch(url.trim().replace(/\/+$/, '') + '/', { cache: 'no-store' })
      setCheck(res.ok ? { kind: 'ok' } : { kind: 'fail', why: `The server answered ${res.status}.` })
    } catch {
      setCheck({ kind: 'fail', why: 'No answer. Is the Mac on and are the voice changer and the tunnel running?' })
    }
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">Settings</div>
          <h2>Read-aloud voice</h2>
        </div>
      </div>

      <div className="form">
        <p className="note">
          Explanations are read in your own voice from the voice changer on your Mac. When the Mac is off, your phone's voice
          reads them instead.
        </p>
        <ol className="steps">
          <li>On the Mac: start the voice changer (<code>./klon-oberflaeche</code>).</li>
          <li>Start the tunnel: <code>cloudflared tunnel --url http://localhost:8090</code></li>
          <li>Paste the <code>https://….trycloudflare.com</code> address here. It changes every time the tunnel restarts.</li>
        </ol>

        <label htmlFor="voice-url">Voice server address</label>
        <input
          id="voice-url"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setSaved(false)
          }}
          placeholder="https://example.trycloudflare.com"
        />

        <label htmlFor="voice-name">Voice name</label>
        <input
          id="voice-name"
          type="text"
          value={voiceName}
          onChange={(e) => {
            setVoiceName(e.target.value)
            setSaved(false)
          }}
        />

        <button type="button" className="primary wide" onClick={save}>Save</button>
        {saved && check.kind === 'idle' && <p className="good" role="status">Saved. Without an address, your phone's voice reads aloud.</p>}
        {check.kind === 'checking' && <p className="note" role="status">Checking the connection …</p>}
        {check.kind === 'ok' && <p className="good" role="status">Saved. Your Mac voice is reachable.</p>}
        {check.kind === 'fail' && <p className="bad" role="status">Saved, but the Mac voice is not reachable. {check.why}</p>}

        <div className="label">Try it</div>
        <SpeakButton text="Knight to f3. This is your chess trainer, speaking in your own voice." />
        <p className="note">The address is stored only on this device. The first sentence can take 10–20 seconds; repeated sentences play instantly.</p>
      </div>
    </div>
  )
}
