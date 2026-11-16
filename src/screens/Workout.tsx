import { useEffect, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { usePuzzles } from '../hooks/usePuzzles'
import { isDue } from '../lib/srs'
import { report, today } from '../lib/trainingPath'
import { mineOf } from '../lib/trainingToday'
import { buildWorkout, type WorkoutKind } from '../lib/workout'
import { PuzzleView } from './PuzzleScreen'

// The weakness workout #/workout (Lu, 16.11.): first what the round is made of, then every task one after another
// without going back to a menu, then how it went. Kept for the day: leave in the middle and come back to the same task.

type Saved = { date: string; ids: string[]; plan: WorkoutKind[]; i: number; slips: number; first: number }
const KEY = 'hoppy-workout'
function load(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return v && v.date === today() ? v : null
  } catch {
    return null
  }
}
function save(v: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    // kept only for this visit
  }
}

export function Workout({ puzzles, progress, player }: { puzzles: ReturnType<typeof usePuzzles>; progress: ReturnType<typeof useProgress>; player: string }) {
  const [w, setW] = useState<Saved | null>(load)
  const [running, setRunning] = useState(false)
  const mine = mineOf(puzzles.puzzles, player)

  // the round is put together once a day, when the mistakes are there
  useEffect(() => {
    if (w || !mine.length) return
    const now = Date.now()
    const rank = (p: (typeof mine)[number]) => {
      const s = puzzles.srs.get('p:' + p.id)
      return !s ? 1 : isDue(s, now) ? 0 : 2 + s.due / 1e13
    }
    const { plan, ids } = buildWorkout(mine, rank)
    if (!ids.length) return
    const v = { date: today(), ids, plan, i: 0, slips: 0, first: 0 }
    save(v)
    setW(v)
  }, [w, mine, puzzles.srs])

  const step = (patch: Partial<Saved>) => {
    setW((cur) => {
      if (!cur) return cur
      const v = { ...cur, ...patch }
      save(v)
      return v
    })
  }

  if (!w) {
    return (
      <div className="screen">
        <div className="greet">
          <Mascot mood="happy" />
          <span>{mine.length ? 'Putting your workout together …' : 'Your workout is made from the mistakes in your own games. Check your chess.com games in Training first.'}</span>
        </div>
        <button type="button" className="primary wide" onClick={() => go('tent')}>To Training</button>
      </div>
    )
  }

  const total = w.ids.length
  const done = w.i >= total
  const puzzle = !done ? puzzles.puzzles.find((p) => p.id === w.ids[w.i]) : undefined

  // the end: how it went, and the level on today's path is done
  if (done) return <WorkoutDone w={w} />

  if (running && puzzle) {
    return (
      <PuzzleView
        key={puzzle.id}
        puzzle={puzzle}
        progress={`Workout · task ${w.i + 1} of ${total}`}
        onSolved={async (m) => {
          step({ slips: w.slips + m, first: w.first + (m === 0 ? 1 : 0) })
          return { srs: await puzzles.record(puzzle.id, m), reward: await progress.recordPuzzle(m) }
        }}
        onNext={() => step({ i: w.i + 1 })}
        isLast={w.i + 1 >= total}
      />
    )
  }

  // the overview: what the round is made of (small), then start or go on
  return (
    <div className="screen wk">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to Training">←</button>
        <div>
          <div className="eyebrow">Today · {total} tasks from your own games</div>
          <h2>Weakness workout</h2>
        </div>
      </div>
      <div className="greet">
        <Mascot mood="happy" />
        <span>Every kind of mistake you make is in it – the frequent ones more often. Mixed, like in a real game: you don’t know what’s coming. One task after another.</span>
      </div>
      <section className="play-card">
        <div className="label">This workout</div>
        <div className="wk-chips">
          {w.plan.map((k) => (
            <span key={k.key} className="wk-chip"><b>{k.n}×</b> {k.title}</span>
          ))}
        </div>
      </section>
      <button type="button" className="primary wide" onClick={() => setRunning(true)}>
        {w.i > 0 ? `Go on · task ${w.i + 1} of ${total}` : `Start · ${total} tasks`}
      </button>
    </div>
  )
}

function WorkoutDone({ w }: { w: Saved }) {
  const total = w.ids.length
  const stars = w.slips === 0 ? 3 : w.slips <= 3 ? 2 : 1
  useEffect(() => report('workout', stars), [stars])
  return (
    <div className="screen">
      <div className="done">
        <Mascot mood="cheer" />
        <div className="done-title">Workout done!</div>
        <p>{w.first} of {total} on the first try. {w.slips === 0 ? 'No wrong move at all.' : `${w.slips} wrong ${w.slips === 1 ? 'try' : 'tries'} – these mistakes come back soon so they stick.`}</p>
        <div className="done-actions">
          <button type="button" onClick={() => go('weaknesses')}>My weaknesses</button>
          <button type="button" className="primary" onClick={() => go('tent')}>Back to Training</button>
        </div>
      </div>
    </div>
  )
}

