// Today's path, glued to the rest of the app: which levels exist today (from your lines, mistakes, the next city)
// and which are done (results of today plus what the Threat Check, bosses and lessons already store).
// Kept apart from the Training screen so that file only holds components.
import { USERNAME } from './chesscom'
import { clampScore } from './blunders'
import type { Puzzle } from './db'
import { go } from '../hooks/useHashRoute'
import { loadKing } from './king'
import { lessonOf } from './lessons'
import { isDue, type SrsState } from './srs'
import { dayNumber, loadResults as loadThreat } from './threatcheck'
import { loadPlan, loadResults, today, type DayPlan } from './trainingPath'
import { nextCity } from './travel'
import { CATEGORY, phaseOf, type Category, type Phase } from './weakness'
import { TECHNIQUES, isOpen, loadArmoury, medal, type Technique } from './armoury'
import { WORKOUT_SIZE } from './workout'
import type { Line } from './pgn'

export interface PuzzleSets {
  puzzles: Puzzle[]
  due: Puzzle[]
  fresh: Puzzle[]
}

// ---------- coming back to Training after a level ----------
const BACK_KEY = 'hoppy-back-to-training'
export function launch(route: string) {
  try {
    sessionStorage.setItem(BACK_KEY, '1')
  } catch {
    // without it, the level's own back button leads home as before
  }
  go(route)
}
// The level screens lead "home" when they end; after a level from the path, home means Training
export function backToTraining(): string | null {
  try {
    return sessionStorage.getItem(BACK_KEY) ? 'tent' : null
  } catch {
    return null
  }
}
export function forgetBackToTraining() {
  try {
    sessionStorage.removeItem(BACK_KEY)
  } catch {
    // nothing stored
  }
}

// ---------- the plan of today ----------

export const mineOf = (puzzles: Puzzle[], player: string) => puzzles.filter((p) => p.source !== 'bot' && (p.player ?? USERNAME) === player)

// Own chess.com mistakes for the path. Lu, 16.11.: "wenn ich auf Training drücke, soll das Middlegame mit mir
// trainiert werden – oder die Eröffnung, da wo meine Weaknesses sind": the phase where you made most mistakes is
// your weakest; inside it, the kind you make most often. Mistakes from there come first, then due ones, then newest.
export function weakestKind(puzzles: Puzzle[]): Category | undefined {
  const counts = new Map<Category, number>()
  for (const p of puzzles) if (p.category && p.category !== 'other') counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}
