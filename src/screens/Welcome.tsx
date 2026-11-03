import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { reset as resetAnalyzer } from '../lib/analyzer'
import { findPlayer, setPlayer } from '../lib/chesscom'
import { cleanName, MAX_NAME, setName } from '../lib/profile'
import { lang, setLang, t } from '../lib/i18n'

// Asked once per phone: the name others see when they watch, and optionally the chess.com account
export function Welcome({ player, hasPlayer, onDone }: { player: string; hasPlayer: boolean; onDone: (player: string) => void }) {
  const [name, setNameText] = useState('')
  const [account, setAccount] = useState(hasPlayer ? player : '')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function start() {
    if (!cleanName(name)) return
    const wanted = account.trim().toLowerCase()
    let next = player
    if (wanted && wanted !== player) {
      setBusy(true)
      setMsg(null)
      try {
        const found = await findPlayer(wanted)
        if (!found) {
          setBusy(false)
          return setMsg(`There is no chess.com player called “${account.trim()}”. Fix it or leave it empty.`)
        }
        if (found !== player) {
          await resetAnalyzer()
          setPlayer(found)
          next = found
        }
      } catch {
        setBusy(false)
        return setMsg('chess.com did not answer. Check the internet connection – or leave the field empty.')
      }
    }
    setName(name)
    onDone(next)
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{t('Welcome')}</div>
          <h2>{t('Who are you?')}</h2>
        </div>
      </div>
      <div className="greet">
        <Mascot mood="happy" />
        {t("Hi, I'm Hoppy! Tell me your name – friends see it when they watch you play.")}
      </div>
      <div className="form">
        <div className="label">{t('Language')}</div>
        <div className="seg two" role="group" aria-label={t('Language')}>
          <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          <button type="button" className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>Español</button>
        </div>
        <label className="label" htmlFor="profile-name">{t('Your name')}</label>
        <input id="profile-name" type="text" value={name} maxLength={MAX_NAME} onChange={(e) => setNameText(e.target.value)} placeholder={t('e.g. Lu')} autoComplete="nickname" />
        <label className="label" htmlFor="profile-chesscom">{t('Chess.com username (optional)')}</label>
        <input id="profile-chesscom" type="text" value={account} onChange={(e) => { setAccount(e.target.value); setMsg(null) }} placeholder={t('leave empty if you have none')} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <p className="note small">{t('Your puzzles come from these chess.com games. You can change both later in Settings.')}</p>
        {msg && <p className="bad" role="status">{msg}</p>}
        <button type="button" className="primary wide" disabled={!cleanName(name) || busy} onClick={start}>{busy ? t('Checking chess.com …') : t("Let's go")}</button>
      </div>
    </div>
  )
}
