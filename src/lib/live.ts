import { Chess } from 'chess.js'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getPlayer } from './chesscom'
import { getName } from './profile'

// Watching each other and playing for each other. The app has no server, so moves travel through two
// public MQTT brokers (either one may be down). Everything is encrypted with a key derived from the
// invite code, so the brokers only see noise and strangers can neither read nor change a game.
// A game's latest state stays on the broker ("retained"), so a game someone left can still be continued.

export interface LiveGame {
  id: string
  title: string
  startFen: string
  moves: string[] // UCI
  me: 'w' | 'b'
  botRating: number
  rated: boolean
  resigned?: boolean
  helped?: number[] // plies played by someone else: not the owner's mistakes
}

export interface LiveState {
  owner: string // device whose game this is
  ownerName: string
  driver: string // device that plays right now and runs the bot
  driverName: string
  rev: number
  ts: number
  game: LiveGame
}

const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt']
const ROOM_KEY = 'chess-trainer-room'
const DEVICE_KEY = 'chess-trainer-device'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I
const LIVE_FOR = 75_000 // ms without a sign of life: the player has left
const BEAT = 30_000
const FORGET_AFTER = 24 * 3600_000

// --- pure parts ---

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
  return chars.match(/.{4}/g)!.join('-')
}

// Null unless it is a full code – pasted codes often come with spaces or lowercase
export function normalizeCode(text: string): string | null {
  const chars = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (chars.length !== 16 || [...chars].some((c) => !CODE_CHARS.includes(c))) return null
  return chars.match(/.{4}/g)!.join('-')
}

async function sha256(text: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

export async function roomTopic(code: string): Promise<string> {
  const hash = await sha256('hoppy-topic:' + code)
  return 'hoppy/' + Array.from(hash.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function roomKey(code: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', await sha256('hoppy-key:' + code), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function seal(code: string, state: LiveState): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await roomKey(code), new TextEncoder().encode(JSON.stringify(state)))
  const out = new Uint8Array(12 + data.byteLength)
  out.set(iv)
  out.set(new Uint8Array(data), 12)
  return out
}

// Null for anything not sealed with this room's code
export async function unseal(code: string, bytes: Uint8Array): Promise<LiveState | null> {
  try {
    const copy = new Uint8Array(bytes)
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: copy.slice(0, 12) }, await roomKey(code), copy.slice(12))
    return JSON.parse(new TextDecoder().decode(data)) as LiveState
  } catch {
    return null
  }
}

// Both devices must end up with the same state, also when they act at the same moment
export function isNewer(current: LiveState | undefined, next: LiveState): boolean {
  if (!current) return true
  if (current.game.id !== next.game.id) return next.ts > current.ts
  if (next.rev !== current.rev) return next.rev > current.rev
  if (next.driver !== current.driver) return next.driver > current.driver
  return next.ts > current.ts
}

// New plies played on someone else's behalf; taken-back ones are forgotten
export function withHelp(before: LiveGame, after: LiveGame): LiveGame {
  const helped = (before.helped ?? []).filter((p) => p < after.moves.length)
  for (let p = before.moves.length; p < after.moves.length; p++) helped.push(p)
  return { ...after, helped, rated: false }
}

export function replay(game: Pick<LiveGame, 'startFen' | 'moves'>) {
  const c = new Chess(game.startFen)
  for (const uci of game.moves) c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  return c
}

export function isOver(game: LiveGame): boolean {
  return !!game.resigned || replay(game).isGameOver()
}

export function isPlayingNow(state: LiveState, now = Date.now()): boolean {
  return now - state.ts < LIVE_FOR
}

// --- this device ---

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // private mode: forgotten when the app closes
  }
}

let device: string | null = null
export function deviceId(): string {
  device ??= read(DEVICE_KEY)
  if (!device) {
    device = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')
    write(DEVICE_KEY, device)
  }
  return device
}

// --- connection ---

type Client = import('mqtt').MqttClient

export interface Live {
  room: string | null
  connected: boolean
  states: LiveState[]
}

