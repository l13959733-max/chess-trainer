import { useCallback, useEffect, useMemo, useState } from 'react'
import * as store from '../lib/db'
import { parsePgn, type Line } from '../lib/pgn'
import { builtinLines } from '../lib/repertoire'
import { newState, qualityFromMistakes, review, type SrsState } from '../lib/srs'

export function useRepertoire() {
  const [imports, setImports] = useState<store.ImportRecord[]>([])
  const [srs, setSrs] = useState<Map<string, SrsState>>(new Map())
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    const [imp, states] = await Promise.all([store.getImports(), store.getAllSrs()])
    setImports(imp)
    setSrs(new Map(states.map((s) => [s.lineId, s])))
    setReady(true)
  }, [])

  useEffect(() => {
    reload().catch(() => setReady(true))
  }, [reload])

  const lines = useMemo(() => {
    const seen = new Set(builtinLines.map((l) => l.id))
    const imported: Line[] = []
    for (const rec of imports) {
      for (const line of parsePgn(rec.pgn, rec.side, 'import').lines) {
        if (seen.has(line.id)) continue
        seen.add(line.id)
        imported.push({ ...line, importId: rec.id })
      }
    }
    return [...builtinLines, ...imported]
  }, [imports])

  const recordDrill = useCallback(
    async (lineId: string, mistakes: number) => {
      const now = Date.now()
      const next = review(srs.get(lineId) ?? newState(lineId), qualityFromMistakes(mistakes), now, mistakes)
      setSrs((m) => new Map(m).set(lineId, next))
      await store.putSrs(next)
      return next
    },
    [srs],
  )

  const addImport = useCallback(
    async (rec: store.ImportRecord) => {
      await store.addImport(rec)
      await reload()
    },
    [reload],
  )

  const removeImport = useCallback(
    async (id: number) => {
      await store.deleteImport(id)
      await reload()
    },
    [reload],
  )

  return { ready, lines, srs, imports, recordDrill, addImport, removeImport }
}

export type Repertoire = ReturnType<typeof useRepertoire>
