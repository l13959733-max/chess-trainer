import { useMemo, useState, type ReactNode } from 'react'
import { AnimatedList, type ListItem } from '../components/AnimatedList'
import { ProgressViz } from '../components/ProgressViz'
import { DuoBar } from '../components/DuoBar'
import { useGames } from '../hooks/useGames'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { useRepertoire } from '../hooks/useRepertoire'
import { clampScore } from '../lib/blunders'
import { ATLAS } from '../lib/atlas'
import { ARENA_KEYS, keyOf } from '../lib/openingRush'
import { bestChapter, type PGame } from '../lib/progressStats'
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

// The main pages of the app, structure v2 from docs/APP_PLAN.md (Lu, 27.11.2026): 🔥 the start page (HomeHub) and
// Today (one 5-minute session) · ♔ White · ♚ Black · 📊 Progress · 🧭 Story, plus Profile (round picture top right).
// "Everything for White runs under White, everything for Black under Black", no Training level, Duolingo bar with
// icons only (components/DuoBar.tsx). Came from the prototype #/proto.
const IMG = import.meta.env.BASE_URL + 'king/'
export type Section = 'today' | 'white' | 'black' | 'progress' | 'story' | 'profile'
type Row = ListItem & { to: string; op?: { key: string; played: number; total: number; due: number } } // op: an opening card
type Group = { title: string; rows: Row[]; render?: (row: Row) => ReactNode }
type Prog = ReturnType<typeof useProgress>
type Rep = ReturnType<typeof useRepertoire>
type Side = 'w' | 'b'

const TITLE: Record<Section, string> = { today: 'Today', white: 'White', black: 'Black', progress: 'Progress', story: 'Story', profile: 'Profile' }

