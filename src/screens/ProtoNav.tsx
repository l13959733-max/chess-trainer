import { useState } from 'react'
import { AnimatedList, type ListItem } from '../components/AnimatedList'
import { ProgressViz } from '../components/ProgressViz'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { Puzzle } from '../lib/db'
import { STATIONS, loadKing, route, stationById } from '../lib/king'
import { chapterOf } from '../lib/cityBook'
import { dateKey } from '../lib/progress'
import { pathProgress } from '../lib/trainingToday'
import { nextCity, openCity } from '../lib/travel'

// #/proto – navigation prototypes (Lu, 25.11.2026: "Duolingo-Style bleiben, Prototypen mit den animierten Listen; die
// Leiste, der Button in der Mitte und der lila Knopf sollen weg" → then: "sortieren, nicht alles nur Liste, Statistik
// visuell – Prototypen durchbauen"). A = Duolingo bar (icons only), B = no bar, the start page is a list, C = tabs on
// top. The content is the same in all three: sorted groups, a picture on top, Progress as charts. Rows open the real
// pages. Nothing in the real navigation changes.
const IMG = import.meta.env.BASE_URL + 'king/'
type Proto = 'A' | 'B' | 'C'
type Section = 'today' | 'journey' | 'progress' | 'me'
type Row = ListItem & { to: string }
type Group = { title: string; rows: Row[] }
type Prog = ReturnType<typeof useProgress>

const TODAY: Group[] = [
  { title: 'Now', rows: [
    { to: 'threat-check', icon: '🎯', title: 'Daily Threat Check', description: 'One position – what does your opponent threaten?' },
    { to: 'review', icon: '🗺', title: 'Lines to repeat', description: 'Your openings that are due' },
    { to: 'puzzles', icon: '🩹', title: 'Your mistakes', description: 'Positions from your own games' },
  ] },
  { title: 'Quick games', rows: [
    { to: 'rush', icon: '💥', title: 'Square Rush', description: 'Learn the squares – 60 seconds' },
    { to: 'puzzle-rush', icon: '⏱', title: 'Puzzle Rush', description: '3 minutes, 3 lives' },
    { to: 'opening-rush', icon: '⚡', title: 'Opening Rush', description: 'Your openings on time' },
    { to: 'play', icon: '♞', title: 'Hoppy-Bot', description: 'A game at your level' },
  ] },
  { title: 'Learn & train', rows: [
    { to: 'path', icon: '🪙', title: 'All openings', description: 'Every line, chapter by chapter' },
    { to: 'black-course', icon: '♚', title: 'Black training', description: '1...d5 against everything' },
    { to: 'atlas', icon: '🧭', title: 'Opening atlas', description: 'New weapons' },
    { to: 'attacks', icon: '🪤', title: 'Attacks & traps', description: 'With the defence' },
    { to: 'armoury', icon: '🛡', title: 'Armoury', description: 'Tactics to endgame' },
    { to: 'weaknesses', icon: '🧩', title: 'Weaknesses', description: 'Your own mistakes, trained' },
    { to: 'habits', icon: '🔁', title: 'Your habits', description: 'Where you leave your book' },
    { to: 'warmup', icon: '🔥', title: 'Warm-up', description: '2 minutes before chess.com' },
  ] },
]
const ME: Group[] = [
  { title: 'You', rows: [
    { to: 'settings', icon: '⚙️', title: 'Settings', description: 'Sound, look, chess.com account' },
    { to: 'trophies', icon: '🏆', title: 'Trophies', description: 'What you have won' },
    { to: 'diary', icon: '📔', title: 'Diary', description: 'What you learned in every city' },
  ] },
  { title: 'Together', rows: [{ to: 'watch', icon: '👫', title: 'Together', description: 'Watch and help each other' }] },
  { title: 'More worlds', rows: [
    { to: 'mirror', icon: '🪞', title: 'Mirror World', description: 'Act 2 – you play Black' },
    { to: 'painted', icon: '🎨', title: 'The painted map', description: 'The world as a painting' },
    { to: 'quests', icon: '📖', title: 'Quest book', description: 'Your quests' },
    { to: 'portal', icon: '🌀', title: 'Real world', description: 'Your chess.com games' },
  ] },
]
const TITLE: Record<Section, string> = { today: 'Today', journey: 'Journey', progress: 'Progress', me: 'Profile' }
const ICON: Record<Section, string> = { today: '🔥', journey: '🧭', progress: '📊', me: '👤' }
const SUB: Record<Section, string> = { today: 'Threat check, today’s path, every trainer', journey: 'The world map, city by city', progress: 'How you got better – in charts', me: 'Settings, trophies, more worlds' }

function Groups({ groups, k }: { groups: Group[]; k: string }) {
  return (
    <>
      {groups.map((g) => (
        <section key={k + g.title} className="pn-group">
          <h2>{g.title}</h2>
          <AnimatedList items={g.rows} theme="duo" frame={false} width="100%" maxHeight="none" radius={16} gap={10} stagger={0.035} showGradients={false} displayScrollbar={false} selectOnHover={false}
            onItemSelect={(_, i) => go(g.rows[i].to)} />
        </section>
      ))}
    </>
  )
}

