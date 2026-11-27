import { useMemo, useState } from 'react'
import { AnimatedList, type ListItem } from '../components/AnimatedList'
import { ProgressViz } from '../components/ProgressViz'
import { useGames } from '../hooks/useGames'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { useRepertoire } from '../hooks/useRepertoire'
import { clampScore } from '../lib/blunders'
import { chapters } from '../lib/chapters'
import { hasOwnPlayer } from '../lib/chesscom'
import { chapterOf } from '../lib/cityBook'
import type { Puzzle } from '../lib/db'
import { STATIONS, loadKing, route, stationById } from '../lib/king'
import { dateKey } from '../lib/progress'
import { isDue } from '../lib/srs'
import { mineOf } from '../lib/trainingToday'
import { dayNumber, loadResults } from '../lib/threatcheck'
import { nextCity, openCity } from '../lib/travel'

// #/proto – prototype of the whole app, structure v2 from docs/APP_PLAN.md (Lu, 27.11.2026):
// bar 🔥 Today · ♔ White · ♚ Black · 📊 Progress · 🧭 Story (Duolingo bar, icons only, no middle button), no
// "Training" level – everything for White runs under White, everything for Black under Black, the mixed daily path is
// Today. Profile = round picture top right. Rows open the real pages; the real navigation of the app is unchanged.
const IMG = import.meta.env.BASE_URL + 'king/'
type Section = 'today' | 'white' | 'black' | 'progress' | 'story'
type Row = ListItem & { to: string }
type Group = { title: string; rows: Row[] }
type Prog = ReturnType<typeof useProgress>
type Rep = ReturnType<typeof useRepertoire>
type Side = 'w' | 'b'

const TABS: { s: Section; icon: string; label: string }[] = [
  { s: 'today', icon: '🔥', label: 'Today' },
  { s: 'white', icon: '♔', label: 'White' },
  { s: 'black', icon: '♚', label: 'Black' },
  { s: 'progress', icon: '📊', label: 'Progress' },
  { s: 'story', icon: '🧭', label: 'Story' },
]

function Groups({ groups, k, dark }: { groups: Group[]; k: string; dark?: boolean }) {
  return (
    <>
      {groups.filter((g) => g.rows.length).map((g) => (
        <section key={k + g.title} className="pn-group">
          <h2>{g.title}</h2>
          <AnimatedList items={g.rows} theme={dark ? 'dark' : 'duo'} frame={false} width="100%" maxHeight="none" radius={16} gap={10} stagger={0.035} showGradients={false} displayScrollbar={false} selectOnHover={false}
            onItemSelect={(_, i) => go(g.rows[i].to)} />
        </section>
      ))}
    </>
  )
}