function Groups({ groups, k, dark }: { groups: Group[]; k: string; dark?: boolean }) {
  return (
    <>
      {groups.filter((g) => g.rows.length).map((g) => (
        <section key={k + g.title} className="pn-group">
          <h2>{g.title}</h2>
          <AnimatedList items={g.rows} renderItem={g.render ? (it) => g.render!(it as Row) : undefined} theme={dark ? 'dark' : 'duo'} frame={false} width="100%" maxHeight="none" radius={16} gap={10} stagger={0.035} showGradients={false} displayScrollbar={false} selectOnHover={false}
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
          { to: 'warmup', icon: '🔥', title: 'Warm-up', description: '2 minutes before chess.com' },
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
  const mine = useMemo(() => (G ?? []).filter((g) => g.color === side), [G, side])
  const win = mine.length ? mine.filter((g) => g.result === 'w').length / mine.length : null

  const chs = useMemo(() => chapters(rep.lines).filter((c) => c.side === side), [rep.lines, side])
  // Lu, 27.11.: "die Statistik zu den Openings – wie erfolgreich ich damit bin, wie weit ich es gelernt habe – beibehalten,
  // ausarbeiten": every real game goes to the chapter whose line it followed the longest (lib/progressStats.bestChapter)
  const byChapter = useMemo(() => {
    const m = new Map<string, PGame[]>()
    for (const g of mine) {
      const k = bestChapter(g.sans, chs)
      if (k) m.set(k, [...(m.get(k) ?? []), g])
    }
    return m
  }, [mine, chs])
  const statOf = (key: string) => {
    const gs = byChapter.get(key) ?? []
    const A = gs.filter((g) => g.analysed)
    return { n: gs.length, win: gs.length ? gs.filter((g) => g.result === 'w').length / gs.length : null, mpg: A.length ? A.reduce((s2, g) => s2 + g.mistakes.length, 0) / A.length : null }
  }
  const ranked = chs.map((c) => ({ c, ...statOf(c.key) })).filter((x) => x.n >= 8 && x.win != null)
  const best = [...ranked].sort((a2, b2) => b2.win! - a2.win!)[0], worst = [...ranked].sort((a2, b2) => a2.win! - b2.win!)[0]
  const fits = (c: (typeof chs)[number]) => ATLAS.find((e) => e.side === side && c.lines.some((l) => l.opening === e.opening))?.fits

  const rowOf = (c: (typeof chs)[number]): Row => {
    const played = c.lines.filter((l) => rep.srs.get(l.id)).length
    const due = c.lines.filter((l) => isDue(rep.srs.get(l.id), now)).length
    // Lu, 27.11.: an opening opens its own path with the story, not straight a drill
    return { id: c.key, to: 'opening/' + encodeURIComponent(c.key), icon: white ? '♙' : '♟', title: c.title, op: { key: c.key, played, total: c.lines.length, due } }
  }
  // one opening card: how far learned (bar) and how it goes in your real games
  const renderOpening = (row: Row) => {
    const { key, played, total, due } = row.op!
    const c = chs.find((x) => x.key === key)!
    const st = statOf(c.key)
    const f = fits(c)
    return (
      <>
        <span className="animated-list__lead">{row.icon}</span>
        <span className="pn-op">
          <b>{c.title}{due > 0 && <em className="pn-due">{due} due</em>}</b>
          {f && <small className="pn-fits">{f}</small>}
          <span className="pn-op-learn"><i><em style={{ width: `${(100 * played) / total}%` }} /></i><span>{played === total ? 'all lines learned' : `${played} of ${total} lines learned`}</span></span>
          <span className="pn-op-games">
            {st.n ? (
              <><b className={st.n < 5 ? '' : st.win! >= 0.55 ? 'good' : st.win! < 0.4 ? 'bad' : ''}>{Math.round(st.win! * 100)}% won</b> · {st.n} {st.n === 1 ? 'game' : 'games'}{st.mpg != null && ` · ${st.mpg.toFixed(1)} mistakes/game`}</>
            ) : (
              'No rapid games with it yet'
            )}
          </span>
        </span>
      </>
    )
  }
  // sorted like the app's opening book: one group per section (e.g. "White · 1.e4 e5", "White · 1.d4")
  const openingGroups: Group[] = [...new Set(chs.map((c) => c.group))].map((g) => ({ title: g.replace(/^(White|Black) · /, ''), rows: chs.filter((c) => c.group === g).map(rowOf), render: renderOpening }))
  const rushKeys = [...new Set(chs.flatMap((c) => c.lines.map((l) => keyOf(l.opening ?? '', side))))].filter((k) => ARENA_KEYS.includes(k))
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
      {best && worst && best.c.key !== worst.c.key && (
        <div className="pn-chips"><span className="good">Best: {best.c.title} · {Math.round(best.win! * 100)}%</span><span className="bad">Hardest: {worst.c.title} · {Math.round(worst.win! * 100)}%</span></div>
      )}
      <Groups k={side} dark={!white} groups={[
        ...openingGroups.map((g) => ({ ...g, title: `${name} openings · ${g.title}` })),
        // Lu, 27.11.: Opening Rush, Surprise me, What to play when, Atlas and All openings were doubles of this page –
        // each opening's own page has its path, Rush and story; here only ONE test over all openings of this colour
        ...(rushKeys.length ? [{ title: 'Test yourself', rows: [{ to: 'opening-rush/' + encodeURIComponent(rushKeys.join('~')), icon: '⚡', title: `Test all ${name} openings`, description: 'Mixed and on time – every opening of your book' }] }] : []),
        ...(white ? [] : [{ title: 'Your Black system', rows: [
          { to: 'black-course', icon: '♚', title: 'Hoppy’s Black training', description: '1...d5 against everything' },
          { to: 'black-system', icon: '🎛', title: 'Pick your Black system', description: 'Your answer to 1.e4 and 1.d4' },
        ] }]),
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
      {/* Lu, 28.11.: "mein letztes Game geratet per Elo, Tipps, erklärt warum Sachen nicht gut sind" */}
      <button type="button" className="pn-lastgame" onClick={() => go('last-game')}>
        <span aria-hidden="true">♟</span>
        <span><b>Your last game</b><small>How strong it was, what went wrong and why, tips</small></span>
        <i>SEE</i>
      </button>
      <button type="button" className="pn-update" onClick={() => go(hasOwnPlayer() ? 'connect/read' : 'connect')}>
        <span aria-hidden="true">🔄</span>
        <span><b>Update the analysis</b><small>Hoppy checks your newest chess.com games</small></span>
        <i>GO</i>
      </button>
      <ProgressViz player={player} puzzles={puzzles} />
      <Groups k="analyses" groups={[{ title: 'Your analyses', rows: [
        { to: 'weaknesses', icon: '🧩', title: 'My weaknesses', description: 'Your mistakes by kind – rules and training' },
        { to: hasOwnPlayer() ? 'games' : 'connect', icon: '♟', title: 'Your chess.com games', description: 'Every finished game, checked by Hoppy' },
        { to: 'check', icon: '🔍', title: 'Chess check', description: 'What costs you points?' },
        { to: 'accuracy', icon: '📊', title: 'How well did I play? (test)', description: 'Three ways to score your games' },
      ] }]} />
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
          { to: 'road', icon: '🚀', title: 'Fast travel', description: 'Every city in a list' },
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
  { title: 'Your opening book', rows: [
    { to: 'path', icon: '📚', title: 'The whole book', description: 'Every line of both colours · daily goal · analyse all games' },
    { to: 'import', icon: '📥', title: 'Import a PGN', description: 'Add your own lines' },
  ] },
  { title: 'Together', rows: [{ to: 'watch', icon: '👫', title: 'Together', description: 'Watch and help each other' }] },
]

export function SectionPage({ section, player, puzzles, progress, rep }: { section: Section; player: string; puzzles: Puzzle[]; progress: Prog; rep: Rep }) {
  const name = (() => {
    try {
      return localStorage.getItem('chess-trainer-name') || 'you'
    } catch {
      return 'you'
    }
  })()
  const profile = section === 'profile'
  return (
    <div className={`pn pn-page${section === 'black' ? ' pn-dark' : ''}`}>
      <div className="pn-screen">
        <header className="pn-head">
          {profile && <button type="button" className="pn-back" onClick={() => window.history.back()} aria-label="Back">←</button>}
          <h1>{TITLE[section]}</h1>
          <span className="pn-pill">🔥 {progress.streak}</span>
          {!profile && <button type="button" className="pn-avatar" onClick={() => go('profile')} aria-label="Profile">{name.slice(0, 1).toUpperCase()}</button>}
        </header>
        <div className="pn-scroll">
          {profile ? <Groups k="profile" groups={PROFILE} />
            : section === 'today' ? <Today progress={progress} onStory={() => go('story')} rep={rep} puzzles={puzzles} player={player} />
            : section === 'white' ? <SidePage side="w" rep={rep} puzzles={puzzles} player={player} />
            : section === 'black' ? <SidePage side="b" rep={rep} puzzles={puzzles} player={player} />
            : section === 'progress' ? <ProgressTab player={player} puzzles={puzzles} />
            : <Story />}
        </div>
      </div>
      <DuoBar active={section === 'today' || section === 'profile' ? 'home' : section} />
    </div>
  )
}
