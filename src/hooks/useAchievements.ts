import { useEffect, useMemo, useState } from 'react'
import { achievements, bestStreak } from '../lib/achievements'
import { chapters } from '../lib/chapters'
import { getBotStats, type BotStats } from '../lib/db'
import { lineResult } from '../lib/srs'
import type { Progress } from './useProgress'
import type { Puzzles } from './usePuzzles'
import type { Repertoire } from './useRepertoire'

const SEEN_KEY = 'chess-trainer-trophies'

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

// All trophies with progress, plus the ones earned since the trophy page was last opened.
export function useAchievements(rep: Repertoire, progress: Progress, puzzles: Puzzles, player: string, page: string) {
  const [bot, setBot] = useState<BotStats | undefined>()
  const [seen, setSeen] = useState(loadSeen)

  useEffect(() => {
    getBotStats(player).then(setBot).catch(() => {})
  }, [player, page])

  const list = useMemo(() => {
    const now = Date.now()
    const builtin = rep.lines.filter((l) => l.source === 'builtin')
    const played = builtin.filter((l) => rep.srs.get(l.id))
    const keys = [...puzzles.srs.keys()]
    return achievements({
      linesPlayed: played.length,
      linesTotal: builtin.length,
      perfectLines: played.filter((l) => lineResult(rep.srs.get(l.id), now).kind === 'perfect').length,
      chaptersDone: chapters(builtin).map((c) => ({ title: c.title, done: c.lines.every((l) => rep.srs.get(l.id)) })),
      puzzlesSolved: keys.filter((k) => k.startsWith('p:')).length,
      threatsSolved: keys.filter((k) => k.startsWith('t:')).length,
      bestStreak: bestStreak([...progress.days.values()].filter((d) => d.lines + d.puzzles + (d.games ?? 0) > 0).map((d) => d.date)),
      level: progress.level.level,
      gamesPlayed: bot?.games ?? 0,
      gamesWon: bot?.wins ?? 0,
      botRating: bot?.rating ?? 0,
    })
  }, [rep.lines, rep.srs, puzzles.srs, progress.days, progress.level.level, bot])

  const fresh = list.filter((a) => a.earned && !seen.has(a.id))

  function markSeen() {
    const all = new Set(list.filter((a) => a.earned).map((a) => a.id))
    setSeen(all)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...all]))
    } catch {
      // not remembered in private mode
    }
  }

  return { list, fresh, markSeen }
}

export type Achievements = ReturnType<typeof useAchievements>
