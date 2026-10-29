import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Side } from './pgn'
import type { Blunder, Score } from './blunders'
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

export interface Puzzle extends Blunder {
  id: string // game uuid + ply
  gameUuid: string
  gameUrl: string
  endTime: number
  opponent: string
  myColor: 'w' | 'b'
  scoreBefore: Score
  bestSan: string
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
  settings: { key: string; value: Goal | VoiceSettings }
  games: { key: string; value: GameRecord }
  puzzles: { key: string; value: Puzzle }
  voiceClips: { key: string; value: VoiceClip }
}

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null

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

export async function getAnalyzedGameIds(): Promise<Set<string>> {
  return new Set(await (await db()).getAllKeys('games'))
}

export async function saveAnalyzedGame(game: GameRecord, puzzles: Puzzle[]): Promise<void> {
  const tx = (await db()).transaction(['games', 'puzzles'], 'readwrite')
  await Promise.all([tx.objectStore('games').put(game), ...puzzles.map((p) => tx.objectStore('puzzles').put(p)), tx.done])
}

export async function getPuzzles(): Promise<Puzzle[]> {
  return (await db()).getAll('puzzles')
}

export async function countAnalyzedGames(): Promise<number> {
  return (await db()).count('games')
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
