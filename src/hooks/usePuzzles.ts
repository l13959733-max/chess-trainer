import { useCallback, useEffect, useMemo, useState } from 'react'
import * as store from '../lib/db'
import { isDue, newState, qualityFromMistakes, review, type SrsState } from '../lib/srs'

const key = (id: string) => 'p:' + id

export function usePuzzles(found: number) {
  const [puzzles, setPuzzles] = useState<store.Puzzle[]>([])
  const [srs, setSrs] = useState<Map<string, SrsState>>(new Map())
  const [analyzedGames, setAnalyzedGames] = useState(0)

  // Reload whenever the analyzer finds new puzzles
  useEffect(() => {
    Promise.all([store.getPuzzles(), store.getAllSrs(), store.countAnalyzedGames()])
      .then(([p, s, n]) => {
        setPuzzles(p.sort((a, b) => b.endTime - a.endTime || a.ply - b.ply))
        setSrs(new Map(s.filter((x) => x.lineId.startsWith('p:')).map((x) => [x.lineId, x])))
        setAnalyzedGames(n)
      })
      .catch(() => {})
  }, [found])

  const now = Date.now()
  const due = useMemo(() => puzzles.filter((p) => isDue(srs.get(key(p.id)), now)), [puzzles, srs, now])
  const fresh = useMemo(() => puzzles.filter((p) => !srs.get(key(p.id))), [puzzles, srs])

  const record = useCallback(
    async (id: string, mistakes: number) => {
      const k = key(id)
      const next = review(srs.get(k) ?? newState(k), qualityFromMistakes(mistakes), Date.now(), mistakes)
      setSrs((m) => new Map(m).set(k, next))
      await store.putSrs(next)
      return next
    },
    [srs],
  )

  return { puzzles, due, fresh, analyzedGames, record }
}

export type Puzzles = ReturnType<typeof usePuzzles>
