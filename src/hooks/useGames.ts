import { useEffect, useMemo, useState } from 'react'
import { fetchArchives, fetchMonth, type ChessComGame } from '../lib/chesscom'
import { getGameRecords, type GameRecord, type Puzzle } from '../lib/db'
import { buildGames } from '../lib/progressStats'

// the player's chess.com games turned into per-game numbers (also used by the White / Black pages of the prototype)
export function useGames(player: string, puzzles: Puzzle[]) {
  const [games, setGames] = useState<ChessComGame[] | null>(null)
  const [records, setRecords] = useState<GameRecord[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let gone = false
    getGameRecords(player).then((r) => !gone && setRecords(r)).catch(() => {})
    fetchArchives(player)
      .then((months) => Promise.all(months.slice(-12).map((m) => fetchMonth(m).catch(() => [] as ChessComGame[]))))
      .then((all) => !gone && setGames(all.flat()))
      .catch(() => !gone && setFailed(true))
    return () => {
      gone = true
    }
  }, [player])
  const G = useMemo(() => (games ? buildGames(games, player, records, puzzles) : null), [games, player, records, puzzles])
  return { G, failed }
}

