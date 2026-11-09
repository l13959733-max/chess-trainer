// Daily Threat Check: one puzzle a day, the same on every phone (chosen by the date – no server).
// You have just moved: play the move your opponent threatens now. One try, and a result to share without spoilers.
import PUZZLES from '../data/lichess-puzzles.json'

export interface DailyPuzzle {
  id: string
  fen: string
  moves: string[] // UCI: your move, then your opponent's threat
  rating: number
}

// Day 1 is the day it started (9 November 2026), counted in local days like Wordle
const START = Date.UTC(2026, 10, 9)
export function dayNumber(now = new Date()): number {
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - START) / 86_400_000) + 1
}

// Mixed themes, from the middle of each list (sorted by rating): the stations use the easy start,
// the Armoury the first 18. Some puzzles carry two themes – each comes only once (about 110 days).
const THEMES = ['hanging', 'fork', 'mate1', 'pin', 'backrank', 'skewer', 'discovered']
const FROM = 18
const SPAN = 16
export const POOL: DailyPuzzle[] = []
for (let i = FROM; i < FROM + SPAN; i++) {
  for (const t of THEMES) {
    const p = (PUZZLES as Record<string, DailyPuzzle[]>)[t][i]
    if (!POOL.some((q) => q.id === p.id)) POOL.push(p)
  }
}
export function dailyPuzzle(day: number): DailyPuzzle {
  return POOL[Math.max(0, day - 1) % POOL.length]
}

export interface DailyResult {
  ok: boolean
  secs: number
}
const KEY = 'chess-trainer-threatcheck'
export function loadResults(): Record<string, DailyResult> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
export function saveResult(day: number, r: DailyResult) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadResults(), [day]: r }))
  } catch {
    // storage blocked: the result just isn't kept
  }
}

// Spoiler-free: how fast, never which move or which theme
export function squares(r: DailyResult): string {
  if (!r.ok) return '🟥'
  return r.secs <= 10 ? '🟩🟩🟩' : r.secs <= 30 ? '🟩🟩⬜' : '🟩⬜⬜'
}
export function shareText(day: number, r: DailyResult, link: string): string {
  const line = r.ok ? `${squares(r)} spotted in ${r.secs} s` : `${squares(r)} the Shadow got me`
  return `Hoppy · Daily Threat Check #${day}\n${line}\nCan you spot it? ${link}`
}
