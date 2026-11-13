// Today's path in Training (Lu, 13.11.: "Duolingo-Pfad + Candy-Crush-Level mit Sternen", draft
// https://claude.ai/artifact/HWhR59MBvsBsqwobpMAcrA). One plan per day, built the first time Training opens,
// so the levels do not move while you play. A level is done once its result is stored for today.
//
// Stars (Lu's rule, 13.11.): ★ done · ★★ first try · ★★★ first try and checked the threat / played carefully.
// Where a screen knows nothing about threats (lines, puzzles) ★★★ = no mistake at all.
import { dateKey } from './progress'

export type LevelKind = 'lines' | 'lesson' | 'mistake' | 'threat' | 'rush' | 'lost' | 'treasure' | 'boss'

export interface Level {
  key: string // what a result is stored under, e.g. 'threat', 'mistake:<puzzle id>', 'boss:rome'
  kind: LevelKind
  title: string
  route: string
  red?: boolean // a mistake from your own chess.com game
  icon?: string // treasure and boss show an icon instead of a number and stars
}

export interface DayPlan {
  date: string
  levels: Level[]
}

export interface PlanInput {
  date: string
  linesDue: number
  lesson?: { id: string; title: string; route: string }
  mistakes: { id: string; title: string }[] // own chess.com mistakes, most important first
  lostDue: number // other mistakes that are due (games against Hoppy-Bot)
  treasure?: string // a winning position to play out
  boss?: { city: string; name: string }
}

export const RED_PER_DAY = 2

export function buildPlan(p: PlanInput): DayPlan {
  const red = p.mistakes.slice(0, RED_PER_DAY).map<Level>((m) => ({ key: 'mistake:' + m.id, kind: 'mistake', title: 'Your game', route: 'mistake/' + encodeURIComponent(m.id), red: true }))
  const levels: Level[] = []
  if (p.linesDue > 0) levels.push({ key: 'lines', kind: 'lines', title: 'Due lines', route: 'review' })
  if (p.lesson) levels.push({ key: 'lesson:' + p.lesson.id, kind: 'lesson', title: 'Lesson', route: p.lesson.route })
  if (red[0]) levels.push(red[0])
  else if (p.lostDue > 0) levels.push({ key: 'lost', kind: 'lost', title: 'Lost battle', route: 'puzzles' })
  levels.push({ key: 'threat', kind: 'threat', title: 'Threat Check', route: 'threat-check' })
  if (red[1]) levels.push(red[1])
  levels.push({ key: 'rush', kind: 'rush', title: 'Square Rush', route: 'rush' })
  if (p.treasure) levels.push({ key: 'treasure', kind: 'treasure', title: 'Treasure', route: 'play/puzzle/' + encodeURIComponent(p.treasure), icon: '🎁' })
  if (p.boss) levels.push({ key: 'boss:' + p.boss.city, kind: 'boss', title: 'Boss', route: `king/${p.boss.city}/boss`, icon: '👑' })
  return { date: p.date, levels }
}

// After the chess.com check: put today's red levels into a plan that has none yet
export function addRed(plan: DayPlan, mistakes: { id: string; title: string }[]): DayPlan {
  if (plan.levels.some((l) => l.red) || !mistakes.length) return plan
  const red = mistakes.slice(0, RED_PER_DAY).map<Level>((m) => ({ key: 'mistake:' + m.id, kind: 'mistake', title: 'Your game', route: 'mistake/' + encodeURIComponent(m.id), red: true }))
  const levels = plan.levels.filter((l) => l.kind !== 'lost')
  const threat = levels.findIndex((l) => l.kind === 'threat')
  const at = threat < 0 ? levels.length : threat
  levels.splice(at, 0, red[0])
  if (red[1]) levels.splice(at + 2, 0, red[1])
  return { ...plan, levels }
}

export interface LevelView extends Level {
  n: number
  stars: number | null // null = not done yet
  now: boolean // the next level to play
  lock: boolean
}

// Levels in order; the first one not done is "now", the ones after it wait (Lu: a clear path)
export function viewPlan(plan: DayPlan, done: Record<string, number>): LevelView[] {
  let found = false
  return plan.levels.map((l, i) => {
    const stars = l.key in done ? done[l.key] : null
    const now = stars === null && !found
    if (now) found = true
    return { ...l, n: i + 1, stars, now, lock: stars === null && !now }
  })
}

export const starsFromMistakes = (m: number) => (m === 0 ? 3 : m === 1 ? 2 : 1)

// ---------- stored per day on this device ----------

const PLAN_KEY = 'hoppy-path'
const RES_KEY = 'hoppy-path-results'
const SEEN_KEY = 'hoppy-path-seen'

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // not saved; the path rebuilds tomorrow anyway
  }
}

export const today = () => dateKey(new Date())

export function loadPlan(date = today()): DayPlan | null {
  const p = read<DayPlan | null>(PLAN_KEY, null)
  return p && p.date === date ? p : null
}
export const savePlan = (p: DayPlan) => write(PLAN_KEY, p)

// Results of today: level key -> stars (the best try counts)
export function loadResults(date = today()): Record<string, number> {
  const r = read<{ date: string; stars: Record<string, number> } | null>(RES_KEY, null)
  return r && r.date === date ? r.stars : {}
}
export function report(key: string, stars: number, date = today()) {
  if (stars < 1) return
  const cur = loadResults(date)
  write(RES_KEY, { date, stars: { ...cur, [key]: Math.max(cur[key] ?? 0, Math.min(3, stars)) } })
}

// Levels whose win was already celebrated on the Training page
export function loadSeen(date = today()): string[] {
  const s = read<{ date: string; keys: string[] } | null>(SEEN_KEY, null)
  return s && s.date === date ? s.keys : []
}
export const saveSeen = (keys: string[], date = today()) => write(SEEN_KEY, { date, keys })

// Safe moves (BAUPLAN 16): moves that lose less than 2 pawns. The analysis stores the plies and the big
// mistakes of every game (same 2-pawn limit), so this is 1 − mistakes / own moves.
export function safeShare(records: { plies: number; blunders: number }[]): number | null {
  const moves = records.reduce((s, r) => s + Math.ceil(r.plies / 2), 0)
  if (!moves) return null
  const bad = records.reduce((s, r) => s + r.blunders, 0)
  return Math.max(0, Math.min(1, 1 - bad / moves))
}

// The longest run of active days (for "Best: N days")
export function longestStreak(dates: string[]): number {
  const days = [...new Set(dates)].map((d) => {
    const [y, m, dd] = d.split('-').map(Number)
    return Math.round(Date.UTC(y, m - 1, dd) / 86_400_000)
  }).sort((a, b) => a - b)
  let best = 0
  let run = 0
  days.forEach((d, i) => {
    run = i && d === days[i - 1] + 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}