let room = read(ROOM_KEY)
let clients: Client[] = []
let topic: string | null = null
let generation = 0 // a change of room makes everything still on its way irrelevant
const states = new Map<string, LiveState>()
const listeners = new Set<() => void>()
let snapshot: Live = { room, connected: false, states: [] }

function changed() {
  snapshot = { room, connected: clients.some((c) => c.connected), states: [...states.values()] }
  listeners.forEach((l) => l())
}

async function onMessage(gen: number, code: string, owner: string, payload: Uint8Array) {
  if (!payload.length) {
    if (gen === generation && states.delete(owner)) changed()
    return
  }
  const state = await unseal(code, payload)
  if (gen !== generation || !state || state.owner !== owner) return
  if (isNewer(states.get(owner), state)) {
    states.set(owner, state)
    changed()
  }
}

export async function startLive(): Promise<void> {
  if (!room || clients.length) return
  const code = room
  const gen = ++generation
  const [{ default: mqtt }, prefix] = await Promise.all([import('mqtt'), roomTopic(code)])
  if (gen !== generation) return
  topic = prefix
  clients = BROKERS.map((url) => {
    const client = mqtt.connect(url, { connectTimeout: 8000, reconnectPeriod: 3000 })
    client.on('connect', () => {
      client.subscribe(`${prefix}/g/+`, { qos: 1 })
      changed()
    })
    client.on('close', changed)
    client.on('error', () => {}) // it keeps reconnecting; the screen shows "Connecting"
    client.on('message', (t, payload) => void onMessage(gen, code, t.split('/').pop()!, payload))
    return client
  })
}

function send(state: LiveState) {
  const code = room
  if (!code || !topic) return
  const to = `${topic}/g/${state.owner}`
  const targets = clients
  void seal(code, state).then((bytes) => {
    for (const c of targets) c.publish(to, bytes as Buffer, { retain: true, qos: 1 })
  })
}

export function joinRoom(code: string) {
  if (room === code) return
  leaveRoom()
  room = code
  write(ROOM_KEY, code)
  changed()
  void startLive()
}

export function leaveRoom() {
  const to = topic && `${topic}/g/${deviceId()}`
  const closing = clients
  generation++
  // My game disappears from the room for the others too
  for (const c of closing) {
    if (to) c.publish(to, '', { retain: true, qos: 1 }, () => c.end())
    else c.end()
  }
  clients = []
  topic = null
  room = null
  states.clear()
  write(ROOM_KEY, null)
  changed()
}

// Publish a game: every move, and also taking over (the device calling this plays from now on)
export function shareGame(owner: string, game: LiveGame) {
  if (!room) return
  const prev = states.get(owner)
  const same = prev?.game.id === game.id
  const name = getName() ?? getPlayer()
  const state: LiveState = {
    owner,
    ownerName: same ? prev.ownerName : name,
    driver: deviceId(),
    driverName: name,
    rev: (same ? prev.rev : 0) + 1,
    ts: Date.now(),
    game,
  }
  states.set(owner, state)
  changed()
  send(state)
}

export function liveStateOf(owner: string): LiveState | undefined {
  return states.get(owner)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// The current connection and games; re-renders when something arrives and when players go quiet
export function useLive(): Live {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 20_000)
    return () => window.clearInterval(t)
  }, [])
  return useSyncExternalStore(subscribe, () => snapshot)
}

// Games of the others worth showing: unfinished and not ancient
export function othersGames(live: Live, now = Date.now()): LiveState[] {
  return live.states
    .filter((s) => s.owner !== deviceId() && now - s.ts < FORGET_AFTER && !isOver(s.game))
    .sort((a, b) => b.ts - a.ts)
}

// While this device plays a game, it tells the others so every now and then
export function useBeat(owner: string | null, active: boolean) {
  useEffect(() => {
    if (!owner || !active) return
    const t = window.setInterval(() => {
      const s = states.get(owner)
      if (!s || s.driver !== deviceId() || isOver(s.game)) return
      const next = { ...s, ts: Date.now() }
      states.set(owner, next)
      send(next)
    }, BEAT)
    return () => window.clearInterval(t)
  }, [owner, active])
}
