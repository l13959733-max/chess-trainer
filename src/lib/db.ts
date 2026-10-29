import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Side } from './pgn'
import type { DayActivity, Goal } from './progress'
import type { SrsState } from './srs'

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
  settings: { key: string; value: Goal }
}

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null

function db() {
  dbPromise ??= openDB<TrainerDB>('chess-trainer', 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('srs', { keyPath: 'lineId' })
        d.createObjectStore('imports', { keyPath: 'id', autoIncrement: true })
      }
      if (oldVersion < 2) {
        d.createObjectStore('activity', { keyPath: 'date' })
        d.createObjectStore('settings')
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
  return (await db()).get('settings', 'goal')
}

export async function putGoal(goal: Goal): Promise<void> {
  await (await db()).put('settings', goal, 'goal')
}
