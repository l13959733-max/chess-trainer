// "Install as app": Chrome/Edge/Samsung Internet on Android fire `beforeinstallprompt`; we keep the event
// and show our own banner, whose button opens the browser's install dialog. Chrome then builds a real
// Android app (WebAPK): own icon, no browser bar, no browser badge. iPhones have no install dialog –
// there the banner explains Share → "Add to Home Screen".

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // no mini-infobar from the browser, our banner instead
  deferred = e as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  installedNow = true
  notify()
})
let installedNow = false

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function isInstalled(): boolean {
  return (
    installedNow ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isPhone(): boolean {
  return isIos() || /Android/i.test(navigator.userAgent)
}

export const canPrompt = () => deferred !== null

// Opens the browser's own install dialog. Returns true if the app was installed.
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const e = deferred
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  notify()
  return outcome === 'accepted'
}
