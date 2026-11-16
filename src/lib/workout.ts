// The weakness workout (Lu, 16.11.: "alle Übungen ins Training, automatisch präsentiert, dass man durchgeführt
// wird und alle durchspielt"): one round of tasks from your own games that covers every kind of mistake you make –
// frequent kinds more often – mixed, not in blocks (LERNKONZEPT: interleaving), the kind not named before you solve.
import type { Puzzle } from './db'
import { CATEGORY, OTHER_KIND, otherKindOf } from './weakness'

export const WORKOUT_SIZE = 12

export interface WorkoutKind {
  key: string // a Category, or 'other:<part>'
  title: string
  n: number // tasks of this kind in the round
}

export function kindOf(p: Puzzle): { key: string; title: string } | null {
  if (!p.category) return null
  if (p.category === 'other') {
    const k = otherKindOf(p)
    return { key: 'other:' + k, title: OTHER_KIND[k].title }
  }
  return { key: p.category, title: CATEGORY[p.category].title }
}

// How many tasks of each kind: every kind at least once (the most frequent ones first if there are more kinds than
// places), the rest by how often you make the mistake (largest remainder).
export function allocate(counts: { key: string; title: string; total: number }[], size = WORKOUT_SIZE): WorkoutKind[] {
  const kinds = counts.filter((c) => c.total > 0).sort((a, b) => b.total - a.total)
  const places = Math.min(size, kinds.reduce((s, k) => s + k.total, 0))
  if (!places) return []
  const used = kinds.slice(0, places)
  const out = used.map((k) => ({ key: k.key, title: k.title, n: 1, total: k.total }))
  let left = places - out.length
  const sum = used.reduce((s, k) => s + k.total, 0)
  // ideal share of the remaining places, then fill by the largest remainder, never more than there are puzzles
  const ideal = out.map((k) => (k.total / sum) * places - 1)
  const base = ideal.map((x, i) => Math.max(0, Math.min(Math.floor(x), out[i].total - 1)))
  base.forEach((b, i) => {
    const add = Math.min(b, left)
    out[i].n += add
    left -= add
  })
  const order = ideal.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r)
  while (left > 0) {
    let moved = false
    for (const { i } of order) {
      if (left > 0 && out[i].n < out[i].total) {
        out[i].n++
        left--
        moved = true
      }
    }
    if (!moved) break
  }
  return out.map(({ key, title, n }) => ({ key, title, n }))
}

// Mixed order: take turns between the kinds, so the same kind never comes twice in a row when it can be avoided
export function interleave<T>(groups: T[][]): T[] {
  const g = groups.map((x) => [...x]).filter((x) => x.length)
  const out: T[] = []
  let last = -1
  while (g.some((x) => x.length)) {
    // the kind with most tasks left goes next, but not the same as the last one
    const order = g.map((x, i) => ({ i, n: x.length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
    const pick = order.find((x) => x.i !== last) ?? order[0]
    out.push(g[pick.i].shift()!)
    last = pick.i
  }
  return out
}

// The round: per kind the puzzles that are due first, then the ones never played, then the ones longest ago
export function buildWorkout(puzzles: Puzzle[], rank: (p: Puzzle) => number, size = WORKOUT_SIZE): { plan: WorkoutKind[]; ids: string[] } {
  const by = new Map<string, { title: string; list: Puzzle[] }>()
  for (const p of puzzles) {
    const k = kindOf(p)
    if (!k) continue
    const g = by.get(k.key) ?? { title: k.title, list: [] }
    g.list.push(p)
    by.set(k.key, g)
  }
  const plan = allocate([...by].map(([key, g]) => ({ key, title: g.title, total: g.list.length })), size)
  const groups = plan.map((k) => [...by.get(k.key)!.list].sort((a, b) => rank(a) - rank(b) || b.endTime - a.endTime).slice(0, k.n).map((p) => p.id))
  return { plan, ids: interleave(groups) }
}
