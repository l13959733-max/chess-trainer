import { useEffect, useState } from 'react'
import { canPrompt, isInstalled, isIos, isPhone, onInstallChange, promptInstall } from '../lib/install'
import { Mascot } from './Mascot'
import { t } from '../lib/i18n'

const KEY = 'chess-trainer-install-later'
const LATER_DAYS = 7

function laterUntil(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0)
  } catch {
    return 0
  }
}

// The iPhone's share icon (square with an arrow up) and the "Add to Home Screen" icon (square with a plus)
const ShareIcon = () => (
  <svg className="ios-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
const AddIcon = () => (
  <svg className="ios-icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// Banner at the top of the overview. Android: "OK" opens the browser's install dialog. iPhone: Apple allows
// no install button, so the banner shows the three taps right away, with the icons as they look on the phone.
// Hidden inside the installed app and for a week after "Later".
export function InstallBanner() {
  const [, rerender] = useState(0)
  const [hidden, setHidden] = useState(() => laterUntil() > Date.now())
  const [help, setHelp] = useState(false)
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])

  if (hidden || isInstalled() || (!canPrompt() && !isPhone())) return null

  function later() {
    try {
      localStorage.setItem(KEY, String(Date.now() + LATER_DAYS * 86_400_000))
    } catch {
      // not saved, hidden for this visit
    }
    setHidden(true)
  }

  if (isIos()) {
    return (
      <section className="install-banner ios" role="region" aria-label={t('Add to Home Screen')}>
        <div className="install-head">
          <Mascot mood="happy" className="install-icon" />
          <div className="install-text">
            <b>{t('Get the app: 3 taps')}</b>
            <span>{t('Full screen, Hoppy on your home screen.')}</span>
          </div>
          <button type="button" className="install-later" onClick={later}>{t('Later')}</button>
        </div>
        <ol className="ios-steps">
          <li><span className="step-no">1</span><span>{t('Tap')} <b>{t('Share')}</b> <ShareIcon /> <small>{t('(Safari: at the bottom – if you only see')} <b>⋯</b>{t(', tap that first)')}</small></span></li>
          <li><span className="step-no">2</span><span>{t('Scroll down, tap')} <b>{t('Add to Home Screen')}</b> <AddIcon /></span></li>
          <li><span className="step-no">3</span><span>{t('Tap')} <b>{t('Add')}</b> {t('at the top right. Done!')}</span></li>
        </ol>
      </section>
    )
  }

  async function install() {
    if (canPrompt()) await promptInstall()
    else setHelp(true)
  }

  return (
    <section className="install-banner" role="region" aria-label={t('Install as app')}>
      <div className="install-head">
        <Mascot mood="happy" className="install-icon" />
        <div className="install-text">
          <b>{t('Install as app')}</b>
          {help ? (
            <span>{t('Tap the menu')} <b>⋮</b> {t('at the top right, then')} <b>{t('“Install app”')}</b> {t('or')} <b>{t('“Add to Home screen”')}</b>.</span>
          ) : (
            <span>{t('Full screen, Hoppy on your home screen.')}</span>
          )}
        </div>
        <div className="install-actions">
          {!help && <button type="button" className="primary" onClick={install}>{t('OK')}</button>}
          <button type="button" className="install-later" onClick={later}>{help ? t('Done') : t('Later')}</button>
        </div>
      </div>
    </section>
  )
}
