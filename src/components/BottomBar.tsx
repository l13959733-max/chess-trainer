import { Mascot } from './Mascot'
import { go } from '../hooks/useHashRoute'
import { loadKing } from '../lib/king'
import { nextCity, travelTo } from '../lib/travel'
import { pathProgress } from '../lib/trainingToday'
import { useState } from 'react'

// ONE bottom bar, the same on every overview page (Lu, 25.11.2026: "durchgehend, gut bedienen, nichts doppelt"):
// Home · Journey (the world map) · Hoppy (continue in the next city) · Daily (today + every trainer; Training's
// path is a sub page) · Progress (statistics only). Lu, 25.11.: "Daily-Design, Training als Unterpunkt". The old "More" sheet is gone – its entries live on the Progress page
// (section "More") or were already in Training's shelf.
// Earlier decisions this replaces: 13.11. "start page only Hoppy + More" and "Journey = Fast travel" – fast travel is
// one tap away on the map and on the Progress page.
export type Tab = 'home' | 'journey' | 'daily' | 'progress'

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
      <button type="button" className="hub-mid" onClick={() => (next ? travelTo(next) : go('today'))} aria-label={next ? `Play – ${next.name}` : 'Play'}>
        <Mascot mood="happy" />
      </button>
      <button type="button" {...tab('daily')} className={`hub-train${active === 'daily' ? ' on' : ''}`} onClick={() => go('today')} aria-label={open ? `Daily, ${open} levels open today` : 'Daily'}>
        {open === null ? <i className="hub-dot" aria-hidden="true" /> : open > 0 ? <i className="hub-dot" aria-hidden="true">{open}</i> : null}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c1.2 4.2 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3.5-1-5.5 1-8Z" /></svg>Daily
      </button>
      <button type="button" {...tab('progress')} onClick={() => go('progress')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>Progress
      </button>
    </nav>
  )
}
