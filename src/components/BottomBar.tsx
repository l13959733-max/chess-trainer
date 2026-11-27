import { DuoBar } from './DuoBar'

// Every page that had the old bar (Home · Journey · Hoppy · Daily · Progress) now shows the one Duolingo bar
// (components/DuoBar.tsx, Lu 27.11.2026). Old tab names map onto the new ones.
export type Tab = 'home' | 'journey' | 'daily' | 'progress'

export function BottomBar({ active }: { active: Tab | null }) {
  return <DuoBar active={active === 'journey' ? 'story' : active === 'daily' ? 'home' : active} />
}
