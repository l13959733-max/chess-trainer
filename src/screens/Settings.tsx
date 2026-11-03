import { useEffect, useMemo, useRef, useState } from 'react'
import { SpeakButton } from '../components/SpeakButton'
import { go } from '../hooks/useHashRoute'
import { reset as resetAnalyzer } from '../lib/analyzer'
import { findPlayer, setPlayer } from '../lib/chesscom'
import { feedback, getFeedbackPrefs, setFeedbackPrefs } from '../lib/feedback'
import type { Line } from '../lib/pgn'
import { cleanName, getName, MAX_NAME, setName } from '../lib/profile'
import { TRY_IT, voiceTexts } from '../lib/speech'
import { CLONE_VOICE, isAllowedVoiceUrl, loadVoiceSettings, saveAll, savedCount, saveVoiceSettings } from '../lib/voice'
import { lang, setLang, t } from '../lib/i18n'

type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'fail'; why: string }

// `incoming` comes from a voice link (#/voice/<address>) made by the starter on the Mac.
interface Props {
  lines: Line[]
  player: string
  onPlayer: (name: string) => void
  incoming?: string // voice address from a voice link
  incomingPlayer?: string // chess.com name from a player link (#/player/<name>)
}

export function Settings({ incoming, lines, player, onPlayer, incomingPlayer }: Props) {
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
  const [name, setNameText] = useState(() => getName() ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [account, setAccount] = useState(incomingPlayer ?? player)
  const [accountMsg, setAccountMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveAccount(name = account) {
    const wanted = name.trim()
    if (!wanted) return
    setAccountMsg({ ok: true, text: 'Looking up ' + wanted + ' on chess.com …' })
    try {
      const found = await findPlayer(wanted)
      if (!found) return setAccountMsg({ ok: false, text: `There is no chess.com player called “${wanted}”.` })
      if (found !== player) {
        await resetAnalyzer()
        setPlayer(found)
        onPlayer(found)
      }
      setAccount(found)
      setAccountMsg({ ok: true, text: `Puzzles now come from ${found}'s games. On the start page, tap “Analyse games”.` })
    } catch {
      setAccountMsg({ ok: false, text: 'chess.com did not answer. Check the internet connection and try again.' })
    }
  }

  // A player link (#/player/johanzii) sets the account right away
  useEffect(() => {
    if (incomingPlayer) saveAccount(incomingPlayer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingPlayer])
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
        <button type="button" className="back" onClick={() => go('')} aria-label={t('Back to overview')}>←</button>
        <div>
          <div className="eyebrow">{t('Settings')}</div>
          <h2>{t('Sound & voice')}</h2>
        </div>
      </div>

      <div className="form">
        <div className="label">{t('Language')}</div>
        <div className="seg two" role="group" aria-label={t('Language')}>
          <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          <button type="button" className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>Español</button>
        </div>
        <label className="label" htmlFor="profile-name">{t('Your name')}</label>
        <p className="note">{t('Friends see it when they watch you play.')}</p>
        <input id="profile-name" type="text" value={name} maxLength={MAX_NAME} onChange={(e) => { setNameText(e.target.value); setNameSaved(false) }} />
        <button type="button" className="wide" disabled={!cleanName(name)} onClick={() => { setName(name); setNameSaved(true) }}>{nameSaved ? t('Saved ✓') : t('Save name')}</button>

        <div className="label">{t('Chess.com account')}</div>
        <p className="note">{t("Blunder puzzles come from this player's rapid and daily games. Each phone can have its own player.")}</p>
        <input
          id="chesscom-name"
          type="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={account}
          onChange={(e) => {
            setAccount(e.target.value)
            setAccountMsg(null)
          }}
          placeholder={t('chess.com username')}
        />
        <button type="button" className="primary wide" onClick={() => saveAccount()}>{t('Use this account')}</button>
        {accountMsg && <p className={accountMsg.ok ? 'good' : 'bad'} role="status">{accountMsg.text}</p>}

        <div className="label">{t('Sound & vibration')}</div>
        <label className="toggle" htmlFor="fb-sound">
          <span>{t('Move sounds')}</span>
          <input id="fb-sound" type="checkbox" checked={fb.sound} onChange={() => toggle('sound')} />
        </label>
        <label className="toggle" htmlFor="fb-haptics">
          <span>{t('Vibration')}</span>
          <input id="fb-haptics" type="checkbox" checked={fb.haptics} onChange={() => toggle('haptics')} />
        </label>
        <label className="toggle" htmlFor="fb-autoread">
          <span>{t('Read explanations aloud')}</span>
          <input id="fb-autoread" type="checkbox" checked={fb.autoRead} onChange={() => toggle('autoRead')} />
        </label>
        <p className="note">{t('On an iPhone, sounds follow the silent switch, and vibration needs iOS 18 or newer.')}</p>

        {CLONE_VOICE ? (
          <>
        <div className="label">{t('Read-aloud voice')}</div>
        <p className="note">
          {t("Explanations are read in your own voice from the voice changer on your Mac. When the Mac is off, your phone's voice reads them instead.")}
        </p>
        <ol className="steps">
          <li>{t('On the Mac: double-click')} <code>{t('Chess-Voice.command')}</code> {t('in the voice changer folder. It starts the voice changer and the tunnel together.')}</li>
          <li>{t('Paste the')} <code>{t('https://….trycloudflare.com')}</code> {t('address here, or open the voice link the starter shows – it fills this in for you. The address changes every time the tunnel restarts.')}</li>
        </ol>

        <label htmlFor="voice-url">{t('Voice server address')}</label>
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
          placeholder={t('https://example.trycloudflare.com')}
        />

        <label htmlFor="voice-name">{t('Voice name')}</label>
        <input
          id="voice-name"
          type="text"
          value={voiceName}
          onChange={(e) => {
            setVoiceName(e.target.value)
            setSaved(false)
          }}
        />

        {rejected && <p className="bad" role="status">{t('That link did not contain a voice changer address, so nothing was changed.')}</p>}
        <button type="button" className="primary wide" onClick={() => save()}>{t('Save')}</button>
        {saved && check.kind === 'idle' && <p className="good" role="status">{t("Saved. Without an address, your phone's voice reads aloud.")}</p>}
        {check.kind === 'checking' && <p className="note" role="status">{t('Checking the connection …')}</p>}
        {check.kind === 'ok' && <p className="good" role="status">{t('Saved. Your Mac voice is reachable.')}</p>}
        {check.kind === 'fail' && <p className="bad" role="status">{t('Saved, but the Mac voice is not reachable.')} {check.why}</p>}

        <div className="label">{t('Your voice on this phone')}</div>
        <div className="voice-store">
          <div className="goal-row">
            <span>{t('Explanations saved in your voice')}</span>
            <span className="count">{clipCount ?? '…'} / {texts.length}</span>
          </div>
          <div className="bar"><span style={{ width: `${((clipCount ?? 0) / texts.length) * 100}%` }} /></div>
          {clipCount === texts.length ? (
            <p className="good">{t('All explanations are in your voice – for everyone who opens the app, even when your Mac is off.')}</p>
          ) : saving === 'running' ? (
            <>
              <p className="note">{t('Saving … keep this screen open. New sentences take 10–20 seconds each on the Mac.')}</p>
              <button type="button" onClick={() => (stopSaving.current = true)}>{t('Pause')}</button>
            </>
          ) : (
            <>
              <p className="note">
                {t('Saves every explanation once in your voice on this phone. Afterwards it reads in your voice without the Mac. Needs the Mac voice for the download.')}
              </p>
              <button type="button" className="primary wide" disabled={!url.trim()} onClick={saveVoice}>
                {t('Save my voice on this phone')}
              </button>
              {saving === 'error' && <p className="bad">{t('The Mac voice stopped answering. Check the Chess-Voice window on the Mac, then tap again – saved sentences are kept.')}</p>}
            </>
          )}
        </div>

          </>
        ) : (
          <>
            <div className="label">{t('Read-aloud voice')}</div>
            <p className="note">{t("Explanations are read by your phone's standard English voice.")}</p>
          </>
        )}
        <div className="label">{t('Try it')}</div>
        <SpeakButton auto={false} text={TRY_IT} />
        <p className="note small">{t('App version')} {__APP_VERSION__}</p>
        {CLONE_VOICE && <p className="note">{t('The address is stored only on this device. The first sentence can take 10–20 seconds; repeated sentences play instantly.')}</p>}
      </div>
    </div>
  )
}
