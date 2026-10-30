import { useCallback, useEffect, useMemo, useState } from 'react'
import { categorizeOld } from '../lib/analyzer'
import { USERNAME } from '../lib/chesscom'
import * as store from '../lib/db'
import { isDue, newState, qualityFromMistakes, review, type SrsState } from '../lib/srs'

const key = (id: string) => 'p:' + id

export function usePuzzles(found: number, player: string) {
  const [puzzles, setPuzzles] = useState<store.Puzzle[]>([])
  const [srs, setSrs] = useState<Map<string, SrsState>>(new Map())
  const [analyzedGames, setAnalyzedGames] = useState(0)
  const [sorting, setSorting] = useState<{ done: number; total: number } | null>(null)
  const [sorted, setSorted] = useState(0)

  // Reload whenever the analyzer finds new puzzles
  useEffect(() => {
    Promise.all([store.getPuzzles(), store.getAllSrs(), store.countAnalyzedGames(player)])
      .then(([p, s, n]) => {
        setPuzzles(p.filter((x) => (x.player ?? USERNAME) === player).sort((a, b) => b.endTime - a.endTime || a.ply - b.ply))
        setSrs(new Map(s.filter((x) => x.lineId.startsWith('p:') || x.lineId.startsWith('t:')).map((x) => [x.lineId, x])))
        setAnalyzedGames(n)
      })
      .catch(() => {})
  }, [found, player, sorted])

  // Older puzzles without a weakness category get one in the background
  useEffect(() => {
    if (!puzzles.some((p) => !p.category)) return
    let last = 0
    categorizeOld(puzzles, (done, total) => {
      setSorting(done < total ? { done, total } : null)
      if (done === total || done - last >= 25) {
        last = done
        setSorted((n) => n + 1)
      }
    }).catch(() => setSorting(null))
  }, [puzzles])

  const now = Date.now()
  const due = useMemo(() => puzzles.filter((p) => isDue(srs.get(key(p.id)), now)), [puzzles, srs, now])
  const fresh = useMemo(() => puzzles.filter((p) => !srs.get(key(p.id))), [puzzles, srs])

  // prefix 'p:' = "find the better move", 't:' = "what's the threat?" (same position, own schedule)
  const record = useCallback(
    async (id: string, mistakes: number, prefix: 'p:' | 't:' = 'p:') => {
      const k = prefix + id
      const next = review(srs.get(k) ?? newState(k), qualityFromMistakes(mistakes), Date.now(), mistakes)
      setSrs((m) => new Map(m).set(k, next))
      await store.putSrs(next)
      return next
    },
    [srs],
  )

  return { puzzles, srs, due, fresh, analyzedGames, record, sorting }
}

export type Puzzles = ReturnType<typeof usePuzzles>
