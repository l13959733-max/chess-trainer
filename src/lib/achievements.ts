// Trophies: collectable goals for kids (and grown-ups). Pure: computed from what is already stored.

export interface AchievementInput {
  linesPlayed: number // lines drilled at least once
  linesTotal: number
  perfectLines: number // last drill without mistakes
  chaptersDone: { title: string; done: boolean }[] // every line of the chapter drilled
  puzzlesSolved: number
  threatsSolved: number
  bestStreak: number
  level: number
  gamesPlayed: number
  gamesWon: number
  botRating: number
}

export interface Achievement {
  id: string
  title: string
  desc: string
  icon: string // a chess piece glyph
  tier: 'bronze' | 'silver' | 'gold'
  value: number
  goal: number
  earned: boolean
}

const PIECES = ['♞', '♝', '♜', '♛', '♚', '♟']

function make(id: string, title: string, desc: string, icon: string, tier: Achievement['tier'], value: number, goal: number): Achievement {
  return { id, title, desc, icon, tier, value: Math.min(value, goal), goal, earned: value >= goal }
}

export function achievements(s: AchievementInput): Achievement[] {
  const out: Achievement[] = [
    make('first-line', 'First steps', 'Play your first opening line', '♟', 'bronze', s.linesPlayed, 1),
    make('lines-10', 'Line collector', 'Play 10 different lines', '♞', 'bronze', s.linesPlayed, 10),
    make('lines-30', 'Opening explorer', 'Play 30 different lines', '♞', 'silver', s.linesPlayed, 30),
    make('lines-all', 'Opening master', 'Play every line in the app', '♞', 'gold', s.linesPlayed, Math.max(1, s.linesTotal)),
    make('perfect-5', 'Clean play', '5 lines perfect – no mistakes', '♝', 'bronze', s.perfectLines, 5),
    make('perfect-25', 'Perfectionist', '25 lines perfect', '♝', 'gold', s.perfectLines, 25),
    make('puzzles-10', 'Puzzle solver', 'Solve 10 puzzles from your games', '♜', 'bronze', s.puzzlesSolved, 10),
    make('puzzles-50', 'Puzzle hunter', 'Solve 50 puzzles', '♜', 'silver', s.puzzlesSolved, 50),
    make('puzzles-200', 'Puzzle champion', 'Solve 200 puzzles', '♜', 'gold', s.puzzlesSolved, 200),
    make('threats-10', 'Eagle eye', 'Spot 10 threats', '♛', 'bronze', s.threatsSolved, 10),
    make('threats-50', 'Nothing gets past me', 'Spot 50 threats', '♛', 'gold', s.threatsSolved, 50),
    make('streak-3', 'On fire', 'Train 3 days in a row', '♟', 'bronze', s.bestStreak, 3),
    make('streak-7', 'One whole week', 'Train 7 days in a row', '♟', 'silver', s.bestStreak, 7),
    make('streak-30', 'Unstoppable', 'Train 30 days in a row', '♟', 'gold', s.bestStreak, 30),
    make('level-5', 'Level 5', 'Reach level 5', '♚', 'bronze', s.level, 5),
    make('level-10', 'Level 10', 'Reach level 10', '♚', 'gold', s.level, 10),
    make('game-1', 'Brave', 'Play a game against Hoppy-Bot', '♞', 'bronze', s.gamesPlayed, 1),
    make('win-1', 'First victory', 'Beat Hoppy-Bot', '♚', 'bronze', s.gamesWon, 1),
    make('win-10', 'Bot tamer', 'Beat Hoppy-Bot 10 times', '♚', 'silver', s.gamesWon, 10),
  ]
  for (const r of [800, 1000, 1200, 1500, 2000]) {
    out.push(make(`rating-${r}`, `Rating ${r}`, `Reach a Hoppy-Bot rating of ${r}`, '♛', r >= 1500 ? 'gold' : r >= 1000 ? 'silver' : 'bronze', s.botRating, r))
  }
  s.chaptersDone.forEach((c, i) => {
    out.push(make(`chapter-${c.title}`, c.title, `Play every line of “${c.title}”`, PIECES[i % PIECES.length], 'silver', c.done ? 1 : 0, 1))
  })
  return out
}

// Best streak ever, from the list of active days (YYYY-MM-DD)
export function bestStreak(activeDays: string[]): number {
  const days = [...new Set(activeDays)].sort()
  let best = 0, run = 0, prev: number | null = null
  for (const d of days) {
    const [y, m, dd] = d.split('-').map(Number)
    const t = Date.UTC(y, m - 1, dd) / 86400000
    run = prev !== null && t - prev === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return best
}
