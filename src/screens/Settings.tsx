import { useEffect, useMemo, useRef, useState } from 'react'
import { SpeakButton } from '../components/SpeakButton'
import { go } from '../hooks/useHashRoute'
import { feedback, getFeedbackPrefs, setFeedbackPrefs } from '../lib/feedback'
import type { Line } from '../lib/pgn'
import { TRY_IT, voiceTexts } from '../lib/speech'
import { isAllowedVoiceUrl, loadVoiceSettings, saveAll, savedCount, saveVoiceSettings } from '../lib/voice'

type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'fail'; why: string }

// `incoming` comes from a voice link (#/voice/<address>) made by the starter on the Mac.
export function Settings({ incoming, lines }: { incoming?: string; lines: Line[] }) {
  const [url, setUrl] = useState('')
  const [voiceName, setVoiceName] = useState('stimme1')
  const [saved, setSaved] = useState(false)
  const [check, setCheck] = useState<Check>({ kind: 'idle' })
  const [fb, setFb] = useState(getFeedbackPrefs)

  function toggle(key: 'sound' | 'haptics' | 'autoRead') {
    const next = { ...fb, [key]: !fb[key] }
    setFb(next)
    setFeedbackPrefs(next)
    if (next[key] && key !== 'autoRead') feedback.move('Nf3')
  }

  const [rejected, setRejected] = useState(false)
  const texts = useMemo(() => [...voiceTexts(lines), TRY_IT], [lines])
  const [clipCount, setClipCount] = useState<number | null>(null)
  const [saving, setSaving] = useState<'idle' | 'running' | 'error'>('idle')
  const stopSaving = useRef(false)

  useEffect(() => {
    savedCount(texts).then(setClipCount)
  }, [texts])

  async function saveVoice() {
    stopSaving.current = false
    setSaving('running')
    try {
      await saveAll(texts, setClipCount, () => stopSaving.current)
      setSaving('idle')
    } catch {
      setSaving('error')
    }
  }

  useEffect(() => {
    loadVoiceSettings().then((s) => {
      setVoiceName(s.voiceName)
      if (incoming && isAllowedVoiceUrl(incoming)) {
        setUrl(incoming)
        save(incoming, s.voiceName)
      } else {
        setUrl(s.serverUrl)
        if (incoming) setRejected(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  async function save(address = url, name = voiceName) {
    await saveVoiceSettings({ serverUrl: address, voiceName: name })
    setSaved(true)
    if (!address.trim()) return setCheck({ kind: 'idle' })
    setCheck({ kind: 'checking' })
    try {
      // The voice changer serves its own page at "/": an answer means Mac, server and tunnel are up
      const res = await fetch(address.trim().replace(/\/+$/, '') + '/', { cache: 'no-store' })
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
          <h2>Sound &amp; voice</h2>
        </div>
      </div>

      <div className="form">
        <div className="label">Sound &amp; vibration</div>
        <label className="toggle" htmlFor="fb-sound">
          <span>Move sounds</span>
          <input id="fb-sound" type="checkbox" checked={fb.sound} onChange={() => toggle('sound')} />
        </label>
        <label className="toggle" htmlFor="fb-haptics">
          <span>Vibration</span>
          <input id="fb-haptics" type="checkbox" checked={fb.haptics} onChange={() => toggle('haptics')} />
        </label>
        <label className="toggle" htmlFor="fb-autoread">
          <span>Read explanations aloud</span>
          <input id="fb-autoread" type="checkbox" checked={fb.autoRead} onChange={() => toggle('autoRead')} />
        </label>
        <p className="note">On an iPhone, sounds follow the silent switch, and vibration needs iOS 18 or newer.</p>

        <div className="label">Read-aloud voice</div>
        <p className="note">
          Explanations are read in your own voice from the voice changer on your Mac. When the Mac is off, your phone's voice
          reads them instead.
        </p>
        <ol className="steps">
          <li>On the Mac: double-click <code>Chess-Voice.command</code> in the voice changer folder. It starts the voice changer and the tunnel together.</li>
          <li>Paste the <code>https://….trycloudflare.com</code> address here, or open the voice link the starter shows – it fills this in for you. The address changes every time the tunnel restarts.</li>
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

        {rejected && <p className="bad" role="status">That link did not contain a voice changer address, so nothing was changed.</p>}
        <button type="button" className="primary wide" onClick={() => save()}>Save</button>
        {saved && check.kind === 'idle' && <p className="good" role="status">Saved. Without an address, your phone's voice reads aloud.</p>}
        {check.kind === 'checking' && <p className="note" role="status">Checking the connection …</p>}
        {check.kind === 'ok' && <p className="good" role="status">Saved. Your Mac voice is reachable.</p>}
        {check.kind === 'fail' && <p className="bad" role="status">Saved, but the Mac voice is not reachable. {check.why}</p>}

        <div className="label">Your voice on this phone</div>
        <div className="voice-store">
          <div className="goal-row">
            <span>Explanations saved in your voice</span>
            <span className="count">{clipCount ?? '…'} / {texts.length}</span>
          </div>
          <div className="bar"><span style={{ width: `${((clipCount ?? 0) / texts.length) * 100}%` }} /></div>
          {clipCount === texts.length ? (
            <p className="good">All explanations are in your voice – for everyone who opens the app, even when your Mac is off.</p>
          ) : saving === 'running' ? (
            <>
              <p className="note">Saving … keep this screen open. New sentences take 10–20 seconds each on the Mac.</p>
              <button type="button" onClick={() => (stopSaving.current = true)}>Pause</button>
            </>
          ) : (
            <>
              <p className="note">
                Saves every explanation once in your voice on this phone. Afterwards it reads in your voice without the Mac.
                Needs the Mac voice for the download.
              </p>
              <button type="button" className="primary wide" disabled={!url.trim()} onClick={saveVoice}>
                Save my voice on this phone
              </button>
              {saving === 'error' && <p className="bad">The Mac voice stopped answering. Check the Chess-Voice window on the Mac, then tap again – saved sentences are kept.</p>}
            </>
          )}
        </div>

        <div className="label">Try it</div>
        <SpeakButton auto={false} text={TRY_IT} />
        <p className="note">The address is stored only on this device. The first sentence can take 10–20 seconds; repeated sentences play instantly.</p>
      </div>
    </div>
  )
}
