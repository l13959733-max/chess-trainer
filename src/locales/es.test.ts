import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { achievements } from '../lib/achievements'
import { THEMES } from '../lib/attacks'
import { chapters, LAYOUT } from '../lib/chapters'
import { GUIDE } from '../lib/guide'
import { parseGame, splitGames, type Line } from '../lib/pgn'
import { CATEGORY } from '../lib/weakness'
import es from './es'

// Every text the app can show must have a Spanish version. Texts come from t('…') in the code,
// from the repertoire (titles, chapters, comments) and from the data modules shown through t().
const src = join(__dirname, '..')
const dataDir = join(__dirname, '../../data')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}

function codeKeys(): string[] {
  const keys: string[] = []
  for (const file of sourceFiles(src)) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g)) {
      const q = m[1]
      keys.push(q[0] === '"' ? JSON.parse(q) : q.slice(1, -1).replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c)))
    }
  }
  return keys
}

function repertoire(): Line[] {
  return readdirSync(dataDir).filter((f) => f.endsWith('.pgn')).flatMap((f) =>
    splitGames(readFileSync(join(dataDir, f), 'utf8')).map((g) => parseGame(g, 'w', 'builtin')),
  )
}

function allKeys(): string[] {
  const lines = repertoire()
  const keys = codeKeys()
  for (const l of lines) {
    keys.push(l.title)
    if (l.opening) keys.push(l.opening)
    for (const m of l.moves) if (m.comment) keys.push(m.comment)
  }
  for (const g of LAYOUT) {
    keys.push(g.group)
    for (const c of g.chapters) keys.push(c.opening, c.moves, ...(c.title ? [c.title] : []))
  }
  for (const c of chapters(lines)) keys.push(c.title)
  for (const g of Object.values(GUIDE)) keys.push(g.about, g.style, ...g.ideas, ...(g.fact ? [g.fact] : []))
  for (const th of THEMES) keys.push(th.name, th.about)
  for (const c of Object.values(CATEGORY)) keys.push(c.title, c.rule)
  const none = { linesPlayed: 0, linesTotal: 1, perfectLines: 0, chaptersDone: [], puzzlesSolved: 0, threatsSolved: 0, bestStreak: 0, level: 0, gamesPlayed: 0, gamesWon: 0, botRating: 0 }
  for (const a of achievements(none)) keys.push(a.title, a.desc)
  return [...new Set(keys.filter((k) => /[A-Za-z]/.test(k)))]
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
// Only Spanish needs these: the article ("el caballo" / "la torre") and the ending ("atacado" / "atacada")
const GRAMMAR = ['the', 'o']

describe('Spanish', () => {
  const keys = allKeys()
  if (process.env.DUMP_I18N) writeFileSync(process.env.DUMP_I18N, JSON.stringify(keys.filter((k) => !es[k]), null, 1))

  it('has every text', () => {
    const missing = keys.filter((k) => !es[k])
    expect(missing.slice(0, 20), `${missing.length} texts without Spanish`).toEqual([])
  })
  it('keeps every {placeholder}', () => {
    const wrong = keys.filter((k) => es[k] && placeholders(es[k]).split(',').some((p) => p && !GRAMMAR.includes(p) && !placeholders(k).split(',').includes(p)))
    expect(wrong).toEqual([])
  })
})
