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

// An opening line someone is practising (Drill). The whole picture is in the message, so it also works for
// lines the others do not have (imported ones). The others may move too: their move goes to the owner's
// device (DrillMove), which checks it like its own and publishes the result.
export interface LiveDrill {
  owner: string
  ownerName: string
  rev: number
  ts: number
  title: string
  side: 'w' | 'b'
  fen: string
  last?: { from: string; to: string }
  ply: number
  total: number
  mistakes: number
  wrong?: { tried: { from: string; to: string }; san: string; from: string; to: string; comment?: string; by?: Mover }
  note?: { label: string; comment: string }
  lastBy?: Mover & { san: string } // the last move of the learner's side, if someone else played it
  done: boolean
}

export interface Mover {
  id: string
  name: string
}

// "I am here": every phone with the app open says so every now and then
export interface Presence {
  owner: string
  name: string
  ts: number
}

// A move someone else plays in the owner's drill
export interface DrillMove {
  owner: string
  ply: number
  from: string
  to: string
  by: Mover
  id: string
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

export async function seal(code: string, state: LiveState | LiveDrill | DrillMove | Presence): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await roomKey(code), new TextEncoder().encode(JSON.stringify(state)))
  const out = new Uint8Array(12 + data.byteLength)
  out.set(iv)
  out.set(new Uint8Array(data), 12)
  return out
}

// Null for anything not sealed with this room's code
export async function unseal<T = LiveState>(code: string, bytes: Uint8Array): Promise<T | null> {
  try {
    const copy = new Uint8Array(bytes)
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: copy.slice(0, 12) }, await roomKey(code), copy.slice(12))
    return JSON.parse(new TextDecoder().decode(data)) as T
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

// Drills only come from their owner's device, so its own counter decides
export function isNewerDrill(current: LiveDrill | undefined, next: LiveDrill): boolean {
  return !current || next.ts > current.ts || (next.ts === current.ts && next.rev > current.rev)
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
  drills: LiveDrill[]
  online: Presence[]
}

let room = read(ROOM_KEY)
let clients: Client[] = []
let topic: string | null = null
let generation = 0 // a change of room makes everything still on its way irrelevant
const states = new Map<string, LiveState>()
const drills = new Map<string, LiveDrill>()
const presence = new Map<string, Presence>()
const listeners = new Set<() => void>()
let snapshot: Live = { room, connected: false, states: [], drills: [], online: [] }

function changed() {
  snapshot = { room, connected: clients.some((c) => c.connected), states: [...states.values()], drills: [...drills.values()], online: [...presence.values()] }
  listeners.forEach((l) => l())
}

async function onDrill(gen: number, code: string, owner: string, payload: Uint8Array) {
  if (!payload.length) {
    if (gen === generation && drills.delete(owner)) changed()
    return
  }
  const drill = await unseal<LiveDrill>(code, payload)
  if (gen !== generation || !drill || drill.owner !== owner) return
  if (isNewerDrill(drills.get(owner), drill)) {
    drills.set(owner, drill)
    changed()
  }
}

async function onPresence(gen: number, code: string, owner: string, payload: Uint8Array) {
  if (!payload.length) {
    if (gen === generation && presence.delete(owner)) changed()
    return
  }
  const p = await unseal<Presence>(code, payload)
  if (gen !== generation || !p || p.owner !== owner) return
  if (!presence.has(owner) || p.ts > presence.get(owner)!.ts) {
    presence.set(owner, p)
    changed()
  }
}

// Say "I am here" while the app is on the screen, and "gone" when it goes to the background.
// If the phone just drops off, the broker says "gone" for it (last will).
function announce(here: boolean) {
  const code = room
  if (!code || !topic) return
  const to = `${topic}/p/${deviceId()}`
  const targets = clients.filter((c) => c.connected)
  if (!here) {
    for (const c of targets) c.publish(to, '', { retain: true, qos: 1 })
    return
  }
  const me: Presence = { owner: deviceId(), name: getName() ?? getPlayer(), ts: Date.now() }
  void seal(code, me).then((bytes) => {
    for (const c of targets) c.publish(to, bytes as Buffer, { retain: true, qos: 1 })
  })
}

let presenceStarted = false
function startPresence() {
  if (presenceStarted || typeof document === 'undefined') return
  presenceStarted = true
  window.setInterval(() => {
    if (document.visibilityState === 'visible') announce(true)
  }, BEAT)
  document.addEventListener('visibilitychange', () => announce(document.visibilityState === 'visible'))
}

