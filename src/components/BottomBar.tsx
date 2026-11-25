import { useEffect, useState } from 'react'
import { AnimatedList } from './AnimatedList'
import { go } from '../hooks/useHashRoute'
import { pathProgress } from '../lib/trainingToday'

// Navigation (Lu, 25.11.2026: "die Leiste und den Button in der Mitte gefallen mir nicht" + the React Bits prompts):
// no bottom bar, no button in the middle – ONE floating round menu button at the bottom right (thumb, never over a
// heading). It opens a frosted sheet with the animated list (React Bits AnimatedList) of every place; the page you are
// on is marked. The name BottomBar stays so every page that showed the bar now shows the menu button.
// Before (same day): a bar Home · Journey · Hoppy · Daily · Progress – restore tag vor-design-aufraeumen-2026-11-25 / git log.
export type Tab = 'home' | 'journey' | 'daily' | 'progress'

const PLACES: { to: string; icon: string; title: string; description: string; tab?: Tab }[] = [
  { to: '', icon: '🐴', title: 'Hoppy · Your story', description: 'Continue in the next city', tab: 'home' },
  { to: 'today', icon: '🔥', title: 'Today', description: 'Your week, the threat check and every trainer', tab: 'daily' },
  { to: 'journey', icon: '🧭', title: 'Journey', description: 'The world map – city by city', tab: 'journey' },
  { to: 'progress', icon: '📊', title: 'Progress', description: 'How you got better', tab: 'progress' },
  { to: 'tent', icon: '⭐', title: 'Today’s path', description: 'Today’s levels, one after another' },
  { to: 'rush', icon: '💥', title: 'Square Rush', description: 'Learn the squares – 60 seconds' },
  { to: 'puzzle-rush', icon: '⏱', title: 'Puzzle Rush', description: '3 minutes, 3 lives' },
  { to: 'opening-rush', icon: '⚡', title: 'Opening Rush', description: 'Your openings on time' },
  { to: 'path', icon: '🪙', title: 'All openings', description: 'Every line, chapter by chapter' },
  { to: 'play', icon: '♞', title: 'Hoppy-Bot', description: 'A game at your level' },
  { to: 'weaknesses', icon: '🧩', title: 'Weaknesses', description: 'Your own mistakes, trained' },
  { to: 'diary', icon: '📔', title: 'Diary', description: 'What you learned in every city' },
  { to: 'settings', icon: '⚙️', title: 'Settings', description: 'Sound, look, chess.com account' },
]

export function BottomBar({ active }: { active: Tab | null }) {
  const [open, setOpen] = useState(false)
  // open levels of today's path: a small red number on the button
  const [path] = useState(pathProgress)
  const left = path ? path.total - path.done : null
  const page = window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? ''
  const byPage = PLACES.findIndex((p) => p.to === page)
  const here = byPage >= 0 ? byPage : PLACES.findIndex((p) => p.tab === active)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" className="nav-fab" onClick={() => setOpen(true)} aria-label={left ? `Menu – ${left} levels open today` : 'Menu'} aria-expanded={open}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 8h14M5 16h9" /></svg>
        {!!left && <i className="nav-dot" aria-hidden="true">{left}</i>}
      </button>
      {open && (
        <div className="nav-sheet" role="dialog" aria-modal="true" aria-label="Where to?" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="nav-panel">
            <div className="nav-head">
              <b>Where to?</b>
              <button type="button" className="nav-x" onClick={() => setOpen(false)} aria-label="Close the menu">✕</button>
            </div>
            <AnimatedList
              items={PLACES.map((p) => ({ id: p.to || 'start', icon: p.icon, title: p.title, description: p.description }))}
              initialSelectedIndex={here}
              onItemSelect={(_, i) => {
                setOpen(false)
                go(PLACES[i].to)
              }}
              theme="hoppy"
              width="100%"
              maxHeight="calc(100dvh - 190px)"
              radius={16}
              stagger={0.03}
              frame={false}
            />
          </div>
        </div>
      )}
    </>
  )
}
