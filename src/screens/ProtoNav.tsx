import { useState } from 'react'
import { AnimatedList, type ListItem } from '../components/AnimatedList'
import { go } from '../hooks/useHashRoute'
import { STATIONS, loadKing, route, stationById } from '../lib/king'
import { chapterOf } from '../lib/cityBook'

// #/proto – navigation prototypes (Lu, 25.11.2026: "es soll Duolingo-Style bleiben, Prototypen mit den animierten
// Listen; die Leiste, der Button in der Mitte und der lila Knopf sollen weg"). Three ways, side by side, nothing in
// the real app changes: A = Duolingo bar (icons only, no middle button, no Home), B = no bar, the start page is a
// list, C = tabs on top. Tapping a row only says where it would go.
const IMG = import.meta.env.BASE_URL + 'king/'
type Proto = 'A' | 'B' | 'C'
type Section = 'today' | 'journey' | 'progress' | 'me'

const TODAY: ListItem[] = [
  { icon: '🎯', title: 'Daily Threat Check', description: 'One position – what does your opponent threaten?' },
  { icon: '⭐', title: 'Today’s path', description: 'Today’s levels, one after another' },
  { icon: '🗺', title: 'Lines to repeat', description: 'Your openings that are due' },
  { icon: '🩹', title: 'Your mistakes', description: 'Positions from your own games' },
  { icon: '💥', title: 'Square Rush', description: 'Learn the squares – 60 seconds' },
  { icon: '⏱', title: 'Puzzle Rush', description: '3 minutes, 3 lives' },
  { icon: '⚡', title: 'Opening Rush', description: 'Your openings on time' },
  { icon: '♞', title: 'Hoppy-Bot', description: 'A game at your level' },
  { icon: '🛡', title: 'Armoury', description: 'Tactics to endgame' },
  { icon: '🪙', title: 'All openings', description: 'Every line, chapter by chapter' },
  { icon: '🧩', title: 'Weaknesses', description: 'Your own mistakes, trained' },
]
const PROGRESS: ListItem[] = [
  { icon: '📈', title: 'Rating', description: 'Your chess.com rapid rating over time' },
  { icon: '🛡️', title: 'Safe moves', description: 'Moves that lose less than 2 pawns' },
  { icon: '⚖️', title: 'Better or worse?', description: 'What changed since last month' },
  { icon: '📍', title: 'Where your mistakes happen', description: 'Opening, middlegame, endgame' },
  { icon: '♟', title: 'Your openings', description: 'Wins and mistakes per opening' },
  { icon: '🕐', title: 'Habits', description: 'Time of day, game after game' },
  { icon: '🏆', title: 'Trophies', description: 'What you have won' },
  { icon: '📔', title: 'Diary', description: 'What you learned in every city' },
]
const ME: ListItem[] = [
  { icon: '⚙️', title: 'Settings', description: 'Sound, look, chess.com account' },
  { icon: '👫', title: 'Together', description: 'Watch and help each other' },
  { icon: '📖', title: 'Quest book', description: 'Your quests' },
  { icon: '🪞', title: 'Mirror World', description: 'Act 2 – you play Black' },
  { icon: '🎨', title: 'The painted map', description: 'The world as a painting' },
  { icon: '🌀', title: 'Real world', description: 'Your chess.com games' },
]
const TITLE: Record<Section, string> = { today: 'Today', journey: 'Journey', progress: 'Progress', me: 'Profile' }
const ICON: Record<Section, string> = { today: '🔥', journey: '🧭', progress: '📊', me: '👤' }

function journeyItems(): ListItem[] {
  const king = loadKing()
  return route()
    .map((id) => stationById(id)!)
    .filter((s) => s && STATIONS.includes(s) && !s.finale)
    .map((s) => ({ id: s.id, image: `${IMG}stamp-${s.id}.jpg`, title: s.name, description: chapterOf(s.id)?.headline ?? String(s.year), meta: king.beaten.includes(s.id) ? '✓' : '' }))
}

