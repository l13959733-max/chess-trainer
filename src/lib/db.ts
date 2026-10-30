import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Side } from './pgn'
import type { Blunder, Score } from './blunders'
import { ownerOfKey } from './chesscom'
import type { DayActivity, Goal } from './progress'
import type { SrsState } from './srs'

export interface VoiceSettings {
  serverUrl: string // e.g. https://….trycloudflare.com – stays on this device only
  voiceName: string
}

export interface GameRecord {
  uuid: string
  endTime: number
  analyzedAt: number
  plies: number
  blunders: number
}

// Hoppy-Bot rating per chess.com player on this device
export interface BotStats {
  rating: number
  games: number
  wins: number
  draws: number
  losses: number
  history: { t: number; r: number }[]
}

export interface Puzzle extends Blunder {
  id: string // game uuid + ply
  gameUuid: string
  gameUrl: string
  endTime: number
  opponent: string
  myColor: 'w' | 'b'
  scoreBefore: Score
  bestSan: string
  player?: string // chess.com username; missing = Lu (l0o2)
  source?: 'bot' // a game against Hoppy-Bot (no chess.com link)
}

// Explanations in Lu's cloned voice, kept on the device so the voice works without the Mac.
export interface VoiceClip {
  key: string // voice name + text
  voice: string
  text: string
  blob: Blob
  savedAt: number
}

export interface ImportRecord {
  id?: number
  name: string
  pgn: string
  side: Side
  addedAt: number
}

interface TrainerDB extends DBSchema {
  srs: { key: string; value: SrsState }
  imports: { key: number; value: ImportRecord }
  activity: { key: string; value: DayActivity }
  settings: { key: string; value: Goal | VoiceSettings | BotStats }
  games: { key: string; value: GameRecord }
  puzzles: { key: string; value: Puzzle }
  voiceClips: { key: string; value: VoiceClip }
}

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null
let dbBlocked = false

export function isDbBlocked() {
  return dbBlocked
}

function db() {
  dbPromise ??= openDB<TrainerDB>('chess-trainer', 4, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('srs', { keyPath: 'lineId' })
        d.createObjectStore('imports', { keyPath: 'id', autoIncrement: true })
      }
      if (oldVersion < 2) {
        d.createObjectStore('activity', { keyPath: 'date' })
        d.createObjectStore('settings')
      }
      if (oldVersion < 3) {
        d.createObjectStore('games', { keyPath: 'uuid' })
        d.createObjectStore('puzzles', { keyPath: 'id' })
      }
      if (oldVersion < 4) {
        d.createObjectStore('voiceClips', { keyPath: 'key' })
      }
    },
    // A newer version of the app (another tab) needs to upgrade the database: let go and reload into it.
    // Without this, an old tab keeps the database open and the new version waits forever.
    blocking() {
      dbPromise?.then((d) => d.close())
      window.location.reload()
    },
    // This tab is the new version and an old tab still holds the database
    blocked() {
      dbBlocked = true
    },
  })
  return dbPromise
}

export async function getAllSrs(): Promise<SrsState[]> {
  return (await db()).getAll('srs')
}

export async function putSrs(state: SrsState): Promise<void> {
  await (await db()).put('srs', state)
}

export async function getImports(): Promise<ImportRecord[]> {
  return (await db()).getAll('imports')
}

export async function addImport(rec: ImportRecord): Promise<number> {
  return (await db()).add('imports', rec)
}

export async function deleteImport(id: number): Promise<void> {
  await (await db()).delete('imports', id)
}

export async function getActivity(): Promise<DayActivity[]> {
  return (await db()).getAll('activity')
}

export async function putActivity(day: DayActivity): Promise<void> {
  await (await db()).put('activity', day)
}

export async function getGoal(): Promise<Goal | undefined> {
  return (await db()).get('settings', 'goal') as Promise<Goal | undefined>
}

export async function putGoal(goal: Goal): Promise<void> {
  await (await db()).put('settings', goal, 'goal')
}

export async function getVoiceSettings(): Promise<VoiceSettings | undefined> {
  return (await db()).get('settings', 'voice') as Promise<VoiceSettings | undefined>
}

export async function putVoiceSettings(v: VoiceSettings): Promise<void> {
  await (await db()).put('settings', v, 'voice')
}

export async function getBotStats(player: string): Promise<BotStats | undefined> {
  return (await db()).get('settings', 'bot:' + player) as Promise<BotStats | undefined>
}

export async function putBotStats(player: string, s: BotStats): Promise<void> {
  await (await db()).put('settings', s, 'bot:' + player)
}

// Game uuids already analysed for this player
export async function getAnalyzedGameIds(player: string): Promise<Set<string>> {
  const keys = await (await db()).getAllKeys('games')
  return new Set(keys.filter((k) => ownerOfKey(k) === player).map((k) => (k.includes(':') ? k.slice(k.indexOf(':') + 1) : k)))
}

export async function saveAnalyzedGame(game: GameRecord, puzzles: Puzzle[]): Promise<void> {
  const tx = (await db()).transaction(['games', 'puzzles'], 'readwrite')
  await Promise.all([tx.objectStore('games').put(game), ...puzzles.map((p) => tx.objectStore('puzzles').put(p)), tx.done])
}

export async function getPuzzles(): Promise<Puzzle[]> {
  return (await db()).getAll('puzzles')
}

export async function countAnalyzedGames(player: string): Promise<number> {
  return (await getAnalyzedGameIds(player)).size
}

export async function getClip(key: string): Promise<VoiceClip | undefined> {
  return (await db()).get('voiceClips', key)
}

export async function putClip(clip: VoiceClip): Promise<void> {
  await (await db()).put('voiceClips', clip)
}

export async function getClipKeys(): Promise<Set<string>> {
  return new Set(await (await db()).getAllKeys('voiceClips'))
}
