import { useEffect } from 'react'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Achievements } from '../hooks/useAchievements'

export function Trophies({ achievements }: { achievements: Achievements }) {
  const { list, fresh, markSeen } = achievements
  const earned = list.filter((a) => a.earned).length
  const newIds = new Set(fresh.map((a) => a.id))
  // Opening this page counts as having seen the new ones (keeps the highlight for this visit)
  useEffect(() => {
    markSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sorted = [...list].sort((a, b) => Number(b.earned) - Number(a.earned) || b.value / b.goal - a.value / a.goal)
  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">{earned} of {list.length} collected</div>
          <h2>Trophies</h2>
        </div>
      </div>
      <div className="greet">
        <Mascot mood={fresh.length ? 'cheer' : 'happy'} />
        {fresh.length ? `Wow, ${fresh.length === 1 ? 'a new trophy' : `${fresh.length} new trophies`}! Keep going!` : 'Collect them all! Every lesson, puzzle and game brings you closer.'}
      </div>
      <div className="trophies">
        {sorted.map((a) => (
          <div key={a.id} className={`trophy ${a.earned ? 'earned ' + a.tier : 'locked'} ${newIds.has(a.id) ? 'is-new' : ''}`}>
            <div className="medal" aria-hidden="true">{a.icon}</div>
            <div className="trophy-title">{a.title}</div>
            <div className="trophy-desc">{a.desc}</div>
            {!a.earned && a.goal > 1 && (
              <>
                <div className="bar"><span style={{ width: `${(a.value / a.goal) * 100}%` }} /></div>
                <div className="trophy-desc">{a.value} / {a.goal}</div>
              </>
            )}
            {newIds.has(a.id) && <div className="new-tag">NEW</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
