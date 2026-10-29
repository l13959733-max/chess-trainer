// Gamification: XP, levels, daily streak and daily goal. Pure functions, stored per day in IndexedDB.

export interface DayActivity {
  date: string // local date, YYYY-MM-DD
  lines: number // completed drills
  puzzles: number // solved blunder puzzles (step 4)
  xp: number
}

export interface Goal {
  lines: number
  puzzles: number
}

export const DEFAULT_GOAL: Goal = { lines: 10, puzzles: 10 }

// Blunder puzzles exist since step 4 and count towards the daily goal.
export const PUZZLES_AVAILABLE = true

export const XP = { learnLine: 5, drillBase: 10, flawlessBonus: 10, oneMistakeBonus: 5, puzzleBase: 10, puzzleFirstTry: 5 }

export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d - 1))
}

export function xpForDrill(mistakes: number): number {
  return XP.drillBase + (mistakes === 0 ? XP.flawlessBonus : mistakes === 1 ? XP.oneMistakeBonus : 0)
}

export function xpForPuzzle(mistakes: number): number {
  return XP.puzzleBase + (mistakes === 0 ? XP.puzzleFirstTry : 0)
}

// Level L starts at 50·L·(L−1) XP: 0, 100, 300, 600, 1000 …
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export function levelInfo(totalXp: number) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  const start = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, into: totalXp - start, needed: next - start }
}

function active(day: DayActivity | undefined): boolean {
  return !!day && day.lines + day.puzzles > 0
}

// Consecutive active days up to today. A streak stays alive until today ends,
// so if today has no activity yet, it counts back from yesterday.
export function streak(days: Map<string, DayActivity>, today: string): number {
  let key = active(days.get(today)) ? today : prevDay(today)
  let count = 0
  while (active(days.get(key))) {
    count++
    key = prevDay(key)
  }
  return count
}

export function goalReached(day: DayActivity | undefined, goal: Goal): boolean {
  if (!day) return false
  return day.lines >= goal.lines && (!PUZZLES_AVAILABLE || day.puzzles >= goal.puzzles)
}

export function addToDay(day: DayActivity | undefined, date: string, delta: Partial<Omit<DayActivity, 'date'>>): DayActivity {
  const base = day ?? { date, lines: 0, puzzles: 0, xp: 0 }
  return {
    date,
    lines: base.lines + (delta.lines ?? 0),
    puzzles: base.puzzles + (delta.puzzles ?? 0),
    xp: base.xp + (delta.xp ?? 0),
  }
}