function TodayTop({ progress }: { progress: Prog }) {
  const [now] = useState(() => Date.now())
  const [path] = useState(pathProgress)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i)
    const a = progress.days.get(dateKey(d))
    return { label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), on: !!a && a.lines + a.puzzles + (a.games ?? 0) + a.xp > 0, today: dateKey(d) === dateKey(new Date(now)) }
  })
  const ring = path && path.total ? path.done / path.total : 0
  const C = 2 * Math.PI * 26
  return (
    <>
      <div className="pn-week" aria-label="This week">
        {week.map((d, i) => (
          <span key={i} className={`${d.on ? 'on' : ''}${d.today ? ' today' : ''}`}><i>{d.on ? '🔥' : ''}</i><small>{d.label}</small></span>
        ))}
      </div>
      <button type="button" className="pn-pathcard" onClick={() => go('tent')}>
        <svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="9" />
          <circle cx="32" cy="32" r="26" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} transform="rotate(-90 32 32)" />
          <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">{path ? `${path.done}/${path.total}` : '0'}</text>
        </svg>
        <span><small>Today’s path</small><b>{!path ? 'Ready when you are' : path.done >= path.total ? 'All done – well played!' : `${path.total - path.done} levels left`}</b></span>
        <i>{!path || path.done === 0 ? 'START' : 'GO'}</i>
      </button>
    </>
  )
}

function JourneyTop() {
  const king = loadKing()
  const next = nextCity(king.beaten)
  const cities = route().map((id) => stationById(id)!).filter((s) => s && STATIONS.includes(s) && !s.finale)
  const beaten = cities.filter((s) => king.beaten.includes(s.id))
  const ahead = cities.filter((s) => !king.beaten.includes(s.id) && s.id !== next?.id)
  const row = (s: (typeof cities)[number], meta = ''): Row => ({ id: s.id, to: 'king/' + s.id, image: `${IMG}stamp-${s.id}.jpg`, title: s.name, description: chapterOf(s.id)?.headline ?? String(s.year), meta })
  return (
    <>
      {next && (
        <button type="button" className="pn-citycard" onClick={() => openCity(next.id)} style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.65)), url(${IMG}${next.id}.jpg)` }}>
          <small>Next · Chapter {cities.indexOf(next) + 1} of {cities.length}</small>
          <b>{next.name}</b>
          <span>{chapterOf(next.id)?.headline ?? ''}</span>
          <i>CONTINUE</i>
        </button>
      )}
      <div className="pn-mapbtns">
        <button type="button" onClick={() => go('journey')}>🗺 World map</button>
        <button type="button" onClick={() => go('road')}>🧭 All cities</button>
      </div>
      <Groups k="j" groups={[{ title: `Done · ${beaten.length}`, rows: beaten.map((s) => row(s, '✓')) }, { title: 'Still ahead', rows: ahead.slice(0, 6).map((s) => row(s)) }].filter((g) => g.rows.length)} />
    </>
  )
}

export function ProtoNav({ player, puzzles, progress }: { player: string; puzzles: Puzzle[]; progress: Prog }) {
  const [proto, setProto] = useState<Proto>('A')
  const [section, setSection] = useState<Section>('today')
  const [inside, setInside] = useState<Section | null>(null) // B: a section opened from the start list
  const name = (() => {
    try {
      return localStorage.getItem('chess-trainer-name') || 'you'
    } catch {
      return 'you'
    }
  })()
  const content = (s: Section) => (
    <div className="pn-scroll" key={proto + s}>
      {s === 'today' && <><TodayTop progress={progress} /><Groups k="t" groups={TODAY} /></>}
      {s === 'journey' && <JourneyTop />}
      {s === 'progress' && <ProgressViz player={player} puzzles={puzzles} />}
      {s === 'me' && <Groups k="m" groups={ME} />}
    </div>
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
          <header className="pn-head"><h1>{TITLE[section]}</h1><span className="pn-pill">🔥 {progress.streak}</span></header>
          {content(section)}
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
          <header className="pn-head"><h1>Hi {name}!</h1><span className="pn-pill">🔥 {progress.streak}</span></header>
          <div className="pn-scroll">
            <button type="button" className="pn-continue" onClick={() => go('')}>
              <img src={`${IMG}hoppy.jpg`} alt="" />
              <span><small>Continue the story</small><b>{nextCity(loadKing().beaten)?.name ?? 'The world map'}</b></span>
              <i>GO</i>
            </button>
            <section className="pn-group">
              <AnimatedList key="B-home" theme="duo" frame={false} width="100%" maxHeight="none" radius={16} gap={10} showGradients={false} displayScrollbar={false} selectOnHover={false}
                items={(['today', 'journey', 'progress', 'me'] as Section[]).map((s) => ({ id: s, icon: ICON[s], title: TITLE[s], description: SUB[s], meta: '›' }))}
                onItemSelect={(_, i) => setInside((['today', 'journey', 'progress', 'me'] as Section[])[i])} />
            </section>
          </div>
        </div>
      )}
      {proto === 'B' && inside && (
        <div className="pn-screen">
          <header className="pn-head">
            <button type="button" className="pn-back" onClick={() => setInside(null)} aria-label="Back">←</button>
            <h1>{TITLE[inside]}</h1>
          </header>
          {content(inside)}
        </div>
      )}

      {proto === 'C' && (
        <div className="pn-screen">
          <header className="pn-head"><h1>Hoppy</h1><span className="pn-pill">🔥 {progress.streak}</span></header>
          <div className="pn-tabs" role="tablist">
            {(['today', 'journey', 'progress'] as Section[]).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={section === s} onClick={() => setSection(s)}>{TITLE[s]}</button>
            ))}
            <button type="button" className="pn-gear" aria-label="Profile" aria-selected={section === 'me'} onClick={() => setSection('me')}>👤</button>
          </div>
          {content(section)}
        </div>
      )}
    </div>
  )
}