export function weakestPhase(puzzles: Puzzle[]): Phase | undefined {
  const counts = new Map<Phase, number>()
  for (const p of puzzles) counts.set(phaseOf(p.fen), (counts.get(phaseOf(p.fen)) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}
export const PHASE_NAME: Record<Phase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' }

export function redCandidates(puzzles: PuzzleSets, player: string) {
  const due = new Set(puzzles.due.map((p) => p.id))
  const fresh = new Set(puzzles.fresh.map((p) => p.id))
  const mine = mineOf(puzzles.puzzles, player)
  const phase = weakestPhase(mine)
  const weak = weakestKind(mine.filter((p) => phaseOf(p.fen) === phase))
  const score = (p: Puzzle) => (phaseOf(p.fen) === phase ? 2 : 0) + (p.category === weak ? 1 : 0)
  return mine
    .filter((p) => due.has(p.id) || fresh.has(p.id))
    .sort((a, b) => score(b) - score(a) || Number(due.has(b.id)) - Number(due.has(a.id)) || b.endTime - a.endTime)
    .map((p) => ({ id: p.id, title: (phase && phaseOf(p.fen) === phase ? PHASE_NAME[phase] + ' · ' : '') + (p.category ? CATEGORY[p.category].title : 'Your game') }))
}

// One exercise for the weakest phase, from what the app already has: middlegame = the Armoury technique that
// belongs to your most frequent kind of mistake there, endgame = the next endgame technique, opening = a round of
// your own opening mistakes. Techniques with gold are done; locked ones are skipped.
export function focusExercise(puzzles: Puzzle[]): { key: string; title: string; route: string } | undefined {
  const phase = weakestPhase(puzzles)
  if (!phase) return undefined
  if (phase === 'opening') return { key: 'focus:phase:opening', title: 'Opening · your opening mistakes', route: 'puzzles/phase/opening' }
  const arm = loadArmoury()
  const free = (t: Technique) => isOpen(t, arm) && medal(arm[t.id]) !== 'gold'
  let t: Technique | undefined
  if (phase === 'endgame') t = TECHNIQUES.find((x) => x.kind === 'end' && free(x))
  else {
    const weak = weakestKind(puzzles.filter((p) => phaseOf(p.fen) === 'middlegame'))
    t = TECHNIQUES.find((x) => x.kind !== 'end' && free(x) && !!weak && !!x.real?.includes(weak)) ?? TECHNIQUES.find((x) => x.kind !== 'end' && free(x))
  }
  if (!t) return { key: 'focus:phase:' + phase, title: `${PHASE_NAME[phase]} · your ${phase} mistakes`, route: 'puzzles/phase/' + phase }
  return { key: 'focus:armoury:' + t.id, title: `${PHASE_NAME[phase]} · ${t.name}`, route: 'armoury/' + t.id }
}

export function planInput(lines: Line[], srs: Map<string, SrsState>, puzzles: PuzzleSets, player: string) {
  const king = loadKing()
  const next = nextCity(king.beaten)
  const lesson = next ? lessonOf(next.id) : undefined
  const date = today()
  const results = loadResults(date)
  const lessonOpen = !!next && !!lesson && (!king.got.includes(`${next.id}/${lesson.id}`) || `lesson:${lesson.id}` in results)
  const red = redCandidates(puzzles, player)
  const redIds = new Set(red.map((r) => r.id))
  const winning = puzzles.puzzles.filter((p) => clampScore(p.scoreBefore) >= 300)
  return {
    date,
    linesDue: lines.filter((l) => isDue(srs.get(l.id), Date.now())).length,
    lesson: lessonOpen ? { id: lesson!.id, title: lesson!.eyebrow, route: `king/${next!.id}/${lesson!.id}` } : undefined,
    mistakes: red,
    lostDue: [...puzzles.due, ...puzzles.fresh].filter((p) => !redIds.has(p.id)).length,
    treasure: pickOfDay(winning)?.id,
    boss: next ? { city: next.id, name: next.boss.name } : undefined,
    focus: focusExercise(mineOf(puzzles.puzzles, player)),
    workout: Math.min(WORKOUT_SIZE, mineOf(puzzles.puzzles, player).filter((p) => !!p.category).length),
  }
}

// Stored results plus what other screens already keep (Threat Check, beaten bosses, lessons)
export function doneMap(plan: DayPlan): Record<string, number> {
  const done = { ...loadResults(plan.date) }
  const threat = loadThreat()[dayNumber()]
  if (threat && !('threat' in done)) done.threat = threat.ok ? 3 : 1
  const king = loadKing()
  for (const l of plan.levels) {
    if (l.kind === 'boss' && king.beaten.includes(l.key.slice(5))) done[l.key] = 3
    if (l.kind === 'lesson' && !(l.key in done) && king.got.some((g) => g.endsWith('/' + l.key.slice(7)))) done[l.key] = 1
  }
  return done
}

// For the start page: "2/5" of today, or null before the first visit today
export function pathProgress(): { done: number; total: number; stars: number; maxStars: number } | null {
  const plan = loadPlan()
  if (!plan) return null
  const done = doneMap(plan)
  const starred = plan.levels.filter((l) => !l.icon)
  return {
    done: plan.levels.filter((l) => l.key in done).length,
    total: plan.levels.length,
    stars: starred.reduce((s, l) => s + (done[l.key] ?? 0), 0),
    maxStars: starred.length * 3,
  }
}


// The same pick all day long (no random jumps between visits)
export function pickOfDay<T>(list: T[], date = today()): T | undefined {
  if (!list.length) return undefined
  const seed = [...date].reduce((s, c) => s + c.charCodeAt(0), 0)
  return list[seed % list.length]
}
