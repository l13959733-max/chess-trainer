import { useEffect, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { useProgress } from '../hooks/useProgress'
import { getPlayer, hasOwnPlayer } from '../lib/chesscom'
import { getGameRecords } from '../lib/db'
import { safeShare } from '../lib/trainingPath'
import { pathProgress } from '../lib/trainingToday'

// Journey shows both progresses side by side (Lu, 13.11.: "bei der Journey beide Fortschritte sehen"):
// the story (cities, bosses) and the training (today's path, streak, safe moves). Tap Training to go there.
export function JourneyProgress({ beaten, bosses, chapter, city, coins, title }: { beaten: number; bosses: number; chapter: number | null; city: string | null; coins: number; title: string }) {
  const progress = useProgress()
  const [path] = useState(pathProgress)
  const [safe, setSafe] = useState<number | null>(null)
  useEffect(() => {
    if (!hasOwnPlayer()) return
    let gone = false
    getGameRecords(getPlayer())
      .then((r) => !gone && setSafe(safeShare([...r].sort((a, b) => b.endTime - a.endTime).slice(0, 20))))
      .catch(() => {})
    return () => {
      gone = true
    }
  }, [])
  const ring = 2 * Math.PI * 22
  return (
    <div className="jp" aria-label="Your progress">
      <div className="jp-card">
        <small>Story</small>
        <div className="jp-top">
          <svg viewBox="0 0 56 56" width="52" height="52" aria-hidden="true">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#e4d3ac" strokeWidth="7" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#c9a227" strokeWidth="7" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - beaten / Math.max(bosses, 1))} transform="rotate(-90 28 28)" />
          </svg>
          <b>{beaten}<i>/{bosses}</i></b>
        </div>
        <span className="jp-line">{beaten === 1 ? 'boss' : 'bosses'} beaten</span>
        <span className="jp-line">{chapter && city ? `Chapter ${chapter} · ${city}` : title}</span>
        <span className="jp-line">🌰 {coins.toLocaleString('en')}</span>
      </div>
      <button type="button" className="jp-card jp-train" onClick={() => go('tent')} aria-label="Open Training">
        <small>Training</small>
        <div className="jp-top">
          <b>{path ? path.done : 0}<i>/{path ? path.total : '–'}</i></b>
          <span className="jp-sub">today</span>
        </div>
        <span className="jp-bar"><span style={{ width: `${path && path.total ? (100 * path.done) / path.total : 0}%` }} /></span>
        <span className="jp-line">{path ? `★ ${path.stars} / ${path.maxStars}` : 'Today’s path waits'}</span>
        <span className="jp-line">🔥 {progress.streak} {progress.streak === 1 ? 'day' : 'days'}{safe !== null ? ` · 🛡 ${Math.round(safe * 100)}%` : ''}</span>
        <span className="jp-go">{path && path.done >= path.total ? 'All done ✓' : 'Train →'}</span>
      </button>
    </div>
  )
}