export function ProtoNav() {
  const [proto, setProto] = useState<Proto>('A')
  const [section, setSection] = useState<Section>('today')
  const [inside, setInside] = useState<Section | null>(null) // B: a section opened from the start list
  const [toast, setToast] = useState<string | null>(null)
  const name = (() => {
    try {
      return localStorage.getItem('chess-trainer-name') || 'you'
    } catch {
      return 'you'
    }
  })()
  const say = (t: string) => {
    setToast(`Would open: ${t}`)
    window.setTimeout(() => setToast(null), 1400)
  }
  const items = (s: Section) => (s === 'today' ? TODAY : s === 'journey' ? journeyItems() : s === 'progress' ? PROGRESS : ME)
  const list = (s: Section) => (
    <AnimatedList key={proto + s} items={items(s)} theme="duo" frame={false} width="100%" maxHeight="100%" radius={16} gap={10} stagger={0.035}
      onItemSelect={(it) => say(typeof it === 'string' ? it : it.title)} />
  )
  const switchTo = (p: Proto) => {
    setProto(p)
    setSection('today')
    setInside(null)
  }

  return (
    <div className="pn">
      <div className="pn-proto" role="group" aria-label="Prototype">
        <button type="button" className="pn-exit" onClick={() => go('')} aria-label="Leave the prototypes">✕</button>
        <span>PROTOTYPE</span>
        {(['A', 'B', 'C'] as Proto[]).map((p) => (
          <button key={p} type="button" aria-pressed={proto === p} onClick={() => switchTo(p)}>{p}</button>
        ))}
      </div>

      {proto === 'A' && (
        <div className="pn-screen">
          <header className="pn-head"><h1>{TITLE[section]}</h1><span className="pn-pill">🔥 0</span></header>
          <div className="pn-body">{list(section)}</div>
          <nav className="pn-duobar" aria-label="Main">
            {(['today', 'journey', 'progress', 'me'] as Section[]).map((s) => (
              <button key={s} type="button" className={section === s ? 'on' : ''} aria-label={TITLE[s]} aria-current={section === s ? 'page' : undefined} onClick={() => setSection(s)}>
                <span aria-hidden="true">{ICON[s]}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {proto === 'B' && !inside && (
        <div className="pn-screen">
          <header className="pn-head"><h1>Hi {name}!</h1><span className="pn-pill">🔥 0</span></header>
          <button type="button" className="pn-continue" onClick={() => say('the next chapter')}>
            <img src={`${IMG}hoppy.jpg`} alt="" />
            <span><small>Continue the story</small><b>Next city</b></span>
            <i>GO</i>
          </button>
          <div className="pn-body">
            <AnimatedList key="B-home" theme="duo" frame={false} width="100%" maxHeight="100%" radius={16} gap={10}
              items={(['today', 'journey', 'progress', 'me'] as Section[]).map((s) => ({ id: s, icon: ICON[s], title: TITLE[s], description: s === 'today' ? 'Threat check, today’s path, every trainer' : s === 'journey' ? 'The world map, city by city' : s === 'progress' ? 'How you got better' : 'Settings, together, more', meta: '›' }))}
              onItemSelect={(_, i) => setInside((['today', 'journey', 'progress', 'me'] as Section[])[i])} />
          </div>
        </div>
      )}
      {proto === 'B' && inside && (
        <div className="pn-screen">
          <header className="pn-head pn-head-back">
            <button type="button" className="pn-back" onClick={() => setInside(null)} aria-label="Back">←</button>
            <h1>{TITLE[inside]}</h1>
          </header>
          <div className="pn-body">{list(inside)}</div>
        </div>
      )}

      {proto === 'C' && (
        <div className="pn-screen">
          <header className="pn-head"><h1>Hoppy</h1><span className="pn-pill">🔥 0</span></header>
          <div className="pn-tabs" role="tablist">
            {(['today', 'journey', 'progress'] as Section[]).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={section === s} onClick={() => setSection(s)}>{TITLE[s]}</button>
            ))}
            <button type="button" className="pn-gear" aria-label="Profile" onClick={() => setSection('me')}>👤</button>
          </div>
          <div className="pn-body">{list(section)}</div>
        </div>
      )}

      {toast && <div className="pn-toast" role="status">{toast}</div>}
    </div>
  )
}
