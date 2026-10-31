// Sound and haptic feedback. Sounds are synthesised with Web Audio (no audio files):
// a wooden "clack" per move, a heavier one for captures, a soft low tone for mistakes
// and a short rising chime for success.

export interface FeedbackPrefs {
  sound: boolean
  haptics: boolean
  autoRead: boolean // read explanations aloud as soon as they appear
}

const KEY = 'chess-trainer-feedback'
let prefs: FeedbackPrefs = { sound: true, haptics: true, autoRead: true }
try {
  const saved = localStorage.getItem(KEY)
  if (saved) prefs = { ...prefs, ...JSON.parse(saved) }
} catch {
  // storage blocked: keep defaults
}

export function getFeedbackPrefs(): FeedbackPrefs {
  return prefs
}

export function setFeedbackPrefs(p: FeedbackPrefs) {
  prefs = p
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // not saved, still applies for this visit
  }
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!prefs.sound) return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

let noise: AudioBuffer | null = null

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  }
  return noise
}

// Wood on wood: a filtered noise click plus a short low "thock"
function clack(ac: AudioContext, at: number, volume: number, pitch: number) {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 2200 * pitch
  band.Q.value = 1.4
  const g = ac.createGain()
  g.gain.setValueAtTime(volume, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.06)
  src.connect(band).connect(g).connect(ac.destination)
  src.start(at)

  const body = ac.createOscillator()
  body.type = 'sine'
  body.frequency.setValueAtTime(240 * pitch, at)
  body.frequency.exponentialRampToValueAtTime(120 * pitch, at + 0.07)
  const bg = ac.createGain()
  bg.gain.setValueAtTime(volume * 0.6, at)
  bg.gain.exponentialRampToValueAtTime(0.001, at + 0.08)
  body.connect(bg).connect(ac.destination)
  body.start(at)
  body.stop(at + 0.1)
}

function tone(ac: AudioContext, at: number, freq: number, dur: number, volume: number, type: OscillatorType = 'triangle', glideTo?: number) {
  const o = ac.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(volume, at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(ac.destination)
  o.start(at)
  o.stop(at + dur + 0.02)
}

// iOS Safari has no vibration API, but toggling a native switch control gives a haptic tick (iOS 18+).
let iosSwitch: HTMLLabelElement | null = null

function vibrate(pattern: number | number[]) {
  if (!prefs.haptics) return
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
    return
  }
  try {
    if (!iosSwitch) {
      iosSwitch = document.createElement('label')
      iosSwitch.setAttribute('aria-hidden', 'true')
      iosSwitch.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.tabIndex = -1
      iosSwitch.appendChild(input)
      document.body.appendChild(iosSwitch)
    }
    const taps = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1
    for (let i = 0; i < taps; i++) setTimeout(() => iosSwitch?.click(), i * 120)
  } catch {
    // no haptics available
  }
}

// The board shakes a little after a wrong move ("nope")
function shake() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  document.querySelectorAll('.board-wrap').forEach((el) => {
    el.classList.remove('shake')
    void (el as HTMLElement).offsetWidth // restart the animation
    el.classList.add('shake')
  })
}

export const feedback = {
  // A move on the board. `mine` = played by Lu (stronger feedback than the opponent's reply).
  move(san: string, mine = true) {
    const ac = audio()
    const capture = san.includes('x')
    if (ac) {
      const t = ac.currentTime + 0.005
      clack(ac, t, mine ? 0.9 : 0.6, capture ? 0.8 : 1)
      if (capture) clack(ac, t + 0.045, 0.7, 0.7)
    }
    if (mine) vibrate(capture ? [18, 40, 18] : 15)
  },
  wrong() {
    const ac = audio()
    if (ac) tone(ac, ac.currentTime + 0.005, 260, 0.22, 0.25, 'sine', 170)
    vibrate([40, 60, 40])
    shake()
  },
  success() {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.01
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, t + i * 0.09, f, 0.28, 0.22))
    }
    vibrate([20, 50, 20, 50, 60])
  },
}