// Moves for my drill. Each one arrives twice (two brokers), so they are counted once by id.
const moveListeners = new Set<(m: DrillMove) => void>()
const seenMoves = new Set<string>()
async function onDrillMove(gen: number, code: string, owner: string, payload: Uint8Array) {
  if (owner !== deviceId() || !payload.length) return
  const move = await unseal<DrillMove>(code, payload)
  if (gen !== generation || !move || move.owner !== owner || seenMoves.has(move.id)) return
  seenMoves.add(move.id)
  moveListeners.forEach((l) => l(move))
}

export function onDrillMoves(listener: (m: DrillMove) => void) {
  moveListeners.add(listener)
  return () => {
    moveListeners.delete(listener)
  }
}

// Play a move in someone else's drill (it counts only if it is still that move's turn when it arrives)
export function sendDrillMove(owner: string, ply: number, from: string, to: string) {
  const code = room
  if (!code || !topic) return
  const move: DrillMove = { owner, ply, from, to, by: { id: deviceId(), name: getName() ?? getPlayer() }, id: crypto.randomUUID() }
  const dest = `${topic}/m/${owner}`
  const targets = clients
  void seal(code, move).then((bytes) => {
    for (const c of targets) c.publish(dest, bytes as Buffer, { qos: 1 })
  })
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
    const will = { topic: `${prefix}/p/${deviceId()}`, payload: '', retain: true, qos: 1 as const }
    const client = mqtt.connect(url, { connectTimeout: 8000, reconnectPeriod: 3000, will })
    client.on('connect', () => {
      client.subscribe([`${prefix}/g/+`, `${prefix}/d/+`, `${prefix}/p/+`, `${prefix}/m/${deviceId()}`], { qos: 1 })
      changed()
      if (document.visibilityState === 'visible') announce(true)
    })
    client.on('close', changed)
    client.on('error', () => {}) // it keeps reconnecting; the screen shows "Connecting"
    client.on('message', (t, payload) => {
      const [kind, owner] = t.split('/').slice(-2)
      void (kind === 'd' ? onDrill : kind === 'm' ? onDrillMove : kind === 'p' ? onPresence : onMessage)(gen, code, owner, payload)
    })
    return client
  })
  startPresence()
}

function send(state: LiveState | LiveDrill) {
  const code = room
  if (!code || !topic) return
  const to = `${topic}/${'game' in state ? 'g' : 'd'}/${state.owner}`
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
  const prefix = topic
  const closing = clients
  generation++
  // My game and my drill disappear from the room for the others too
  for (const c of closing) {
    if (prefix) {
      c.publish(`${prefix}/d/${deviceId()}`, '', { retain: true, qos: 1 })
      c.publish(`${prefix}/p/${deviceId()}`, '', { retain: true, qos: 1 })
      c.publish(`${prefix}/g/${deviceId()}`, '', { retain: true, qos: 1 }, () => c.end())
    } else c.end()
  }
  clients = []
  topic = null
  room = null
  states.clear()
  drills.clear()
  presence.clear()
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

// Show the others the line this device is practising: on every change, and while it waits for a move.
// Null = the drill screen was left.
let drillRev = 0
export function shareDrill(drill: Omit<LiveDrill, 'owner' | 'ownerName' | 'rev' | 'ts'> | null) {
  if (!room) return
  const owner = deviceId()
  if (!drill) {
    if (!drills.delete(owner)) return
    changed()
    if (topic) for (const c of clients) c.publish(`${topic}/d/${owner}`, '', { retain: true, qos: 1 })
    return
  }
  const next: LiveDrill = { ...drill, owner, ownerName: getName() ?? getPlayer(), rev: ++drillRev, ts: Date.now() }
  drills.set(owner, next)
  changed()
  send(next)
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

// The others who have the app open right now
export function othersOnline(live: Live, now = Date.now()): Presence[] {
  return live.online.filter((p) => p.owner !== deviceId() && now - p.ts < LIVE_FOR).sort((a, b) => a.name.localeCompare(b.name))
}

// Lines the others are practising right now
export function othersDrills(live: Live, now = Date.now()): LiveDrill[] {
  return live.drills.filter((d) => d.owner !== deviceId() && now - d.ts < LIVE_FOR).sort((a, b) => b.ts - a.ts)
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
