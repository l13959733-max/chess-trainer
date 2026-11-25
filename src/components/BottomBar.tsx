import { Mascot } from './Mascot'
import { go } from '../hooks/useHashRoute'
import { loadKing } from '../lib/king'
import { nextCity, travelTo } from '../lib/travel'
import { pathProgress } from '../lib/trainingToday'
import { useState } from 'react'

// ONE bottom bar, the same on every overview page (Lu, 25.11.2026: "durchgehend, gut bedienen, nichts doppelt"):
// Home · Journey (the world map) · Hoppy (continue in the next city) · Training (everything to practise) · Progress
// (how you got better + everything else). The old "More" sheet is gone – its entries live on the Progress page
// (section "More") or were already in Training's shelf.
// Earlier decisions this replaces: 13.11. "start page only Hoppy + More" and "Journey = Fast travel" – fast travel is
// one tap away on the map and on the Progress page.
export type Tab = 'home' | 'journey' | 'training' | 'progress'

export function BottomBar({ active }: { active: Tab | null }) {
  const king = loadKing()
  const next = nextCity(king.beaten)
  // open levels of today's path; a dot when today's path was not opened yet
  const [path] = useState(pathProgress)
  const open = path ? path.total - path.done : null
  const tab = (t: Tab) => ({ className: active === t ? 'on' : '', 'aria-current': active === t ? ('page' as const) : undefined })
  return (
    <nav className="hub-bar" aria-label="Main">
      <button type="button" {...tab('home')} onClick={() => go('')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" /></svg>Home
      </button>
      <button type="button" {...tab('journey')} onClick={() => go('journey')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" /></svg>Journey
      </button>
      <button type="button" className="hub-mid" onClick={() => (next ? travelTo(next) : go('tent'))} aria-label={next ? `Play – ${next.name}` : 'Play'}>
        <Mascot mood="happy" />
      </button>
      <button type="button" {...tab('training')} className={`hub-train${active === 'training' ? ' on' : ''}`} onClick={() => go('tent')} aria-label={open ? `Training, ${open} levels open today` : 'Training'}>
        {open === null ? <i className="hub-dot" aria-hidden="true" /> : open > 0 ? <i className="hub-dot" aria-hidden="true">{open}</i> : null}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 3 20h18L12 3Z" /><path d="M12 3v17M9 20l3-6 3 6" /></svg>Training
      </button>
      <button type="button" {...tab('progress')} onClick={() => go('progress')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>Progress
      </button>
    </nav>
  )
}