// ---------- 🔥 Today: a little journey strip, the week, the mixed daily path, free play ----------
function TravelStrip({ onOpen }: { onOpen: () => void }) {
  const king = loadKing()
  const next = nextCity(king.beaten)
  const bosses = STATIONS.filter((s) => !s.finale).length
  const beaten = king.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length
  return (
    <button type="button" className="pn-travel" onClick={onOpen} aria-label="Open the story">
      <img src={`${IMG}${next ? 'stamp-' + next.id : 'hoppy'}.jpg`} alt="" />
      <span><b>🐴 Hoppy {next ? `travels to ${next.name}` : 'travelled the world'}</b><i><em style={{ width: `${(100 * beaten) / bosses}%` }} /></i></span>
      <small>{beaten}/{bosses}</small>
    </button>
  )
}
// Lu, 27.11.: "Im Today ist zu viel, das macht man nicht an einem Tag – höchstens fünf Minuten Material."
// Today = ONE short session of four steps (about 5 minutes), then "done for today". More = White / Black.
function Today({ progress, onStory, rep, puzzles, player }: { progress: Prog; onStory: () => void; rep: Rep; puzzles: Puzzle[]; player: string }) {
  const [now] = useState(() => Date.now())
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i)
    const a = progress.days.get(dateKey(d))
    return { label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), on: !!a && a.lines + a.puzzles + (a.games ?? 0) + a.xp > 0, today: dateKey(d) === dateKey(new Date(now)) }
  })
  const day = dayNumber()
  const threatDone = !!loadResults()[day]
  // one of your own mistakes – a different one every day
  const mine = mineOf(puzzles, player)
  const mistake = mine.length ? mine[day % mine.length] : undefined
  // up to two due lines, else one new line
  const due = rep.lines.filter((l) => l.source !== 'import' && isDue(rep.srs.get(l.id), now)).slice(0, 2)
  const fresh = due.length ? undefined : rep.lines.find((l) => l.source !== 'import' && !rep.srs.get(l.id))
  const steps: { icon: string; title: string; sub: string; min: number; to: string; done?: boolean }[] = [
    { icon: '🎯', title: 'Threat Check', sub: 'What does your opponent threaten?', min: 1, to: 'threat-check', done: threatDone },
    ...(mistake ? [{ icon: '🩹', title: 'One of your mistakes', sub: `From your game vs ${mistake.opponent}`, min: 1, to: 'mistake/' + encodeURIComponent(mistake.id) }] : []),
    ...(due.length
      ? [{ icon: '🗺', title: due.length === 1 ? '1 line to repeat' : '2 lines to repeat', sub: due.map((l) => l.title.split(': ').pop()).join(' · '), min: 2, to: 'drill/' + due[0].id }]
      : fresh ? [{ icon: '✨', title: 'One new line', sub: fresh.title, min: 2, to: 'learn/' + fresh.id }] : []),
    { icon: '💥', title: 'Square Rush', sub: '60 seconds', min: 1, to: 'rush' },
  ]
  const minutes = steps.reduce((m, x) => m + x.min, 0)
  const done = steps.filter((x) => x.done).length
  const C = 2 * Math.PI * 26
  return (
    <>
      <TravelStrip onOpen={onStory} />
      <div className="pn-week" aria-label="This week">
        {week.map((d, i) => (
          <span key={i} className={`${d.on ? 'on' : ''}${d.today ? ' today' : ''}`}><i>{d.on ? '🔥' : ''}</i><small>{d.label}</small></span>
        ))}
      </div>
      <div className="pn-five">
        <div className="pn-five-head">
          <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="9" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - done / steps.length)} transform="rotate(-90 32 32)" />
            <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">{done}/{steps.length}</text>
          </svg>
          <span><small>Today · about {minutes} minutes</small><b>{done >= steps.length ? 'Done for today – well played!' : 'Your short session'}</b></span>
        </div>
        <ol>
          {steps.map((x) => (
            <li key={x.title}>
              <button type="button" className={x.done ? 'done' : ''} onClick={() => go(x.to)}>
                <span className="e" aria-hidden="true">{x.done ? '✓' : x.icon}</span>
                <span className="t"><b>{x.title}</b><small>{x.sub}</small></span>
                <span className="m">{x.min} min</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="pn-more-note">Want more today? Go on with ♔ White or ♚ Black.</p>
      <details className="pn-more">
        <summary>More to play</summary>
        <Groups k="more" groups={[{ title: '', rows: [
          { to: 'puzzle-rush', icon: '⏱', title: 'Puzzle Rush', description: '3 minutes, 3 lives' },
          { to: 'armoury', icon: '🛡', title: 'Armoury', description: 'Tactics to endgame' },
          { to: 'daily', icon: '🃏', title: 'Today’s cards', description: 'Everything due, mixed' },
          { to: 'tent', icon: '⭐', title: 'The long daily path', description: 'All levels of today' },
        ] }]} />
      </details>
    </>
  )
}

// ---------- ♔ White / ♚ Black: everything of one colour ----------
function SidePage({ side, rep, puzzles, player }: { side: Side; rep: Rep; puzzles: Puzzle[]; player: string }) {
  const [now] = useState(() => Date.now())
  const { G } = useGames(player, puzzles)
  const white = side === 'w'
  const name = white ? 'White' : 'Black'
  // quick numbers of this colour (real games)
  const mine = (G ?? []).filter((g) => g.color === side)
  const win = mine.length ? mine.filter((g) => g.result === 'w').length / mine.length : null
  const fam = new Map<string, number[]>()
  for (const g of mine) fam.set(g.family, [...(fam.get(g.family) ?? []), g.result === 'w' ? 1 : 0])
  const enough = [...fam.entries()].filter(([, r]) => r.length >= 10).map(([f, r]) => ({ f, w: r.reduce((a, b) => a + b, 0) / r.length, n: r.length }))
  const best = [...enough].sort((a, b) => b.w - a.w)[0], worst = [...enough].sort((a, b) => a.w - b.w)[0]

  const chs = useMemo(() => chapters(rep.lines).filter((c) => c.side === side), [rep.lines, side])
  const rowOf = (c: (typeof chs)[number]): Row => {
    const played = c.lines.filter((l) => rep.srs.get(l.id)).length
    const due = c.lines.filter((l) => isDue(rep.srs.get(l.id), now))
    // Lu, 27.11.: an opening opens its own path with the story, not straight a drill
    const to = 'opening/' + encodeURIComponent(c.key)
    return { id: c.key, to, icon: white ? '♙' : '♟', title: c.title, description: `${played} of ${c.lines.length} lines${due.length ? ` · ${due.length} due` : ''}`, meta: due.length ? '!' : played === c.lines.length ? '✓' : '' }
  }
  // sorted like the app's opening book: one group per section (e.g. "White · 1.e4 e5", "White · 1.d4")
  const openingGroups: Group[] = [...new Set(chs.map((c) => c.group))].map((g) => ({ title: g.replace(/^(White|Black) · /, ''), rows: chs.filter((c) => c.group === g).map(rowOf) }))
  const myMistakes = mineOf(puzzles, player).filter((p) => p.myColor === side)
  const threats = myMistakes.filter((p) => !!p.refutation)
  const winning = myMistakes.filter((p) => clampScore(p.scoreBefore) >= 300)
  const [pick] = useState(() => Math.random()) // one treasure per visit
  const treasure = winning[Math.floor(pick * winning.length)]

  return (
    <>
      <div className={`pn-sidehero ${white ? 'w' : 'b'}`}>
        <span className="pn-piece" aria-hidden="true">{white ? '♔' : '♚'}</span>
        <div>
          <small>You with {name}</small>
          <b>{win == null ? '–' : `${Math.round(win * 100)}% won`}</b>
          <span>{mine.length ? `${mine.length} rapid games` : G ? 'No rapid games yet' : 'Loading your games …'}</span>
        </div>
        <button type="button" onClick={() => go('progress')}>Stats ›</button>
      </div>
      {best && worst && best.f !== worst.f && (
        <div className="pn-chips"><span className="good">Best: {best.f} · {Math.round(best.w * 100)}%</span><span className="bad">Hardest: {worst.f} · {Math.round(worst.w * 100)}%</span></div>
      )}
      <Groups k={side} dark={!white} groups={[
        ...openingGroups.map((g) => ({ ...g, title: `${name} openings · ${g.title}` })),
        { title: 'Practise the openings', rows: [
          { to: 'opening-rush', icon: '⚡', title: 'Opening Rush', description: `Your ${name} openings on time` },
          { to: `surprise/${side}`, icon: '🎲', title: 'Surprise me', description: `A random ${name} line you know` },
          { to: `map/${side}`, icon: '🗺', title: 'What to play when?', description: white ? 'Black’s replies and your answer' : 'White’s first moves and your answer' },
          ...(white ? [] : [
            { to: 'black-course', icon: '♚', title: 'Hoppy’s Black training', description: '1...d5 against everything' },
            { to: 'black', icon: '🎛', title: 'Your Black system', description: 'Pick your answer to 1.e4 and 1.d4' },
          ]),
        ] },
        { title: 'Tactics & your mistakes', rows: [
          { to: `puzzles/color/${side}`, icon: '🩹', title: `Your mistakes with ${name}`, description: `${myMistakes.length} positions from your own games` },
          { to: `threats/color/${side}`, icon: '🗼', title: 'What does your opponent threaten?', description: `${threats.length} positions from your ${name} games` },
          ...(treasure ? [{ to: 'play/puzzle/' + encodeURIComponent(treasure.id), icon: '💰', title: 'Treasure chest', description: `Win your won positions again · ${winning.length}` }] : []),
          { to: 'attacks', icon: '🪤', title: 'Attacks & traps', description: 'Every famous attack with its defence' },
        ] },
        { title: 'Play', rows: [
          { to: `play/${side}`, icon: '🐴', title: `Hoppy-Bot · you play ${name}`, description: 'A game at your level' },
          { to: 'habits', icon: '🔁', title: 'Your habits', description: 'Where you leave your book' },
          ...(white ? [] : [{ to: 'mirror', icon: '🪞', title: 'The Mirror World', description: 'The story’s second act – you play Black' }]),
        ] },
      ]} />
    </>
  )
}

// ---------- 📊 Progress ----------
function ProgressTab({ player, puzzles }: { player: string; puzzles: Puzzle[] }) {
  return (
    <>
      <button type="button" className="pn-update" onClick={() => go(hasOwnPlayer() ? 'connect/read' : 'connect')}>
        <span aria-hidden="true">🔄</span>
        <span><b>Update the analysis</b><small>Hoppy checks your newest chess.com games</small></span>
        <i>GO</i>
      </button>
      <ProgressViz player={player} puzzles={puzzles} />
    </>
  )
}

// ---------- 🧭 Story ----------
function Story() {
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
        <button type="button" onClick={() => go('diary')}>📔 Diary</button>
      </div>
      <Groups k="story" groups={[
        { title: `Done · ${beaten.length}`, rows: beaten.map((s) => row(s, '✓')) },
        { title: 'Still ahead', rows: ahead.map((s) => row(s)) },
        { title: 'More', rows: [
          { to: 'painted', icon: '🎨', title: 'The painted map', description: 'The world as a painting' },
          { to: 'quests', icon: '📖', title: 'Quest book', description: 'Your quests' },
          { to: 'portal', icon: '🌀', title: 'Real world', description: 'Quests from your chess.com games' },
        ] },
      ]} />
    </>
  )
}

