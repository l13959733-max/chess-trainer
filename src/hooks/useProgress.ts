import { useCallback, useEffect, useMemo, useState } from 'react'
import * as store from '../lib/db'
import { addToDay, dateKey, DEFAULT_GOAL, goalReached, levelInfo, streak, XP, xpForDrill, type DayActivity, type Goal } from '../lib/progress'

export interface Reward {
  xp: number
  level: number
  levelUp: boolean
  goalJustReached: boolean
}

export function useProgress() {
  const [days, setDays] = useState<Map<string, DayActivity>>(new Map())
  const [goal, setGoalState] = useState<Goal>(DEFAULT_GOAL)

  useEffect(() => {
    Promise.all([store.getActivity(), store.getGoal()])
      .then(([acts, g]) => {
        setDays(new Map(acts.map((a) => [a.date, a])))
        if (g) setGoalState(g)
      })
      .catch(() => {})
  }, [])

  const today = dateKey(new Date())
  const totalXp = useMemo(() => [...days.values()].reduce((s, d) => s + d.xp, 0), [days])

  const add = useCallback(
    async (delta: { lines?: number; xp: number }): Promise<Reward> => {
      const key = dateKey(new Date())
      const before = days.get(key)
      const after = addToDay(before, key, delta)
      const oldLevel = levelInfo(totalXp).level
      const newLevel = levelInfo(totalXp + delta.xp).level
      setDays((m) => new Map(m).set(key, after))
      await store.putActivity(after)
      return {
        xp: delta.xp,
        level: newLevel,
        levelUp: newLevel > oldLevel,
        goalJustReached: !goalReached(before, goal) && goalReached(after, goal),
      }
    },
    [days, totalXp, goal],
  )

  const recordDrill = useCallback((mistakes: number) => add({ lines: 1, xp: xpForDrill(mistakes) }), [add])
  const recordLearn = useCallback(() => add({ xp: XP.learnLine }), [add])

  const setGoal = useCallback(async (g: Goal) => {
    setGoalState(g)
    await store.putGoal(g)
  }, [])

  return {
    today: days.get(today),
    goal,
    setGoal,
    totalXp,
    level: levelInfo(totalXp),
    streak: streak(days, today),
    goalReached: goalReached(days.get(today), goal),
    recordDrill,
    recordLearn,
  }
}

export type Progress = ReturnType<typeof useProgress>
