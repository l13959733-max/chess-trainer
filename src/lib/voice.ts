// Reads explanations aloud. Since 31.10.2026 (Lu's decision) the phone's standard female English voice
// reads everything. The cloned-voice path below stays switchable via CLONE_VOICE: clips saved on this
// device, then the voice changer on the Mac (XTTS, via the tunnel), the phone's voice as fallback.
import { getClip, getClipKeys, getVoiceSettings, putClip, putVoiceSettings, type VoiceSettings } from './db'
import { pickVoice } from './voicePick'

export type VoiceSource = 'clone' | 'phone'

export const CLONE_VOICE = false

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

// Addresses a voice link may set: the Mac's tunnel, or the Mac itself for local tests.
export function isAllowedVoiceUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:' && u.hostname.endsWith('.trycloudflare.com')) return true
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

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

// iOS only lets a page play audio it started during a tap. Playing a silent clip (and an empty
// utterance) on the first tap unlocks both players, so explanations can later start by themselves.
// iOS only counts the end of a tap (touchend/click) as permission, not the first touch, so this
// is retried on every tap until a play() actually succeeds.
let unlocked = false

export function isUnlocked() {
  return unlocked
}

function unlock(): HTMLAudioElement {
  if (!player) player = new Audio()
  if (!unlocked) {
    player.src = silentWav()
    player
      .play()
      .then(() => {
        unlocked = true
      })
      .catch(() => {})
    try {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis?.speak(u)
    } catch {
      // no speech synthesis
    }
  }
  return player
}

export function unlockAudio() {
  unlock()
}

function clipKey(text: string, voice = settings.voiceName) {
  return `${voice}|${text}`
}

// Clips published with the app (public/voice, built by scripts/build-voice.mjs): everyone who opens
// the app hears Lu's voice for these sentences without the Mac.
type Manifest = { voice: string; clips: Record<string, string> }
let manifest: Promise<Manifest | null> | null = null

function bundled(): Promise<Manifest | null> {
  manifest ??= fetch(`${import.meta.env.BASE_URL}voice/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null)
  return manifest
}

// A clip on this device or shipped with the app, as a playable URL
async function savedClip(text: string): Promise<string | null> {
  try {
    const c = await getClip(clipKey(text))
    if (c) return URL.createObjectURL(c.blob)
  } catch {
    // no local storage: try the bundled clips
  }
  const m = await bundled()
  const file = m && m.voice === settings.voiceName ? m.clips[text] : undefined
  return file ? `${import.meta.env.BASE_URL}voice/${file}` : null
}

async function request(text: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    // fmt=share = m4a/AAC: about ten times smaller than WAV, plays on iPhone and Android
    const res = await fetch(`${settings.serverUrl}/speak?fmt=share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'en', voice: settings.voiceName }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`voice server answered ${res.status}`)
    const blob = await res.blob()
    putClip({ key: clipKey(text), voice: settings.voiceName, text, blob, savedAt: Date.now() }).catch(() => {})
    return URL.createObjectURL(blob)
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
          resolve((await savedClip(text)) ?? (await request(text)))
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
  if (!CLONE_VOICE || !settings.serverUrl || !text) return
  savedClip(text).then((url) => {
    if (url) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    } else {
      wanted = text
      fetchClone(text, true).catch(() => {})
    }
  })
}

function speakPhone(text: string): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth) return resolve()
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    const nice = pickVoice(synth.getVoices())
    if (nice) u.voice = nice
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
  })
}

// What is being read right now, so every Listen button can show the right state.
export interface Playback {
  text: string
  phase: 'idle' | 'loading' | 'playing' | 'blocked' // blocked = the phone wants a tap before playing sound
  source?: VoiceSource
}

let now: Playback = { text: '', phase: 'idle' }
const listeners = new Set<(p: Playback) => void>()
let queue: string[] = []
let run = 0

function set(p: Playback) {
  now = p
  listeners.forEach((l) => l(p))
}

export function onPlayback(fn: (p: Playback) => void): () => void {
  listeners.add(fn)
  fn(now)
  return () => listeners.delete(fn)
}

async function playClip(url: string, text: string) {
  const audio = unlock()
  set({ text, phase: 'playing', source: 'clone' })
  audio.src = url
  await audio.play()
  await new Promise<void>((r) => {
    audio.onended = () => r()
    audio.onpause = () => r()
  })
}

async function playOne(text: string, id: number) {
  set({ text, phase: 'loading' })
  await loaded
  if (!CLONE_VOICE) {
    set({ text, phase: 'playing', source: 'phone' })
    await speakPhone(text)
    return
  }
  const saved = await savedClip(text)
  if (saved && id === run) {
    try {
      await playClip(saved, text)
      return
    } catch (e) {
      // The phone refused to play without a tap: wait for one instead of switching to the phone voice
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        queue = []
        set({ text, phase: 'blocked' })
        return
      }
    }
  }
  if (id !== run) return
  if (settings.serverUrl) {
    try {
      wanted = text
      const url = await fetchClone(text, false)
      if (id !== run) return
      await playClip(url, text)
      return
    } catch {
      if (id !== run) return
      // Mac off, tunnel gone or playback refused → phone voice
    }
  }
  set({ text, phase: 'playing', source: 'phone' })
  await speakPhone(text)
}

async function pump() {
  const id = ++run
  while (queue.length && id === run) await playOne(queue.shift()!, id)
  if (id === run && now.phase !== 'blocked') set({ text: '', phase: 'idle' })
}

export function stop() {
  run++
  queue = []
  player?.pause()
  window.speechSynthesis?.cancel()
  set({ text: '', phase: 'idle' })
}

// Tapped Listen: read this now, dropping anything queued.
export function speakNow(text: string) {
  stop()
  unlock()
  queue = [text]
  pump()
}

// Automatic reading: queue behind what is playing, so explanations aren't cut off.
export function enqueue(text: string) {
  if (!text || now.text === text || queue.includes(text)) return
  queue.push(text)
  if (now.phase === 'idle' || now.phase === 'blocked') pump()
}

// How many of the given sentences are saved on this device in the cloned voice
export async function savedCount(texts: string[]): Promise<number> {
  await loaded
  try {
    const keys = await getClipKeys().catch(() => new Set<string>())
    const m = await bundled()
    const shipped = m && m.voice === settings.voiceName ? m.clips : {}
    return texts.filter((t) => keys.has(clipKey(t)) || shipped[t]).length
  } catch {
    return 0
  }
}

// Fetch every missing sentence from the Mac and keep it on this device. Runs one sentence at a time;
// `onProgress` reports the saved count, `cancelled` stops after the current sentence.
export async function saveAll(texts: string[], onProgress: (saved: number) => void, cancelled: () => boolean): Promise<void> {
  await loaded
  if (!settings.serverUrl) throw new Error('No voice changer address yet')
  try {
    await navigator.storage?.persist?.()
  } catch {
    // the browser may still keep the data; persist() only makes eviction less likely
  }
  const keys = await getClipKeys()
  const m = await bundled()
  const shipped = m && m.voice === settings.voiceName ? m.clips : {}
  const have = (t: string) => keys.has(clipKey(t)) || !!shipped[t]
  let saved = texts.filter(have).length
  onProgress(saved)
  for (const text of texts) {
    if (cancelled()) return
    if (have(text)) continue
    const url = await fetchClone(text, false)
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    saved++
    onProgress(saved)
  }
}
