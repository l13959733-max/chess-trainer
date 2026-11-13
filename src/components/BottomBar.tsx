import { useState } from 'react'
import { Mascot } from './Mascot'
import { go } from '../hooks/useHashRoute'
import { loadKing, mirrorOpen } from '../lib/king'
import { nextCity, travelTo } from '../lib/travel'

// One bottom bar everywhere (Lu, 12.11.: "nicht quer durch die Seiten springen"): Home · Journey · Hoppy · Training · More.
// Lu, 13.11.: the world map only once – through the big picture on the start page, not in the bar. Journey = Fast travel.
// Hoppy in the middle continues the journey in the next city.
export function BottomBar({ active }: { active: 'home' | 'journey' | 'training' | null }) {
  const [more, setMore] = useState(false)
  const king = loadKing()
  const next = nextCity(king.beaten)
  return (
    <>
      <nav className="hub-bar" aria-label="Main">
        <button type="button" className={active === 'home' ? 'on' : ''} aria-current={active === 'home' ? 'page' : undefined} onClick={() => go('')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" /></svg>Home
        </button>
        <button type="button" className={active === 'journey' ? 'on' : ''} aria-current={active === 'journey' ? 'page' : undefined} onClick={() => go('road')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" /></svg>Journey
        </button>
        <button type="button" className="hub-mid" onClick={() => (next ? travelTo(next) : go('tent'))} aria-label={next ? `Play – ${next.name}` : 'Play'}>
          <Mascot mood="happy" />
        </button>
        <button type="button" className={active === 'training' ? 'on' : ''} onClick={() => go('tent')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 3 20h18L12 3Z" /><path d="M12 3v17M9 20l3-6 3 6" /></svg>Training
        </button>
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>More
        </button>
      </nav>
      {more && (
        <div className="hub-more" role="dialog" aria-label="More">
          <button type="button" onClick={() => go('threat-check')}>🎯 Daily Threat Check</button>
          <button type="button" onClick={() => go('rush')}>💥 Square Rush</button>
          <button type="button" onClick={() => go('path')}>📚 All openings</button>
          <button type="button" onClick={() => go('quests')}>📖 Quest book</button>
          <button type="button" onClick={() => go('painted')}>🎨 The painted map</button>
          <button type="button" onClick={() => go(king.beaten.includes('kannauj') ? 'portal' : 'check')}>🌀 Real world</button>
          <button type="button" onClick={() => go('watch')}>👫 Together</button>
          {mirrorOpen(king.beaten) && <button type="button" onClick={() => go('mirror')}>🪞 Mirror World</button>}
          <button type="button" onClick={() => go('settings')}>⚙️ Settings</button>
          <button type="button" className="close" onClick={() => setMore(false)}>Close</button>
        </div>
      )}
    </>
  )
}
