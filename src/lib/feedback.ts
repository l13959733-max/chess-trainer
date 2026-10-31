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
    // One tick per pulse, spaced like the pattern (pulse + pause), at least 60 ms apart
    const list = Array.isArray(pattern) ? pattern : [pattern]
    let at = 0
    for (let i = 0; i < list.length; i += 2) {
      setTimeout(() => iosSwitch?.click(), at)
      at += Math.max(60, list[i] + (list[i + 1] ?? 0))
    }
  } catch {
    // no haptics available
  }
}

// A soft, very short "tick" like the click wheel of an old iPod: a tiny high noise burst
function tick(ac: AudioContext, at: number, volume: number) {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3800
  const g = ac.createGain()
  g.gain.setValueAtTime(volume, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.012)
  src.connect(hp).connect(g).connect(ac.destination)
  src.start(at)
  src.stop(at + 0.02)
}

// Pieces never sound exactly the same twice, like real wood
const vary = () => 0.96 + Math.random() * 0.08

// Haptic patterns (ms): short for small things, longer and doubled for big ones
const HAPTIC = {
  tap: 6,
  pick: 8,
  move: 14,
  capture: [16, 28, 22],
  check: [12, 30, 12, 30, 18],
  castle: [12, 70, 12],
  wrong: [35, 45, 35],
  success: [10, 35, 10, 35, 40],
  reward: [8, 30, 8, 30, 8, 30, 30],
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
  // Any button or tile: a tiny click and tick, so every tap feels physical
  tap() {
    const ac = audio()
    if (ac) tick(ac, ac.currentTime + 0.001, 0.35)
    vibrate(HAPTIC.tap)
  },
  // A piece is picked up (tap or start of a drag)
  pick() {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.001
      tick(ac, t, 0.25)
      tone(ac, t, 880 * vary(), 0.05, 0.05, 'sine')
    }
    vibrate(HAPTIC.pick)
  },
  // A move on the board. `mine` = played by the player (stronger feedback than the opponent's reply).
  move(san: string, mine = true) {
    const ac = audio()
    const capture = san.includes('x')
    const check = /[+#]/.test(san)
    const castle = san.startsWith('O-O')
    const promote = san.includes('=')
    if (ac) {
      const t = ac.currentTime + 0.005
      const v = mine ? 0.9 : 0.6
      if (castle) {
        clack(ac, t, v, 1.05 * vary())
        clack(ac, t + 0.09, v * 0.9, 0.95 * vary())
      } else {
        clack(ac, t, v, (capture ? 0.8 : 1) * vary())
        if (capture) clack(ac, t + 0.04, v * 0.75, 0.68 * vary())
      }
      if (check) tone(ac, t + 0.06, 1318.5, 0.25, 0.08, 'sine')
      if (promote) [784, 988, 1175].forEach((f, i) => tone(ac, t + 0.08 + i * 0.07, f, 0.22, 0.12))
    }
    if (mine) vibrate(check ? HAPTIC.check : castle ? HAPTIC.castle : capture ? HAPTIC.capture : HAPTIC.move)
  },
  wrong() {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.005
      tone(ac, t, 220, 0.18, 0.22, 'sine', 150)
      tone(ac, t + 0.1, 165, 0.2, 0.16, 'sine', 120)
    }
    vibrate(HAPTIC.wrong)
    shake()
  },
  success() {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.01
      // a little marimba run up
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(ac, t + i * 0.085, f, 0.3, 0.2)
        tone(ac, t + i * 0.085, f * 2, 0.12, 0.05, 'sine')
      })
    }
    vibrate(HAPTIC.success)
  },
  // XP and trophies: coins sparkle; a level-up gets a small fanfare
  reward(big = false) {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.02
      const notes = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568] : [1318.5, 1760, 2093]
      notes.forEach((f, i) => tone(ac, t + i * (big ? 0.11 : 0.06), f, big ? 0.35 : 0.18, big ? 0.16 : 0.08, big ? 'triangle' : 'sine'))
    }
    vibrate(HAPTIC.reward)
  },
}
