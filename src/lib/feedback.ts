// Sound and haptic feedback. Sounds are synthesised with Web Audio (no audio files):
// a dry wooden knock per move (own and opponent's sound a little different), separate sounds for
// captures, castling, check, promotion and illegal moves, a soft low tone for mistakes and a chime for success.

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

// Piece sounds in the style of big chess sites: a short, dry knock of wood on a wooden board.
// Each sound is computed once as a sample (a few damped resonances of the wood + a tiny click),
// then replayed with a slightly different pitch every time, like real pieces.
type Mode = [freq: number, amp: number, decay: number]
interface Hit {
  at: number // seconds from the start of the sound
  modes: Mode[]
  click: number // loudness of the first contact noise
  thump: number // loudness of the low board resonance
  gain: number
}

const KNOCK: Mode[] = [
  [620, 1, 0.032],
  [1180, 0.55, 0.02],
  [1890, 0.32, 0.013],
  [3050, 0.16, 0.008],
]
const scale = (modes: Mode[], f: number, d = 1): Mode[] => modes.map(([fr, a, dc]) => [fr * f, a, dc * d])

const SOUNDS = {
  self: [{ at: 0, modes: KNOCK, click: 0.35, thump: 0.5, gain: 0.9 }],
  opponent: [{ at: 0, modes: scale(KNOCK, 0.86, 1.1), click: 0.25, thump: 0.45, gain: 0.75 }],
  // the capturing piece lands hard and knocks the other one away
  capture: [
    { at: 0, modes: scale(KNOCK, 1.12, 0.8), click: 0.7, thump: 0.6, gain: 1 },
    { at: 0.028, modes: scale(KNOCK, 1.45, 0.6), click: 0.4, thump: 0, gain: 0.45 },
  ],
  // king, then rook
  castle: [
    { at: 0, modes: KNOCK, click: 0.35, thump: 0.5, gain: 0.85 },
    { at: 0.085, modes: scale(KNOCK, 0.93), click: 0.3, thump: 0.45, gain: 0.8 },
  ],
  // too far off: a soft, muffled bump, nothing happens
  illegal: [{ at: 0, modes: scale(KNOCK, 0.45, 0.9), click: 0.05, thump: 0.7, gain: 0.45 }],
} satisfies Record<string, Hit[]>

type SoundName = keyof typeof SOUNDS
const buffers = new Map<SoundName, AudioBuffer>()

function render(ac: AudioContext, hits: Hit[]): AudioBuffer {
  const rate = ac.sampleRate
  const len = Math.ceil(rate * (Math.max(...hits.map((h) => h.at)) + 0.14))
  const buf = ac.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  for (const h of hits) {
    const start = Math.floor(h.at * rate)
    for (let i = 0; start + i < len; i++) {
      const t = i / rate
      if (t > 0.13) break
      let v = 0
      for (const [f, a, dc] of h.modes) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / dc)
      v += h.thump * Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t / 0.022)
      v += h.click * (Math.random() * 2 - 1) * Math.exp(-t / 0.0012)
      d[start + i] += h.gain * v * Math.min(1, t / 0.0004) // 0.4 ms attack, no hard edge
    }
  }
  let peak = 0
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]))
  const norm = peak > 0 ? 0.85 / peak : 1
  const loudest = Math.max(...hits.map((h) => h.gain))
  for (let i = 0; i < len; i++) d[i] *= norm * loudest
  return buf
}

function play(ac: AudioContext, name: SoundName, at: number, volume = 1) {
  let buf = buffers.get(name)
  if (!buf) {
    buf = render(ac, SOUNDS[name])
    buffers.set(name, buf)
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = 0.97 + Math.random() * 0.06
  const g = ac.createGain()
  g.gain.value = volume
  src.connect(g).connect(ac.destination)
  src.start(at)
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
      play(ac, san.startsWith('O-O') ? 'castle' : capture ? 'capture' : mine ? 'self' : 'opponent', t)
      if (/[+#]/.test(san)) tone(ac, t + 0.05, 1046.5, 0.16, 0.07, 'sine')
      if (san.includes('=')) [784, 988, 1175].forEach((f, i) => tone(ac, t + 0.08 + i * 0.07, f, 0.2, 0.1))
    }
    if (mine) vibrate(capture ? [18, 40, 18] : 15)
  },
  // A piece dropped on a square it can't go to: it simply goes back
  illegal() {
    const ac = audio()
    if (ac) play(ac, 'illegal', ac.currentTime + 0.005)
  },
  gameStart() {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.01
      tone(ac, t, 659.25, 0.18, 0.12, 'sine')
      tone(ac, t + 0.12, 987.77, 0.26, 0.12, 'sine')
    }
  },
  gameEnd() {
    const ac = audio()
    if (ac) {
      const t = ac.currentTime + 0.01
      tone(ac, t, 783.99, 0.2, 0.12, 'sine')
      tone(ac, t + 0.14, 523.25, 0.34, 0.12, 'sine')
    }
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
