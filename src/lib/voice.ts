// Reads explanations aloud in Lu's cloned voice. Order: clips already saved on this device,
// then the voice changer on the Mac (XTTS, via the tunnel), and the phone's own voice only when
// neither has the sentence. Every clip that comes from the Mac is saved, so the cloned voice
// becomes the standard voice on this device, also when the Mac is off.
import { getClip, getClipKeys, getVoiceSettings, putClip, putVoiceSettings, type VoiceSettings } from './db'
import { pickVoice } from './voicePick'

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
function unlock(): HTMLAudioElement {
  if (!player) {
    player = new Audio()
    player.src = silentWav()
    player.play().catch(() => {})
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

// A clip saved on this device, as a playable URL
async function savedClip(text: string): Promise<string | null> {
  try {
    const c = await getClip(clipKey(text))
    return c ? URL.createObjectURL(c.blob) : null
  } catch {
    return null
  }
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
  if (!settings.serverUrl || !text) return
  savedClip(text).then((url) => {
    if (url) URL.revokeObjectURL(url)
    else {
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
  phase: 'idle' | 'loading' | 'playing'
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
  const saved = await savedClip(text)
  if (saved && id === run) {
    try {
      await playClip(saved, text)
      return
    } catch {
      // fall through to the Mac or the phone voice
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
  if (id === run) set({ text: '', phase: 'idle' })
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
  if (now.phase === 'idle') pump()
}

// How many of the given sentences are saved on this device in the cloned voice
export async function savedCount(texts: string[]): Promise<number> {
  await loaded
  try {
    const keys = await getClipKeys()
    return texts.filter((t) => keys.has(clipKey(t))).length
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
  let saved = texts.filter((t) => keys.has(clipKey(t))).length
  onProgress(saved)
  for (const text of texts) {
    if (cancelled()) return
    if (keys.has(clipKey(text))) continue
    const url = await fetchClone(text, false)
    URL.revokeObjectURL(url)
    saved++
    onProgress(saved)
  }
}
