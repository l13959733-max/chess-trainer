// Reads explanations aloud: Lu's cloned voice from the voice changer on the Mac (XTTS),
// and the phone's built-in voice whenever the Mac is off or the tunnel is down.
import { getVoiceSettings, putVoiceSettings, type VoiceSettings } from './db'

export type VoiceSource = 'clone' | 'phone'

const TIMEOUT_MS = 60_000
const DEFAULT: VoiceSettings = { serverUrl: '', voiceName: 'stimme1' }

let settings: VoiceSettings = DEFAULT
const loaded = getVoiceSettings()
  .then((s) => {
    if (s) settings = s
  })
  .catch(() => {})

const audioCache = new Map<string, Promise<string>>() // text → blob URL
let player: HTMLAudioElement | null = null

export async function loadVoiceSettings(): Promise<VoiceSettings> {
  await loaded
  return settings
}

export async function saveVoiceSettings(v: VoiceSettings): Promise<void> {
  settings = { serverUrl: v.serverUrl.trim().replace(/\/+$/, ''), voiceName: v.voiceName.trim() || DEFAULT.voiceName }
  audioCache.clear()
  await putVoiceSettings(settings)
}

function silentWav(): string {
  const samples = 800
  const buf = new ArrayBuffer(44 + samples * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples * 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

// iOS only lets a page play audio it started during a tap. Playing a silent clip on the
// tap unlocks the shared player, so the cloned voice can still play when it arrives later.
function unlock(): HTMLAudioElement {
  if (!player) {
    player = new Audio()
    player.src = silentWav()
    player.play().catch(() => {})
  }
  return player
}

async function request(text: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${settings.serverUrl}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'en', voice: settings.voiceName }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`voice server answered ${res.status}`)
    return URL.createObjectURL(await res.blob())
  } finally {
    clearTimeout(timer)
  }
}

// XTTS on the Mac handles one sentence at a time reliably, so requests run strictly in order.
let chain: Promise<unknown> = Promise.resolve()
// The explanation currently on screen; queued prefetches for anything else are skipped.
let wanted = ''

function fetchClone(text: string, isPrefetch: boolean): Promise<string> {
  const key = `${settings.serverUrl}|${settings.voiceName}|${text}`
  let job = audioCache.get(key)
  if (!job) {
    job = new Promise<string>((resolve, reject) => {
      chain = chain.then(async () => {
        if (isPrefetch && wanted !== text) return reject(new Error('skipped'))
        try {
          resolve(await request(text))
        } catch (e) {
          reject(e)
        }
      })
    })
    audioCache.set(key, job)
    job.catch(() => audioCache.delete(key))
  }
  return job
}

// Start generating in the background so the audio is ready when Lu taps "Listen".
export function prefetch(text: string) {
  if (!settings.serverUrl || !text) return
  wanted = text
  fetchClone(text, true).catch(() => {})
}

function speakPhone(text: string): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth) return resolve()
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    const en = synth.getVoices().find((v) => v.lang.startsWith('en'))
    if (en) u.voice = en
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
  })
}

export function stop() {
  player?.pause()
  window.speechSynthesis?.cancel()
}

export interface SpeakHandle {
  source: Promise<VoiceSource>
  done: Promise<void>
}

// Must be called from a tap. `source` resolves once it is clear which voice speaks.
export function speak(text: string): SpeakHandle {
  stop()
  const audio = unlock()
  let setSource!: (s: VoiceSource) => void
  const source = new Promise<VoiceSource>((r) => (setSource = r))

  const done = (async () => {
    await loaded
    if (settings.serverUrl) {
      try {
        wanted = text
        const url = await fetchClone(text, false)
        setSource('clone')
        audio.src = url
        await audio.play()
        await new Promise<void>((r) => {
          audio.onended = () => r()
          audio.onpause = () => r()
        })
        return
      } catch {
        // Mac off, tunnel gone or playback refused → phone voice
      }
    }
    setSource('phone')
    await speakPhone(text)
  })()

  return { source, done }
}