// ---------- profile (round picture top right) ----------
const PROFILE: Group[] = [
  { title: 'You', rows: [
    { to: 'settings', icon: '⚙️', title: 'Settings', description: 'Name, chess.com account, sound, look' },
    { to: 'trophies', icon: '🏆', title: 'Trophies', description: 'What you have won' },
  ] },
  { title: 'Together', rows: [{ to: 'watch', icon: '👫', title: 'Together', description: 'Watch and help each other' }] },
]

export function ProtoNav({ player, puzzles, progress, rep }: { player: string; puzzles: Puzzle[]; progress: Prog; rep: Rep }) {
  const [section, setSection] = useState<Section>('today')
  const [profile, setProfile] = useState(false)
  const name = (() => {
    try {
      return localStorage.getItem('chess-trainer-name') || 'you'
    } catch {
      return 'you'
    }
  })()
  const title = profile ? 'Profile' : TABS.find((t) => t.s === section)!.label
  return (
    <div className={`pn${section === 'black' && !profile ? ' pn-dark' : ''}`}>
      <div className="pn-proto">
        <button type="button" className="pn-exit" onClick={() => go('')} aria-label="Leave the prototype">✕</button>
        <span>PROTOTYPE · STRUCTURE V2</span>
      </div>
      <div className="pn-screen">
        <header className="pn-head">
          {profile && <button type="button" className="pn-back" onClick={() => setProfile(false)} aria-label="Back">←</button>}
          <h1>{title}</h1>
          <span className="pn-pill">🔥 {progress.streak}</span>
          {!profile && <button type="button" className="pn-avatar" onClick={() => setProfile(true)} aria-label="Profile">{name.slice(0, 1).toUpperCase()}</button>}
        </header>
        <div className="pn-scroll" key={profile ? 'profile' : section}>
          {profile ? <Groups k="profile" groups={PROFILE} /> : section === 'today' ? <Today progress={progress} onStory={() => setSection('story')} rep={rep} puzzles={puzzles} player={player} />
            : section === 'white' ? <SidePage side="w" rep={rep} puzzles={puzzles} player={player} />
            : section === 'black' ? <SidePage side="b" rep={rep} puzzles={puzzles} player={player} />
            : section === 'progress' ? <ProgressTab player={player} puzzles={puzzles} />
            : <Story />}
        </div>
        <nav className="pn-duobar pn-bar5" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.s} type="button" className={!profile && section === t.s ? 'on' : ''} aria-label={t.label} aria-current={!profile && section === t.s ? 'page' : undefined}
              onClick={() => { setProfile(false); setSection(t.s) }}>
              <span aria-hidden="true">{t.icon}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
