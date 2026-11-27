import { go } from '../hooks/useHashRoute'

// The one bar at the bottom (Lu, 27.11.2026: "unten der Balken aus der neuen Version" – Duolingo style, icons only,
// the active one in a light-blue box, no button in the middle): 🔥 start page · ♔ White · ♚ Black · 📊 Progress · 🧭 Story.
export type DuoTab = 'home' | 'white' | 'black' | 'progress' | 'story'
const TABS: { t: DuoTab; icon: string; label: string; to: string }[] = [
  { t: 'home', icon: '🔥', label: 'Start', to: '' },
  { t: 'white', icon: '♔', label: 'White', to: 'white' },
  { t: 'black', icon: '♚', label: 'Black', to: 'black' },
  { t: 'progress', icon: '📊', label: 'Progress', to: 'progress' },
  { t: 'story', icon: '🧭', label: 'Story', to: 'story' },
]

export function DuoBar({ active }: { active: DuoTab | null }) {
  return (
    <nav className="pn-duobar pn-bar5 duo-bar" aria-label="Main">
      {TABS.map((x) => (
        <button key={x.t} type="button" className={active === x.t ? 'on' : ''} aria-label={x.label} aria-current={active === x.t ? 'page' : undefined} onClick={() => go(x.to)}>
          <span aria-hidden="true">{x.icon}</span>
        </button>
      ))}
    </nav>
  )
}
