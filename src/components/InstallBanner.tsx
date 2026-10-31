import { useEffect, useState } from 'react'
import { canPrompt, isInstalled, isIos, isPhone, onInstallChange, promptInstall } from '../lib/install'
import { Mascot } from './Mascot'

const KEY = 'chess-trainer-install-later'
const LATER_DAYS = 7

function laterUntil(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0)
  } catch {
    return 0
  }
}

// Banner at the top of the overview: "Install as app" → the browser's install dialog → the app is on the
// home screen. Hidden inside the installed app and for a week after "Later".
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

  async function install() {
    if (canPrompt()) await promptInstall()
    else setHelp(true)
  }

  return (
    <section className="install-banner" role="region" aria-label="Install as app">
      <Mascot mood="happy" className="install-icon" />
      <div className="install-text">
        <b>Install as app</b>
        {help ? (
          isIos() ? (
            <span>Tap <b>Share</b> <span aria-hidden="true">⬆︎</span> at the bottom, then <b>“Add to Home Screen”</b>.</span>
          ) : (
            <span>Tap the menu <b>⋮</b> at the top right, then <b>“Install app”</b> or <b>“Add to Home screen”</b>.</span>
          )
        ) : (
          <span>Full screen, Hoppy on your home screen.</span>
        )}
      </div>
      <div className="install-actions">
        {!help && <button type="button" className="primary" onClick={install}>OK</button>}
        <button type="button" className="install-later" onClick={later}>{help ? 'Done' : 'Later'}</button>
      </div>
    </section>
  )
}
