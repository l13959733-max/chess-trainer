import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Side } from './pgn'
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
}

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null

function db() {
  dbPromise ??= openDB<TrainerDB>('chess-trainer', 1, {
    upgrade(d) {
      d.createObjectStore('srs', { keyPath: 'lineId' })
      d.createObjectStore('imports', { keyPath: 'id', autoIncrement: true })
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
