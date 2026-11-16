// Shared feeling of the rush games (Square Rush, Puzzle Rush): sounds made in the browser (no files), vibration
// (Android – iPhone Safari cannot), confetti on a canvas, and the record bookkeeping (BAUPLAN 34, Lu 16.11.:
// "Highscore mit Belohnung … dass der neue Rekord gefeiert wird und man versucht, sich zu übertreffen").

export const SCALE = [392, 440, 523, 587, 659, 784, 880, 1047]

export function buzz(p: number | number[]) {
  try {
    navigator.vibrate?.(p)
  } catch {
    // no vibration on this phone (iPhone)
  }
}

// ---------- sound ----------
let ac: AudioContext | null = null
export function audio(): AudioContext | null {
  if (!ac) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ac = new AC()
    } catch {
      ac = null
    }
  }
  if (ac?.state === 'suspended') void ac.resume()
  return ac
}
export function tone(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, rise = 1.5) {
  const a = audio()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  const t = a.currentTime + t0
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * rise, t + dur * 0.6)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}
function noise(dur: number, cutoff: number, vol: number) {
  const a = audio()
  if (!a) return
  const n = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3)
  const s = a.createBufferSource()
  const f = a.createBiquadFilter()
  const g = a.createGain()
  s.buffer = buf
  f.type = 'lowpass'
  f.frequency.value = cutoff
  g.gain.value = vol
  s.connect(f).connect(g).connect(a.destination)
  s.start()
}
// three in a row: a bang and a rising chord
export function boom() {
  noise(0.5, 900, 0.5)
  ;[523, 659, 784, 1047].forEach((fr, i) => tone(fr, 0.05 + i * 0.07, 0.35, 'triangle', 0.18))
}
export const step = (streak: number) => tone(SCALE[Math.min(streak - 1, SCALE.length - 1)], 0, 0.18, 'sine', 0.3)
export const wrong = () => tone(140, 0, 0.25, 'square', 0.12)
// passing your best in the middle of a run: one bright "ding", once
export function ding() {
  tone(1568, 0, 0.12, 'sine', 0.22, 1)
  tone(2093, 0.09, 0.3, 'sine', 0.2, 1)
}
// the new record: a fanfare – short rising notes, then a held major chord, a drum under it
export function fanfare() {
  noise(0.7, 700, 0.45)
  ;[523, 523, 659, 784].forEach((fr, i) => tone(fr, i * 0.13, 0.16, 'triangle', 0.22, 1))
  ;[523, 659, 784, 1047].forEach((fr) => tone(fr, 0.55, 1.1, 'triangle', 0.14, 1))
  tone(1568, 0.55, 1.1, 'sine', 0.06, 1)
}
// going back in a line (Strict drill): a short falling sweep
export function rewindSound() {
  tone(880, 0, 0.28, 'sawtooth', 0.06, 0.35)
}

// ---------- confetti ----------
interface Part {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  c: string
  sq: boolean
}
const BIG = ['#f5b82e', '#8a5cf6', '#58cc02', '#ff4b4b', '#4fc3f7', '#fff']
const SMALL = ['#f5b82e', '#fff', '#58cc02']
// one confetti machine per canvas; burst(x, y) in CSS pixels of the canvas
export function confetti(get: () => HTMLCanvasElement | null) {
  let parts: Part[] = []
  let raf = 0
  function tick() {
    const c = get()
    const ctx = c?.getContext('2d')
    if (!c || !ctx) {
      raf = 0
      return
    }
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.clientWidth, c.clientHeight)
    parts = parts.filter((p) => p.life > 0)
    for (const p of parts) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.22
      p.vx *= 0.985
      p.life -= 0.02
      ctx.globalAlpha = Math.max(p.life, 0)
      ctx.fillStyle = p.c
      if (p.sq) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.life * 8)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, 7)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    raf = parts.length ? requestAnimationFrame(tick) : 0
  }
  return {
    burst(x: number, y: number, n: number, big: boolean) {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      const c = get()
      if (!c) return
      const dpr = window.devicePixelRatio || 1
      if (c.width !== c.clientWidth * dpr) {
        c.width = c.clientWidth * dpr
        c.height = c.clientHeight * dpr
      }
      const cols = big ? BIG : SMALL
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = (big ? 4 : 2.4) + Math.random() * (big ? 7 : 3.5)
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (big ? 2 : 1), life: 1, size: (big ? 5 : 3.5) + Math.random() * 4, c: cols[i % cols.length], sq: Math.random() < 0.5 })
      }
      if (!raf) raf = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
      parts = []
    },
  }
}

// ---------- records ----------
export interface TopRun {
  score: number
  at: number // ms
}
export const TOP_N = 5
// a new record only when there was a best before (the first run is no record – just stars)
export const isRecord = (score: number, best: number) => best > 0 && score > best
// the 5 best runs, best first; equal scores keep the older one first
export function addTop(top: TopRun[], run: TopRun, n = TOP_N): TopRun[] {
  if (run.score <= 0) return top
  return [...top, run].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, n)
}
export function loadTop(key: string): TopRun[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
export function saveTop(key: string, top: TopRun[]) {
  try {
    localStorage.setItem(key, JSON.stringify(top))
  } catch {
    // not remembered
  }
}
