import type { Reward } from '../hooks/useProgress'
import { t } from '../lib/i18n'

const BITS = 16

// Short success animation: XP pops in, and a burst of board-colored squares when the daily goal is reached or a level is gained.
export function Celebrate({ reward }: { reward: Reward }) {
  const big = reward.goalJustReached || reward.levelUp
  return (
    <div className="celebrate" role="status">
      <div className="xp-pop">+{reward.xp} {t('XP')}</div>
      {reward.levelUp && <div className="level-up">{t('Level')} {reward.level}!</div>}
      {reward.goalJustReached && <div className="goal-hit">{t('Daily goal reached')}</div>}
      {big && (
        <div className="burst" aria-hidden="true">
          {Array.from({ length: BITS }, (_, i) => (
            <span key={i} style={{ '--a': `${(360 / BITS) * i}deg`, '--d': `${70 + (i % 3) * 22}px` } as React.CSSProperties} />
          ))}
        </div>
      )}
    </div>
  )
}
