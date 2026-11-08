import { Chess } from 'chess.js'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE } from '../components/Board'
import { Avatar, Portrait, SHIP_INNER } from '../components/KingArt'
import { PathStep } from '../components/PathStep'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import type { Repertoire } from '../hooks/useRepertoire'
import type { Line } from '../lib/pgn'
import { recentRapid } from '../lib/analyzer'
import { bookReport, habitCrossroads } from '../lib/check'
import { getPlayer, myColor } from '../lib/chesscom'
import { cleanGames, shadowStrikes, shine } from '../lib/clean'
import { getGameRecords, getPuzzles } from '../lib/db'
import { REAL_QUESTS } from '../lib/portal'
import PUZZLES from '../data/lichess-puzzles.json'
import { clampScore } from '../lib/blunders'
import { ChestnutReward } from '../components/Chestnut'
import { feedback as fx, resetCareful, takeCareful } from '../lib/feedback'
import {
  ARMY, CROSSROADS, MIRROR, mirrorOpen, FORKS, GRAIN, GUARD, GUARD_BOSS, LEWIS, MATES, QUEEN_TACTICS, RIDDLES, ROME_REACT, ROME_THREATS, ROME_TRAPS, ROOK_MATES, SAFE, STATIONS, TENT_AT, TURK,
  bookCrossroads, earn, isOpen, liamPortrait, opensAfter, lineRounds, loadKing, nextStation, reputation, saveKing, stationById, stationLines, titleOf, type BoardRound, type Crossroad, type QuizQuestion, type Station,
} from '../lib/king'
import '../king.css'

const IMG = import.meta.env.BASE_URL + 'king/'
// Liam's medallion floats this far above the city
const TOKEN_LIFT = 72
const BOSSES = STATIONS.filter((s) => !s.finale).length

function useToast(): [string | null, (t: string) => void] {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  return [
    text,
    (t: string) => {
      setText(t)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setText(null), 2600)
    },
  ]
}

// ---------- the start page: the world map ----------

export function KingHome() {
  const [intro, setIntro] = useState(() => loadKing().intro)
  if (!intro)
    return (
      <KingIntro
        onDone={() => {
          saveKing({ ...loadKing(), intro: true })
          setIntro(true)
        }}
      />
    )
  return <KingMap />
}

// Soft, painted-looking fog over places not discovered yet
const FOG = (x: number, y: number) =>
  `<g filter="url(#king-fog)" opacity=".94"><ellipse cx="${x - 16}" cy="${y - 4}" rx="38" ry="18" fill="#f6eedc"/><ellipse cx="${x + 20}" cy="${y + 6}" rx="32" ry="15" fill="#efe4cc"/><ellipse cx="${x + 2}" cy="${y - 20}" rx="26" ry="15" fill="#fbf5e6"/></g><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="22" font-weight="900" fill="#8b6b3d" opacity=".75">?</text>`

function KingMap() {
  const [state, setState] = useState(loadKing)
  const [toast, showToast] = useToast()
  const scroller = useRef<HTMLDivElement>(null)
  const token = useRef<SVGGElement>(null)
  const ship = useRef<SVGGElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const traveling = useRef(false)
  const here = stationById(state.here) ?? STATIONS[0]
  const beatenCount = state.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length
  const crowned = state.beaten.includes('chennai')
  // honest numbers from the analysed real games: clean games brighten the map, the Shadow's strikes
  const [real, setReal] = useState<{ clean: number; shadow: { games: number; struck: number } | null } | null>(null)
  useEffect(() => {
    const player = state.baseline?.player ?? getPlayer()
    Promise.all([getGameRecords(player), getPuzzles()])
      .then(([records, puzzles]) => setReal({ clean: state.baseline ? cleanGames(records, state.baseline.at).length : 0, shadow: shadowStrikes(records, puzzles.filter((p) => (p.player ?? 'l0o2') === player && p.source !== 'bot')) }))
      .catch(() => {})
  }, [state.baseline])
  const glow = shine(real?.clean ?? 0)

  // After a boss Liam rides on by himself to the next station
  const travelNow = useRef<(to: Station, ambushAllowed?: boolean) => void>(() => {})
  useEffect(() => {
    travelNow.current = travel
  })
  useEffect(() => {
    const to = stationById(loadKing().travel)
    if (!to) return
    const t = window.setTimeout(() => {
      saveKing({ ...loadKing(), travel: undefined })
      travelNow.current(to, false)
    }, 700)
    return () => window.clearTimeout(t)
  }, [])

  // Open on the station where Liam stands
  useEffect(() => {
    const sc = scroller.current
    if (!sc) return
    sc.scrollLeft = Math.max(0, here.x - sc.clientWidth / 2)
    sc.scrollTop = Math.max(0, here.y - sc.clientHeight / 2)
  }, [here])

  function travel(target: Station, ambushAllowed = true) {
    if (traveling.current) return
    if (!isOpen(target, state.beaten)) {
      showToast(`${target.name} is still in the fog. First beat the boss in ${opensAfter(target, state.beaten)?.name ?? 'the city before'}.`)
      return
    }
    if (target.id === here.id) {
      go('king/' + target.id)
      return
    }
    const el = token.current
    const sc = scroller.current
    if (!el || !sc || !svg.current) return
    traveling.current = true
    const sea = !!(target.sea || here.sea)
    const mx = (here.x + target.x) / 2
    const my = (here.y + target.y) / 2
    const bend = sea ? 0.2 : 0.1
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', `M${here.x},${here.y} Q${mx - (target.y - here.y) * bend},${my + (target.x - here.x) * bend} ${target.x},${target.y}`)
    path.setAttribute('fill', 'none')
    svg.current.appendChild(path)
    const len = path.getTotalLength()
    if (ship.current) ship.current.style.display = sea ? '' : 'none'
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dur = reduce ? 1 : Math.min(2400, 400 + len * 2.2)
    // now and then a scout of the Shadow Realm blocks the road halfway (not more than every 15 minutes)
    const ambush = ambushAllowed && !reduce && canBeAmbushed(state.beaten) && Math.random() < 0.35 && Date.now() - lastAmbush() > 15 * 60 * 1000
    let t0 = 0
    const frame = (now: number) => {
      t0 ||= now
      const t = Math.min(1, (now - t0) / dur)
      if (ambush && t >= 0.5) {
        path.remove()
        traveling.current = false
        markAmbush()
        go('encounter/' + target.id)
        return
      }
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const pt = path.getPointAtLength(e * len)
      el.setAttribute('transform', `translate(${pt.x},${pt.y - TOKEN_LIFT})`)
      sc.scrollLeft = Math.max(0, pt.x - sc.clientWidth / 2)
      sc.scrollTop = Math.max(0, pt.y - sc.clientHeight / 2)
      if (t < 1) requestAnimationFrame(frame)
      else {
        path.remove()
        traveling.current = false
        const next = { ...loadKing(), here: target.id }
        saveKing(next)
        setState(next)
        go('king/' + target.id)
      }
    }
    requestAnimationFrame(frame)
  }

  return (
    <div className="king-map">
      <div className="king-scroll" ref={scroller}>
        <svg ref={svg} className="king-world" viewBox="0 0 1800 764" role="img" aria-label="World map of Liam's journey">
          <defs>
            <filter id="king-fog" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" /></filter>
            <radialGradient id="king-glow"><stop offset="0" stopColor="#ffe08a" stopOpacity=".75" /><stop offset="1" stopColor="#ffe08a" stopOpacity="0" /></radialGradient>
            <clipPath id="king-clip-big"><circle r="23" /></clipPath>
            <clipPath id="king-clip-small"><circle r="9" /></clipPath>
          </defs>
          <image href={IMG + 'worldmap.jpg'} x="0" y="0" width="1800" height="764" />
          {glow > 0 && <rect className="king-shine" x="0" y="0" width="1800" height="764" fill="#fff3c4" opacity={(0.08 + 0.3 * glow).toFixed(2)} />}
          {STATIONS.map((s) => {
            const beaten = state.beaten.includes(s.id)
            const open = isOpen(s, state.beaten)
            return (
              <g
                key={s.id}
                className="king-stop"
                transform={`translate(${s.x},${s.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${s.name}, ${s.year}${beaten ? ', boss beaten' : open ? '' : ', still in the fog'}`}
                onClick={() => travel(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    travel(s)
                  }
                }}
              >
                {open && !beaten && <circle r="36" fill="url(#king-glow)" className={s.id === here.id ? '' : 'king-pulse'} />}
                {s.medallion && <Medallion img={s.scene} />}
                <circle r="38" fill="transparent" />
                {beaten && (
                  <g transform="translate(30,2)" aria-hidden="true">
                    <circle r="11" fill="#c9a227" stroke="#8f7116" strokeWidth="2.5" />
                    <circle r="7.5" fill="none" stroke="#f3dfb0" strokeWidth="1" opacity=".8" />
                    <text y="4.5" fontSize="12" textAnchor="middle" fontWeight="900" fill="#3b2a14">✓</text>
                  </g>
                )}
                <text className="king-label" y="42" textAnchor="middle">{s.name}</text>
                <g transform="translate(0,57)">
                  <rect x="-42" y="-10" width="84" height="17" rx="3" fill="#3b2a14" opacity=".9" stroke="#c9a227" strokeWidth="1" />
                  <text className="king-year" y="3" textAnchor="middle">{s.year}</text>
                </g>
                {!open && <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: FOG(0, -10) }} />}
              </g>
            )
          })}
          <g className="king-stop" transform={`translate(${TENT_AT.x},${TENT_AT.y})`} role="button" tabIndex={0} aria-label="Training Camp" onClick={() => go('tent')} onKeyDown={(e) => e.key === 'Enter' && go('tent')}>
            <Medallion img="tent.jpg" />
            <text className="king-label" y="44" textAnchor="middle">Training</text>
            <text className="king-label" y="62" textAnchor="middle">Camp</text>
          </g>
          {mirrorOpen(state.beaten) && (
            <g className="king-stop king-mirror" transform="translate(1290,640)" role="button" tabIndex={0} aria-label="Mirror World" onClick={() => go('mirror')} onKeyDown={(e) => e.key === 'Enter' && go('mirror')}>
              <Medallion img="mirror-kannauj.jpg" />
              <text className="king-label" y="44" textAnchor="middle">Mirror</text>
              <text className="king-label" y="62" textAnchor="middle">World</text>
            </g>
          )}
          <g ref={token} transform={`translate(${here.x},${here.y - TOKEN_LIFT})`} aria-label="Liam and Hoppy are here">
            <g className="king-bob">
              <path d="M-8,24 L0,40 L8,24 Z" fill="#8b6b3d" />
              <Medallion img={liamPortrait(state.beaten)} />
              {crowned && <text y="-26" textAnchor="middle" fontSize="22" aria-hidden="true">👑</text>}
              <g transform="translate(20,18)">
                <circle r="11.5" fill="#c9a227" stroke="#5c3d12" strokeWidth="1.5" />
                <image href={IMG + 'hoppy.jpg'} x="-9" y="-9" width="18" height="18" clipPath="url(#king-clip-small)" preserveAspectRatio="xMidYMid slice" />
              </g>
              <g ref={ship} style={{ display: 'none' }} transform="translate(-24,22) scale(.7)" dangerouslySetInnerHTML={{ __html: SHIP_INNER }} />
            </g>
          </g>
        </svg>
      </div>
      <div className="king-hud">
        <Avatar who="hoppy" className="king-hud-face" />
        <span className="king-coins" aria-label={`${titleOf(state.beaten)}, ${state.coins} chestnuts`}>
          <small>{titleOf(state.beaten)}</small>🌰 {state.coins}
        </span>
        <div className="king-bubble">
          {crowned ? (
            <>All hail <b>King Liam</b>! You conquered the whole world of chess.</>
          ) : beatenCount === 0 ? (
            <>Liam, our journey starts in <b>Kannauj</b>. Tap a city to travel!</>
          ) : beatenCount === BOSSES ? (
            <>Every boss is beaten. <b>Chennai</b> awaits – the crown is near!</>
          ) : (
            <>{beatenCount} of {BOSSES} bosses beaten. Where to next?</>
          )}
        </div>
      </div>
      {(state.warmupAt || (real && (real.shadow || real.clean > 0))) && (
        <div className="king-real">
          {state.warmupAt ? (
            <button type="button" className="king-real-back" onClick={() => go('afterwards')}>
              <b>Back from chess.com?</b> How did it go – read your game
            </button>
          ) : (
            <button type="button" onClick={() => go(state.beaten.includes('kannauj') ? 'portal' : 'check')}>
              {real?.shadow && (real.shadow.struck ? <span>🌫 The Shadow struck in <b>{real.shadow.struck} of your last {real.shadow.games}</b> games</span> : <span>🛡 The Shadow did not strike in your last {real.shadow.games} games</span>)}
              {real && real.clean > 0 && <span>✦ <b>{real.clean}</b> clean {real.clean === 1 ? 'game' : 'games'} – the map grows brighter</span>}
            </button>
          )}
        </div>
      )}
      {toast && <div className="king-toast" role="status">{toast}</div>}
      <nav className="king-dock" aria-label="Places">
        <button type="button" onClick={() => go('tent')}><span aria-hidden="true">⛺</span>Training Camp</button>
        {state.beaten.includes('kannauj') ? (
          <button type="button" className="dock-portal" onClick={() => go('portal')}><span aria-hidden="true">🌀</span>Real world</button>
        ) : (
          <button type="button" onClick={() => go('path')}><span aria-hidden="true">📚</span>All openings</button>
        )}
        <button type="button" onClick={() => go('quests')}><span aria-hidden="true">📖</span>Quest book</button>
        <button type="button" onClick={() => go('watch')}><span aria-hidden="true">👫</span>Together</button>
      </nav>
    </div>
  )
}

// A round painted picture in a gold frame (Liam on the map, the War Tent, places not on the painting)
function Medallion({ img }: { img: string }) {
  return (
    <g>
      <circle r="27" fill="#c9a227" stroke="#5c3d12" strokeWidth="2" />
      <image href={IMG + img} x="-23" y="-23" width="46" height="46" clipPath="url(#king-clip-big)" preserveAspectRatio="xMidYMid slice" />
      <circle r="23" fill="none" stroke="#5c3d12" strokeWidth="1.2" />
    </g>
  )
}

// ---------- the board of the game: the Hoppy board ----------

// In Asia Liam plays with his Indian army: there the rook is an elephant (Haathi)
const ASIA = ['kannauj', 'persia', 'samarkand', 'baghdad']
// Every land has its board colours, always in the Hoppy design (styles in king.css, .pal-*)
type Palette = 'forest' | 'walnut' | 'lapis' | 'fog' | 'ice' | 'night'
const PALETTES: Record<string, Palette> = {
  kannauj: 'lapis', persia: 'lapis', samarkand: 'lapis', baghdad: 'lapis',
  north: 'walnut', valencia: 'walnut', rome: 'walnut', palace: 'walnut', vienna: 'walnut', paris: 'walnut',
  london: 'fog', newyork: 'fog', reykjavik: 'ice', orbit: 'night',
}
const BoardContext = createContext<{ elephants: boolean; palette: Palette }>({ elephants: false, palette: 'forest' })
const boardAt = (id: string) => ({ elephants: ASIA.includes(id), palette: PALETTES[id] ?? 'forest' })

function KBoard(props: ComponentProps<typeof Board>) {
  const { elephants, palette } = useContext(BoardContext)
  return (
    <div className={`king-bleed pal-${palette}`}>
      <Board elephants={elephants} {...props} />
    </div>
  )
}

// ---------- intro ----------

const SCENES = [
  { img: 'street-bazaar.jpg', alt: 'Liam, a barefoot street kid, plays a trader on a board scratched into the dust of the bazaar, with pebbles as pieces and a chestnut as the stake', kicker: 'Kannauj, India · the bazaar', title: 'No home, no shoes – but a board in the dust', text: 'Liam plays the traders with pebbles for pieces. One chestnut a game.' },
  { img: 'street-lu.jpg', alt: 'The old Grandmaster Lu kneels at the dust board and smiles while Liam points at a hidden trap', kicker: 'The old Grandmaster Lu', title: '“A king is not born. He is made – move by move.”', text: 'Liam sees the trap that every trader missed. “The Shadow King feeds on blunders,” says Lu. “Will you stop him?”' },
  { img: 'street-ride.jpg', alt: 'At sunrise Liam rides out of the city gate on Hoppy, an old brown cart horse, while Grandmaster Lu waves goodbye', kicker: 'Sunrise · the road west', title: 'A pawn who wants to become king', text: 'Lu gives him Hoppy, an old cart horse that nobody wanted. Two outsiders ride out to learn from the masters.' },
]

function KingIntro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const s = SCENES[i]
  return (
    <div className="king-intro">
      <div className="king-intro-art street">
        <img src={IMG + s.img} alt={s.alt} />
      </div>
      <div className="king-intro-text">
        <span className="king-kicker">{s.kicker}</span>
        <h2>{s.title}</h2>
        <p>{s.text}</p>
        <div className="king-intro-row">
          <div className="king-dots" aria-hidden="true">
            {SCENES.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
          </div>
          <button type="button" className="king-skip" onClick={onDone}>Skip</button>
          <button type="button" className="primary" onClick={() => (i + 1 < SCENES.length ? setI(i + 1) : onDone())}>
            {i + 1 < SCENES.length ? 'Next' : 'Start the journey'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- a station ----------

export function KingStation({ id, sub, rep }: { id?: string; sub?: string; rep: Repertoire }) {
  const s = stationById(id)
  if (!s || !isOpen(s, loadKing().beaten)) {
    return (
      <div className="screen king-screen">
        <p className="note">This station is still in the fog.</p>
        <button type="button" className="primary" onClick={() => go('')}>World map</button>
      </div>
    )
  }
  return (
    <BoardContext.Provider value={boardAt(s.id)}>
      <StationScreen s={s} sub={sub} rep={rep} />
    </BoardContext.Provider>
  )
}

// Which step of the station is open (for its reward when it is done)
const StepContext = createContext('')

function StationScreen({ s, sub, rep }: { s: Station; sub?: string; rep: Repertoire }) {
  return (
    <StepContext.Provider value={sub ?? ''}>
      {/* every step starts fresh, also when you jump from one quest straight to the next */}
      <StationStep key={sub ?? ''} s={s} sub={sub} rep={rep} />
    </StepContext.Provider>
  )
}

function StationStep({ s, sub, rep }: { s: Station; sub?: string; rep: Repertoire }) {
  // a golden chestnut counts only the careful moves of this step
  useState(resetCareful)
  // Keys: a quest and its boss can share a screen, but each starts fresh
  switch (sub) {
    case 'next': return <NextStep s={s} rep={rep} />
    case 'talk': return <KingTalk s={s} />
    case 'guard': return <BoardRounds key="quest" s={s} rounds={GUARD} title="The guard" lesson="Before every move, a good general asks: what is attacked – and what is guarded? Find the best move." />
    case 'safe': return <QuizRounds key="quest" s={s} quiz={SAFE} title="Is it safe?" lesson="Before you move a piece, check its new square: can the enemy take it there?" />
    case 'react': return <CrossRounds key="quest" s={s} rounds={ROME_REACT} title="How do you react?" lesson="1.e4 e5 2.Nf3 – and now your opponent has many answers. Which move does your book play?" />
    case 'traps': return <TrapRounds key="quest" s={s} rep={rep} />
    case 'choose': return <CrossRounds key="quest" s={s} rounds={bookCrossroads(stationLines(s, rep.lines), CHOOSE)} title="How do you react?" fromBook lesson="Your opponent can answer in different ways. For each answer your book has a plan – which move is it?" />
    case 'forkhunt': return <PuzzleRounds key="quest" s={s} puzzles={pick(['fork'], 0, 6)} title="Fork hunt" lesson="Your opponent just made a mistake. Find the fork: one move that attacks two things at once." />
    case 'forkthreat': return <PuzzleRounds key="quest" s={s} puzzles={pick(['fork'], 6, 4)} threat title="Don't get forked" lesson="Now it is your opponent's turn – and he has a fork against you. Show it! Seeing it in time is how you stop it." />
    case 'mate1': return <PuzzleRounds key="quest" s={s} puzzles={[...pick(['mate1'], 0, 3), ...pick(['backrank'], 0, 3)]} title="Mate in one" lesson="One move, and the king has nowhere to go. Look at every check first." />
    case 'mate2': return <PuzzleRounds key="quest" s={s} puzzles={pick(['mate2'], 0, 4)} title="Mate in two" lesson="A check that forces the answer – then mate. Look at checks first, then captures." />
    case 'army': return <KingArmy s={s} />
    case 'riddle': return <KingRiddle key="quest" s={s} boss={false} />
    case 'fork': return <BoardRounds key="quest" s={s} rounds={FORKS.slice(0, 2)} title="Hoppy's fork" lesson="Find the jump that attacks two things at once." />
    case 'grain': return <QuizRounds key="quest" s={s} quiz={GRAIN} title="The legend of the grain" lesson="A wise man asks for grain: one on the first square, doubling on every square after it." />
    case 'squares': return <KingSquares s={s} />
    case 'lewis': return <QuizRounds key="quest" s={s} quiz={LEWIS} title="The Lewis chessmen" lesson="Astrid shows you the most famous chessmen of the North." />
    case 'queen': return <KingQueen s={s} />
    case 'turk': return <QuizRounds key="quest" s={s} quiz={TURK} title="Who is inside the box?" lesson="Look behind the trick of the famous chess machine." />
    case 'cross': return <CrossRounds key="quest" s={s} rounds={CROSSROADS.slice(0, 3)} />
    case 'krk': return <KingRook key="quest" s={s} boss={false} />
    case 'shuffle': return <Shuffle s={s} />
    case 'boss': return <BossFight key="boss" s={s} rep={rep} />
  }
  return <StationPage s={s} rep={rep} />
}

function BossFight({ s, rep }: { s: Station; rep: Repertoire }) {
  const b = s.boss
  if (b.kind === 'army') return <QuizRounds s={s} quiz={armyQuiz()} boss />
  if (b.kind === 'riddle') return <KingRiddle s={s} boss />
  if (b.kind === 'board') return <BoardRounds s={s} rounds={b.rounds!} boss />
  if (b.kind === 'lines') return <LineBoss s={s} rep={rep} />
  if (b.kind === 'quiz') return <QuizRounds s={s} quiz={b.quiz!} boss />
  if (b.kind === 'cross') return <CrossRounds s={s} rounds={CROSSROADS} boss />
  if (b.kind === 'krk') return <KingRook s={s} boss />
  if (b.kind === 'mixed') return <MixedBoss s={s} rep={rep} />
  if (b.kind === 'puzzles') return <PuzzleRounds s={s} puzzles={shuffle(b.puzzles!.flatMap((t) => pick([t], 10, 6))).slice(0, 5)} boss />
  return <GrandTour s={s} rep={rep} />
}

function StationHead({ s, back, title }: { s: Station; back: () => void; title?: string }) {
  return (
    <div className="screen-head">
      <button type="button" className="back" onClick={back} aria-label="Back">←</button>
      <div>
        <div className="eyebrow">{s.name} · {s.year}</div>
        <h2>{title ?? s.name}</h2>
      </div>
    </div>
  )
}

// The way through a station: talk, quests, your lines, the boss. Extras never block the way.
interface Step {
  key: string
  title: string
  route: string
  done: boolean
}
function stationSteps(s: Station, lines: Line[], rep: Repertoire): Step[] {
  const p = loadKing()
  const got = (k: string) => p.got.includes(`${s.id}/${k}`)
  return [
    { key: 'talk', title: `Meet ${s.master.name}`, route: `king/${s.id}/talk`, done: got('talk') },
    ...s.games.filter((g) => !g.extra).map((g) => ({ key: g.id, title: g.title, route: `king/${s.id}/${g.id}`, done: got(g.id) })),
    ...lines.map((l) => ({ key: 'line:' + l.id, title: l.title, route: (rep.srs.has(l.id) ? 'drill/' : 'learn/') + l.id, done: rep.srs.has(l.id) })),
    // after the lines: which move against which answer? (Rome has its own crossroads)
    ...(hasChoose(s, lines) ? [{ key: 'choose', title: 'How do you react?', route: `king/${s.id}/choose`, done: got('choose') }] : []),
    { key: 'boss', title: `Boss: ${s.boss.name}`, route: `king/${s.id}/boss`, done: p.beaten.includes(s.id) },
  ]
}

const CHOOSE = 6
function hasChoose(s: Station, lines: Line[]): boolean {
  return !s.games.some((g) => g.id === 'react') && bookCrossroads(lines, CHOOSE).length >= 3
}

// "Continue" from anywhere in the station: straight to the next open step
function NextStep({ s, rep }: { s: Station; rep: Repertoire }) {
  const lines = useMemo(() => stationLines(s, rep.lines), [rep.lines, s])
  useEffect(() => {
    const next = stationSteps(s, lines, rep).find((x) => !x.done)
    go(next ? next.route : 'king/' + s.id)
  }, [s, lines, rep])
  return null
}

function StationPage({ s, rep }: { s: Station; rep: Repertoire }) {
  const [now] = useState(() => Date.now())
  const [open, setOpen] = useState<string | null>(null)
  const lines = useMemo(() => stationLines(s, rep.lines), [rep.lines, s])
  const steps = stationSteps(s, lines, rep)
  const next = steps.find((x) => !x.done)
  const done = steps.filter((x) => x.done).length
  const got = (k: string) => steps.find((x) => x.key === k)?.done
  const extras = s.games.filter((g) => g.extra)
  const beaten = got('boss')
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('')} />
      <div className="king-banner">
        <img src={IMG + s.scene} alt="" />
        <div>
          <span className="king-kicker">{MIRROR.includes(s) ? s.year : `Year ${s.year}`} · 🌰 {loadKing().coins}</span>
          <p>{s.intro}</p>
        </div>
      </div>
      {next ? (
        <button type="button" className="primary wide king-continue" onClick={() => go(next.route)}>
          <small>Step {done + 1} of {steps.length}</small>
          {done ? 'Continue' : 'Start'}: {next.title}
        </button>
      ) : (
        <button type="button" className="primary wide king-continue" onClick={() => go('')}>
          <small>All {steps.length} steps done</small>Back to the world map
        </button>
      )}
      <div className="king-master">
        <Portrait m={s.master} className="king-portrait" />
        <div>
          <b>{s.master.name}</b>
          <small>{s.master.from}</small>
        </div>
        <button type="button" onClick={() => go(`king/${s.id}/talk`)}>{got('talk') ? '✓ Talk' : 'Talk'}</button>
      </div>
      <div className="path king-path">
        {s.games.filter((g) => !g.extra).map((g, i) => (
          <div key={g.id} className={`path-step offset-${i % 4}`}>
            <button type="button" className={`path-node king-game ${got(g.id) ? 'perfect' : ''}`} onClick={() => go(`king/${s.id}/${g.id}`)} aria-label={g.title}>{got(g.id) ? '✓' : '✦'}</button>
            <div className="path-label">{g.title}</div>
          </div>
        ))}
        {lines.map((line, i) => (
          <PathStep key={line.id} line={line} i={i + s.games.length} rep={rep} now={now} branch={null} open={open === line.id} onToggle={() => setOpen(open === line.id ? null : line.id)} />
        ))}
        {steps.some((x) => x.key === 'choose') && (
          <div className="path-step offset-1">
            <button type="button" className={`path-node king-game ${got('choose') ? 'perfect' : ''}`} onClick={() => go(`king/${s.id}/choose`)} aria-label="How do you react?">{got('choose') ? '✓' : '🪧'}</button>
            <div className="path-label">How do you react?</div>
          </div>
        )}
        <div className="path-step">
          <button type="button" className={`path-node king-boss ${beaten ? 'beaten' : ''}`} onClick={() => go(`king/${s.id}/boss`)} aria-label={`Boss: ${s.boss.name}`}>
            {beaten ? '✓' : <img className="king-node-img" src={IMG + s.boss.img} alt="" />}
          </button>
          <div className="path-label">Boss: {s.boss.name}</div>
          {beaten && <div className="path-result perfect">Beaten</div>}
        </div>
      </div>
      {extras.length > 0 && (
        <div className="king-extras">
          <b>Extras · history for fun</b>
          {extras.map((g) => (
            <button type="button" key={g.id} onClick={() => go(`king/${s.id}/${g.id}`)}>
              {g.title}
              {loadKing().got.includes(`${s.id}/${g.id}`) ? ' ✓' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KingTalk({ s }: { s: Station }) {
  const m = s.master
  // masters out in the world greet Liam by his fame; Grandmaster Lu in the mirror is his teacher
  const [talk] = useState(() => (MIRROR.includes(s) ? m.talk : [{ who: 'master' as const, text: reputation(loadKing().beaten).greet }, ...m.talk]))
  const [n, setN] = useState(1)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [n])
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={m.name} />
      <div className="king-talk">
        {talk.slice(0, n).map((l, i) => (
          <div key={i} className={`king-line ${l.who === 'master' ? '' : 'me'}`}>
            {l.who === 'master' ? <Portrait m={m} className="king-avatar" /> : <Avatar who={l.who} className="king-avatar" />}
            <div className="king-say">{l.text}</div>
          </div>
        ))}
      </div>
      <div ref={end}>
        <button
          type="button"
          className="primary wide"
          onClick={() => {
            if (n < talk.length) return setN(n + 1)
            earn(`${s.id}/talk`, 5)
            go(`king/${s.id}/next`)
          }}
        >
          {n < talk.length ? 'Next' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

// ---------- shared pieces of the games ----------

function Hearts({ n }: { n: number }) {
  return <span className="king-hearts" aria-label={`${n} hearts left`}>{'♥'.repeat(Math.max(n, 0))}{'♡'.repeat(Math.max(3 - n, 0))}</span>
}

function BossCard({ s, line, progress, hearts }: { s: Station; line: string; progress?: number; hearts?: number }) {
  return (
    <div className="king-boss-card">
      <img className="king-boss-img" src={IMG + s.boss.img} alt="" />
      <div>
        <b className="king-boss-name">{s.boss.name}</b>
        <q>{line === s.boss.taunt && !MIRROR.includes(s) ? `${reputation(loadKing().beaten).boss} ${line}` : line}</q>
        {progress !== undefined && <div className="king-hp"><span style={{ width: `${progress}%` }} /></div>}
        {hearts !== undefined && <Hearts n={hearts} />}
      </div>
    </div>
  )
}

function beat(id: string) {
  const p = loadKing()
  if (p.beaten.includes(id)) return
  // a boss opens its quest in the real world: games from now on count
  const quests = { ...p.quests }
  for (const q of REAL_QUESTS) if (q.after === id && !quests[q.id]) quests[q.id] = Date.now()
  saveKing({ ...p, beaten: [...p.beaten, id], quests })
}

function Victory({ s }: { s: Station }) {
  const [{ coins, title, gold }] = useState(() => {
    const before = titleOf(loadKing().beaten)
    beat(s.id)
    const after = titleOf(loadKing().beaten)
    return { coins: earn(`${s.id}/boss`, s.finale ? 200 : 50), title: after !== before ? after : null, gold: takeCareful() }
  })
  useEffect(() => {
    fx.success()
  }, [])
  const crown = s.finale
  const next = nextStation(s.id, loadKing().beaten)
  // in the Mirror World you go on to the next shadow, not back to the map
  const mirror = MIRROR.includes(s)
  const mirrorNext = MIRROR.find((m) => !loadKing().beaten.includes(m.id))
  return (
    <div className="screen king-screen">
      <div className={`done king-victory ${crown ? 'crown' : ''}`}>
        <div className="king-defeated" aria-hidden="true">
          <img src={IMG + (crown ? 'liam-5.jpg' : s.boss.img)} alt="" />
          <span>{crown ? '👑' : '🏅'}</span>
        </div>
        <div className="done-title">{crown ? 'King of Chess!' : `${s.boss.name} is beaten!`}</div>
        <p>{s.boss.win}</p>
        {coins > 0 && <ChestnutReward amount={coins} gold={gold} />}
        {title && (
          <div className="king-title-won">
            <small>New title</small>
            {title}
          </div>
        )}
        {s.fact && (
          <div className="king-fact">
            <b>Fun fact</b>
            <p>{s.fact}</p>
          </div>
        )}
        <div className="done-actions">
          <button type="button" onClick={() => go('king/' + s.id)}>{s.name}</button>
          {mirror ? (
            mirrorNext ? (
              <button type="button" className="primary" onClick={() => go(`king/${mirrorNext.id}/next`)}>On to {mirrorNext.name}</button>
            ) : (
              <button type="button" className="primary" onClick={() => go('mirror')}>Mirror World</button>
            )
          ) : next ? (
            <button
              type="button"
              className="primary"
              onClick={() => {
                saveKing({ ...loadKing(), travel: next.id })
                go('')
              }}
            >
              Ride on to {next.name}
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => go('')}>World map</button>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestDone({ s, icon, title, text }: { s: Station; icon: string; title: string; text: string }) {
  const step = useContext(StepContext)
  const extra = s.games.find((g) => g.id === step)?.extra
  const [{ coins, gold }] = useState(() => ({ coins: earn(`${s.id}/${step}`, extra ? 5 : 10), gold: takeCareful() }))
  useEffect(() => {
    fx.success()
  }, [])
  return (
    <div className="screen king-screen">
      <div className="done">
        <div className="king-medal" aria-hidden="true">{icon}</div>
        <div className="done-title">{title}</div>
        <p>{text}</p>
        {coins > 0 && <ChestnutReward amount={coins} gold={gold} />}
        <div className="done-actions">
          <button type="button" onClick={() => go('king/' + s.id)}>{s.name}</button>
          <button type="button" className="primary" onClick={() => go(`king/${s.id}/next`)}>Continue</button>
        </div>
      </div>
    </div>
  )
}

function OutOfHearts({ s, why, retry }: { s: Station; why: string; retry: () => void }) {
  return (
    <div className="king-fb no" role="alert">
      <b>Out of hearts</b>
      <p>{why}</p>
      <div className="done-actions">
        <button type="button" onClick={() => go('king/' + s.id)}>Back</button>
        <button type="button" className="primary" onClick={retry}>Try again</button>
      </div>
    </div>
  )
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let k = b.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    ;[b[k], b[j]] = [b[j], b[k]]
  }
  return b
}

// ---------- quizzes (army, grain, Lewis, Turk, Chess960) ----------

function armyQuiz(): QuizQuestion[] {
  const pieces = ARMY.filter((a) => a.piece !== 'k')
  return pieces.map((a) => ({
    q: `What is the ${a.name} today?`,
    icon: a.icon,
    options: shuffle([a.is, ...shuffle(pieces.filter((x) => x !== a).map((x) => x.is)).slice(0, 2)]),
    answer: a.is,
    why: `The ${a.name} is the ${a.is}.`,
  }))
}

function QuizRounds({ s, quiz, boss, title, lesson }: { s: Station; quiz: QuizQuestion[]; boss?: boolean; title?: string; lesson?: string }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [picked, setPicked] = useState<string | null>(null)
  if (i >= quiz.length) return boss ? <Victory s={s} /> : <QuestDone s={s} icon="📜" title="Well done!" text={`You finished “${title}”. ${s.boss.name} is waiting.`} />
  const q = quiz[i]
  const right = picked === q.answer
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : title} />
      {boss ? <BossCard s={s} line={s.boss.taunt} progress={(100 * (quiz.length - i)) / quiz.length} hearts={hearts} /> : lesson && <p className="king-lesson">{lesson}</p>}
      {q.fen && (
        <KBoard key={i} fen={q.fen} orientation="white" arrows={q.move ? [{ startSquare: q.move[0], endSquare: q.move[1], color: ARROW.next }] : []} />
      )}
      <div className="king-question">
        {q.icon && <span className="king-big" aria-hidden="true">{q.icon}</span>}
        <span>{q.q}</span>
      </div>
      <div className="king-options">
        {q.options.map((o) => (
          <button
            type="button"
            key={o}
            disabled={right}
            className={picked === o ? (o === q.answer ? 'right' : 'wrong') : ''}
            onClick={() => {
              setPicked(o)
              if (o === q.answer) {
                if (q.guard) fx.knack()
                else fx.move('Nf3')
              }
              else {
                fx.wrong()
                if (boss) setHearts(hearts - 1)
              }
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {boss && hearts <= 0 ? (
        <OutOfHearts s={s} why={q.why} retry={() => { setI(0); setHearts(3); setPicked(null) }} />
      ) : right ? (
        <div className={`king-fb ok ${q.guard ? 'knack' : ''}`}>
          {q.guard && <b>Knack!</b>}
          <p>{q.why}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setPicked(null) }}>Next</button>
        </div>
      ) : picked ? (
        <div className="king-fb no" role="alert"><p>Not quite – try another answer.</p></div>
      ) : null}
    </div>
  )
}

// ---------- Kannauj: the army with the Indian pieces ----------

function IndianBoard() {
  return <KBoard fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" orientation="white" elephants />
}

function KingArmy({ s }: { s: Station }) {
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title="Meet your army" />
      <IndianBoard />
      <div className="king-legend">
        {ARMY.map((a) => (
          <div key={a.name}>
            <b aria-hidden="true">{a.icon}</b>
            <span>{a.name}</span>
            <small>{a.is}</small>
          </div>
        ))}
      </div>
      <p className="note">These are the Hindi names many Indian players still use. In the oldest game, the elephants stood where the bishops are today.</p>
      <button type="button" className="primary wide" onClick={() => { earn(`${s.id}/army`, 5); go(`king/${s.id}/next`) }}>Continue</button>
    </div>
  )
}

// ---------- Persia: watch the elephant and work out its rule ----------

function KingRiddle({ s, boss }: { s: Station; boss: boolean }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [picked, setPicked] = useState<string | null>(null)
  if (i >= RIDDLES.length)
    return boss ? <Victory s={s} /> : <QuestDone s={s} icon="🐘" title="You read the rule!" text="In shatranj the elephant jumps exactly two squares diagonally – it can only ever reach 8 of the 64 squares." />
  const r = RIDDLES[i]
  const ok = r.options.find((o) => o.text === picked)?.ok
  const styles = Object.fromEntries(r.seen.map((q) => [q, LAST_MOVE]))
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : 'The riddle of the elephant'} />
      {boss && <BossCard s={s} line={s.boss.taunt} progress={(100 * (RIDDLES.length - i)) / RIDDLES.length} hearts={hearts} />}
      {/* the right answer is played: the elephant jumps to its square */}
      <KBoard key={i} fen={elephantFen(ok && picked ? picked : r.at)} orientation="white" squareStyles={ok && picked ? { ...styles, [picked]: LAST_MOVE } : styles} elephants />
      <div className="king-question"><span className="king-big" aria-hidden="true">🐘</span><span>{r.q}</span></div>
      <div className="king-options">
        {r.options.map((o) => (
          <button
            type="button"
            key={o.text}
            disabled={!!ok}
            className={picked === o.text ? (o.ok ? 'right' : 'wrong') : ''}
            onClick={() => {
              setPicked(o.text)
              if (o.ok) fx.move('Bc4')
              else {
                fx.wrong()
                if (boss) setHearts(hearts - 1)
              }
            }}
          >
            <b>{o.text}</b> {o.note && <small>{o.note}</small>}
          </button>
        ))}
      </div>
      {boss && hearts <= 0 ? (
        <OutOfHearts s={s} why="The elephant jumps exactly two squares diagonally." retry={() => { setI(0); setHearts(3); setPicked(null) }} />
      ) : ok ? (
        <button type="button" className="primary wide" onClick={() => { setI(i + 1); setPicked(null) }}>Next</button>
      ) : null}
    </div>
  )
}

function elephantFen(square: string): string {
  const f = square.charCodeAt(0) - 97
  const r = 8 - Number(square[1])
  const rows = Array.from({ length: 8 }, (_, k) => (k === r ? `${f ? f : ''}R${7 - f ? 7 - f : ''}` : '8'))
  return rows.join('/') + ' w - - 0 1'
}

// ---------- moves on the board: forks, mates, rooks, the queen, Lord Fog, your lines ----------

function BoardRounds({ s, rounds, boss, title, lesson, hint, orientation = 'white', finish, back }: { s: Station; rounds: BoardRound[]; boss?: boolean; title?: string; lesson?: string; hint?: string; orientation?: 'white' | 'black'; finish?: React.ReactNode; back?: string }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [state, setState] = useState<'play' | 'wrong' | 'hit'>('play')
  if (i >= rounds.length) return finish ?? (boss ? <Victory s={s} /> : <QuestDone s={s} icon="✦" title="Well done!" text={`You finished “${title}”. ${s.boss.name} is waiting.`} />)
  const r = rounds[i]
  const careful = r.guard || r.threat
  const arrows: Arrow[] = state === 'wrong' ? [{ startSquare: r.from, endSquare: r.to, color: ARROW.correct }] : []
  const styles = state === 'hit' ? { [r.from]: LAST_MOVE, [r.to]: LAST_MOVE } : {}
  // The move is really played: the piece glides to its square, like in the normal game
  const fen = state === 'hit' ? new Chess(r.fen).move({ from: r.from, to: r.to }).after : r.fen
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go(back ?? 'king/' + s.id)} title={boss ? s.boss.name : title} />
      {boss ? <BossCard s={s} line={r.taunt} progress={(100 * (rounds.length - i)) / rounds.length} hearts={hearts} /> : lesson && <p className="king-lesson">{lesson}</p>}
      <KBoard
        key={i}
        fen={fen}
        orientation={orientation}
        arrows={arrows}
        squareStyles={styles}
        onMove={
          state === 'hit' || (boss && hearts <= 0)
            ? undefined
            : (from, to) => {
                if (from === r.from && to === r.to) {
                  if (careful) fx.knack()
                  else fx.move(r.san)
                  setState('hit')
                  return true
                }
                fx.wrong()
                if (boss) setHearts(hearts - 1)
                setState('wrong')
                return false
              }
        }
      />
      {boss && hearts <= 0 ? (
        <OutOfHearts s={s} why={r.why} retry={() => { setI(0); setHearts(3); setState('play') }} />
      ) : state === 'hit' ? (
        <div className={`king-fb ok ${careful ? 'knack' : ''}`}>
          <b>{careful ? 'Knack!' : 'Hit!'} <span className="san">{r.san}</span></b>
          <p>{r.why}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setState('play') }}>{i + 1 < rounds.length ? (boss ? 'Next attack' : 'Next') : boss ? 'Finish!' : 'Done'}</button>
        </div>
      ) : state === 'wrong' ? (
        <div className="king-fb no" role="alert">
          <b>Not that one</b>
          <p>{boss ? 'You lose a heart. ' : ''}Play the green arrow.</p>
        </div>
      ) : (
        <p className="note">
          {r.threat ? (
            <>
              <b>What does your opponent threaten?</b> Play his move on the board.
            </>
          ) : (
            <>
              {orientation === 'black' ? 'You play Black' : 'You play White'}
              {hint ? <> · <b>{hint}</b></> : ''}. Play your move on the board.
            </>
          )}
        </p>
      )}
    </div>
  )
}

function LineBoss({ s, rep }: { s: Station; rep: Repertoire }) {
  const lines = useMemo(() => stationLines(s, rep.lines), [rep.lines, s])
  const [rounds] = useState(() => lineRounds(lines, 4))
  if (!rounds.length) return <p className="note">No lines found for this station.</p>
  const op = s.lines?.opening
  return <BoardRounds s={s} rounds={rounds} boss hint={s.lines?.title ?? (typeof op === 'string' ? op : undefined)} orientation={s.lines?.side === 'b' ? 'black' : 'white'} />
}

// Traps from your lines: the move from the line, explained by the comments around it
function trapRounds(lines: Line[]): BoardRound[] {
  return ROME_TRAPS.flatMap((t) => {
    const line = lines.find((l) => l.title === t.line)
    const i = line?.moves.findIndex((m) => m.color === line.side && m.san === t.san) ?? -1
    if (!line || i < 0) return []
    const m = line.moves[i]
    const why = [line.moves[i - 1]?.comment, m.comment].filter(Boolean).join(' ')
    return [{ fen: m.fenBefore, taunt: t.taunt, from: m.from, to: m.to, san: m.san, why: why || `${m.san} – from your line.` }]
  })
}

function TrapRounds({ s, rep }: { s: Station; rep: Repertoire }) {
  const rounds = useMemo(() => trapRounds(rep.lines), [rep.lines])
  return <BoardRounds s={s} rounds={rounds} title="Traps" lesson="Your opponent sets a trap – or falls into one. Find the move from your book." />
}

// Count Giuoco mixes everything without telling you what comes: your lines, traps and threats
function MixedBoss({ s, rep }: { s: Station; rep: Repertoire }) {
  const lines = useMemo(() => stationLines(s, rep.lines), [rep.lines, s])
  const [rounds] = useState(() =>
    shuffle([...lineRounds(lines, 2), ...shuffle(trapRounds(rep.lines)).slice(0, 2), ...shuffle(ROME_THREATS).slice(0, 1)]),
  )
  return <BoardRounds s={s} rounds={rounds} boss />
}

// ---------- puzzles from Lichess (CC0): several moves, the opponent answers ----------

export interface LPuzzle {
  id: string
  fen: string // before the opponent's mistake
  moves: string[] // UCI: the opponent's mistake, then the solution with the answers
  rating: number
  direct?: boolean // no mistake first: you move at once (our own positions)
  threat?: boolean // you play your opponent's move: "what does he threaten?"
  why?: string
}

// One of our own positions as a puzzle, so everything can be mixed on the road
function asPuzzle(r: BoardRound, id: string): LPuzzle {
  return { id, fen: r.fen, moves: [r.from + r.to], rating: 0, direct: true, threat: r.threat, why: r.why }
}

const uci = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })

// Puzzles of these themes, from the easiest on (the lists are sorted by rating)
function pick(themes: string[], from: number, count: number): LPuzzle[] {
  return themes.flatMap((t) => ((PUZZLES as Record<string, LPuzzle[]>)[t] ?? []).slice(from, from + count))
}

// threat: you play your opponent's winning move – "what can he do to you now?"
function PuzzleRounds({ s, puzzles, boss, title, lesson, threat, back, finish }: { s: Station; puzzles: LPuzzle[]; boss?: boolean; title?: string; lesson?: string; threat?: boolean; back?: string; finish?: React.ReactNode }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [solved, setSolved] = useState(false)
  if (i >= puzzles.length) return finish ?? (boss ? <Victory s={s} /> : <QuestDone s={s} icon="✦" title="Well done!" text={`You finished “${title}”. ${s.boss.name} is waiting.`} />)
  const p = puzzles[i]
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go(back ?? 'king/' + s.id)} title={boss ? s.boss.name : title} />
      {boss ? <BossCard s={s} line={s.boss.taunt} progress={(100 * (puzzles.length - i)) / puzzles.length} hearts={hearts} /> : lesson && <p className="king-lesson">{lesson}</p>}
      {boss && hearts <= 0 ? (
        <OutOfHearts s={s} why="Look at every check, capture and attack first." retry={() => { setI(0); setHearts(3); setSolved(false) }} />
      ) : (
        <OnePuzzle key={p.id + i} p={p} threat={threat || p.threat} onMistake={() => boss && setHearts((h) => h - 1)} onSolved={() => setSolved(true)} />
      )}
      {solved && (
        <div className={`king-fb ok ${threat || p.threat ? 'knack' : ''}`}>
          <b>{threat || p.threat ? 'Knack! You saw the threat.' : 'Solved!'}</b>
          <p>{p.why ?? (threat || p.threat ? 'Before every move, look for this against you: checks, captures, attacks.' : `Puzzle rating ${p.rating}.`)}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setSolved(false) }}>Next</button>
        </div>
      )}
      <p className="note small">Puzzles from the Lichess database.</p>
    </div>
  )
}

function OnePuzzle({ p, threat, onMistake, onSolved }: { p: LPuzzle; threat?: boolean; onMistake: () => void; onSolved: () => void }) {
  const [fen, setFen] = useState(p.fen)
  const [step, setStep] = useState(0) // index of the next move in p.moves
  const [last, setLast] = useState<{ from: string; to: string } | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const toMove = new Chess(p.fen).turn() === 'w' ? 'white' : 'black'
  const me = p.direct ? toMove : toMove === 'white' ? 'black' : 'white' // the side that solves
  const orientation = threat ? (me === 'white' ? 'black' : 'white') : me
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // the opponent's mistake (or answer) is played on the board after a short pause
  const play = (from: string, delay: number) => {
    timer.current = window.setTimeout(() => {
      const c = new Chess(from)
      const m = c.move(uci(p.moves[step === 0 ? 0 : step]))
      fx.move(m.san, false)
      setFen(c.fen())
      setLast({ from: m.from, to: m.to })
      setStep((x) => x + 1)
    }, delay)
  }
  useEffect(() => {
    if (step === 0 && !p.direct) play(p.fen, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const want = p.moves[step]
  const yourTurn = !done && (p.direct ? step % 2 === 0 : step > 0 && step % 2 === 1)
  return (
    <>
      <KBoard
        fen={fen}
        orientation={orientation}
        squareStyles={last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}}
        arrows={hint ? [{ startSquare: hint.slice(0, 2), endSquare: hint.slice(2, 4), color: ARROW.correct }] : []}
        onMove={
          !yourTurn
            ? undefined
            : (from, to) => {
                const c = new Chess(fen)
                // a pawn reaching the last rank becomes the piece of the solution (or a queen)
                const pawn = c.get(from as Parameters<typeof c.get>[0])?.type === 'p' && (to[1] === '8' || to[1] === '1')
                const m = c.move({ from, to, promotion: pawn ? (want.slice(0, 4) === from + to && want[4]) || 'q' : undefined })
                const right = from + to === want.slice(0, 4) || (step === p.moves.length - 1 && c.isCheckmate())
                if (!right) {
                  fx.wrong()
                  onMistake()
                  setHint(want)
                  return false
                }
                setHint(null)
                setFen(c.fen())
                setLast({ from, to })
                const next = step + 1
                if (threat || next >= p.moves.length) {
                  if (threat) fx.knack()
                  else fx.move(m.san)
                  setStep(next)
                  setDone(true)
                  onSolved()
                  return true
                }
                fx.move(m.san)
                setStep(next)
                timer.current = window.setTimeout(() => {
                  const r = new Chess(c.fen())
                  const a = r.move(uci(p.moves[next]))
                  fx.move(a.san, false)
                  setFen(r.fen())
                  setLast({ from: a.from, to: a.to })
                  setStep(next + 1)
                }, 450)
                return true
              }
        }
      />
      {!done && (step > 0 || p.direct) && (
        <p className="note">
          {threat ? (
            <>
              <b>Your opponent can strike now.</b> Play his best move on the board.
            </>
          ) : (
            <>
              {orientation === 'white' ? 'White' : 'Black'} to move. {hint ? 'Play the green arrow.' : 'Find the best move.'}
            </>
          )}
        </p>
      )}
    </>
  )
}

// ---------- Baghdad: blindfold – know every square ----------

const TARGETS = ['e4', 'g7', 'b3', 'd5', 'h1', 'c6']
function KingSquares({ s }: { s: Station }) {
  const { palette } = useContext(BoardContext)
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [tapped, setTapped] = useState<string | null>(null)
  if (i >= TARGETS.length) return <QuestDone s={s} icon="👁" title={`${score} of ${TARGETS.length} squares`} text="Blindfold players see the whole board in their heads. This is the first step." />
  const t = TARGETS[i]
  const cells = []
  for (let r = 8; r >= 1; r--)
    for (let f = 0; f < 8; f++) {
      const sq = 'abcdefgh'[f] + r
      const cls = tapped ? (sq === t ? 'ok' : sq === tapped ? 'bad' : '') : ''
      cells.push(
        <button
          type="button"
          key={sq}
          className={`king-tap ${(r + f) % 2 ? 'l' : 'd'} ${cls}`}
          aria-label={tapped ? sq : `Square ${8 - r + 1}-${f + 1}`}
          disabled={!!tapped}
          onClick={() => {
            setTapped(sq)
            if (sq === t) {
              setScore(score + 1)
              fx.move('e4')
            } else fx.wrong()
          }}
        />,
      )
    }
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title="Blindfold: find the square" />
      <div className="king-question"><span className="king-big" aria-hidden="true">👁</span><span>Tap the square <b className="king-coord">{t}</b> – no letters, no numbers on the board!</span></div>
      <div className={`king-tapboard pal-${palette}`}>{cells}</div>
      {tapped && (
        <div className={`king-fb ${tapped === t ? 'ok' : 'no'}`}>
          <p>{tapped === t ? 'Right!' : `That was ${tapped}. The green one is ${t}.`}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setTapped(null) }}>Next</button>
        </div>
      )}
      <p className="note">White is at the bottom. a1 is the dark square in the bottom-left corner.</p>
    </div>
  )
}

// ---------- Valencia: the queen gets the whole board ----------

function KingQueen({ s }: { s: Station }) {
  const [awake, setAwake] = useState(false)
  const old = ['c3', 'e3', 'c5', 'e5']
  const all: string[] = []
  for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    let f = 3 + df
    let r = 4 + dr
    while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
      all.push('abcdefgh'[f] + r)
      f += df
      r += dr
    }
  }
  const dot: CSSProperties = { background: 'radial-gradient(circle, rgba(139, 46, 46, .55) 20%, transparent 23%)' }
  const styles = Object.fromEntries((awake ? all : old).map((q) => [q, dot]))
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={awake ? 'The queen awakens!' : 'Before 1475'} />
      <p className="king-lesson">
        {awake
          ? `Now she reaches ${all.length} squares from d4 – the strongest piece on the board. People called it the “mad queen’s chess”.`
          : 'For about 500 years in Europe she moved only one square diagonally: just 4 squares from d4.'}
      </p>
      <KBoard fen="8/8/8/8/3Q4/8/8/8 w - - 0 1" orientation="white" squareStyles={{ ...styles, d4: LAST_MOVE }} />
      {awake ? (
        <button type="button" className="primary wide" onClick={() => go(`king/${s.id}/boss`)}>Face the Mad Queen</button>
      ) : (
        <button type="button" className="primary wide" onClick={() => { setAwake(true); fx.success() }}>Awaken the queen</button>
      )}
    </div>
  )
}

// ---------- Paris: which road against which answer ----------

function CrossRounds({ s, rounds, boss, title = 'Which road?', lesson, fromBook }: { s: Station; rounds: Crossroad[]; boss?: boolean; title?: string; lesson?: string; fromBook?: boolean }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [picked, setPicked] = useState<string | null>(null)
  if (i >= rounds.length) return boss ? <Victory s={s} /> : <QuestDone s={s} icon="🧭" title="You know how to react" text="For every answer of your opponent you know the move from your book – and why." />
  const c = rounds[i]
  const choice = c.options.find((o) => o.san === picked)
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : title} />
      {!boss && lesson && i === 0 && <p className="king-lesson">{lesson}</p>}
      {boss && <BossCard s={s} line={i === 0 ? s.boss.taunt : 'Next crossroads!'} progress={(100 * (rounds.length - i)) / rounds.length} hearts={hearts} />}
      {boss && i === 0 && <p className="note small">57% 1...e5 · 20% 1...d5: your 1,155 games of 3 months (analysis of Oct 31).</p>}
      <KBoard fen={c.fen} orientation={c.fen.split(' ')[1] === 'b' ? 'black' : 'white'} />
      <div className="king-question"><span className="king-big" aria-hidden="true">🪧</span><span>{c.q}</span></div>
      <div className="king-options">
        {c.options.map((o) => (
          <button
            type="button"
            key={o.san}
            disabled={!!choice?.ok}
            className={picked === o.san ? (o.ok ? 'right' : 'wrong') : ''}
            onClick={() => {
              setPicked(o.san)
              if (o.ok) fx.move(o.san)
              else {
                fx.wrong()
                if (boss) setHearts(hearts - 1)
              }
            }}
          >
            <b>{o.san}</b> {(!fromBook || picked === o.san) && <small>{o.note}</small>}
          </button>
        ))}
      </div>
      {boss && hearts <= 0 ? (
        <OutOfHearts s={s} why={c.why} retry={() => { setI(0); setHearts(3); setPicked(null) }} />
      ) : choice?.ok ? (
        <div className="king-fb ok">
          <p>
            Right road! {fromBook ? choice.note : c.why}
            {fromBook && c.options.filter((o) => o.ok).length > 1 && ` ${c.options.filter((o) => o.ok && o !== choice).map((o) => o.san).join(', ')} is in your book too.`}
          </p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setPicked(null) }}>Next</button>
        </div>
      ) : picked ? (
        <div className="king-fb no" role="alert">
          <p>{fromBook ? 'Not your plan here – your book plays something else against this answer. Try another.' : 'Wrong road – that is not in your book. Try another.'}</p>
        </div>
      ) : null}
    </div>
  )
}

// ---------- New York: mate with king and rook against the Machine's king ----------

const KRK_START = '8/8/8/4k3/8/8/8/R3K3 w - - 0 1'
const KRK_LIMIT = 50

// The Machine runs to the centre and grabs the rook when it can
function machineMove(fen: string): string {
  const c = new Chess(fen)
  const moves = c.moves({ verbose: true })
  const grab = moves.find((m) => m.captured)
  const centre = (sq: string) => {
    const f = sq.charCodeAt(0) - 97
    const r = Number(sq[1]) - 1
    return Math.min(f, 7 - f) + Math.min(r, 7 - r)
  }
  const best = grab ?? shuffle(moves).sort((a, b) => centre(b.to) - centre(a.to))[0]
  c.move(best)
  return c.fen()
}

function KingRook({ s, boss }: { s: Station; boss: boolean }) {
  const [fen, setFen] = useState(KRK_START)
  const [moves, setMoves] = useState(0)
  const [end, setEnd] = useState<null | 'mate' | 'draw' | 'slow'>(null)
  const [last, setLast] = useState<{ from: string; to: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const won = end === 'mate'
  if (won && boss) return <Victory s={s} />
  if (won) return <QuestDone s={s} icon="♜" title={`Mate in ${moves} moves!`} text="You can do what the 1912 machine did. Now face the Machine – in under 50 moves." />
  const reset = () => {
    setFen(KRK_START)
    setMoves(0)
    setEnd(null)
    setLast(null)
  }
  const styles = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {}
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : 'King and rook against king'} />
      {boss ? <BossCard s={s} line={s.boss.taunt} /> : <p className="king-lesson">Push the lone king to the edge with your rook, bring your own king closer – then mate on the edge.</p>}
      <div className="king-counter">
        <span>Your moves: <b>{moves}</b>{boss ? ` / ${KRK_LIMIT}` : ''}</span>
        <button type="button" onClick={reset}>Start again</button>
      </div>
      <KBoard
        fen={fen}
        orientation="white"
        squareStyles={styles}
        onMove={
          end || fen.split(' ')[1] !== 'w'
            ? undefined
            : (from, to) => {
                const c = new Chess(fen)
                const m = c.move({ from, to })
                fx.move(m.san)
                const n = moves + 1
                setMoves(n)
                setLast({ from, to })
                setFen(c.fen())
                if (c.isCheckmate()) {
                  setEnd('mate')
                  return true
                }
                if (c.isDraw()) {
                  setEnd('draw')
                  fx.wrong()
                  return true
                }
                if (boss && n >= KRK_LIMIT) {
                  setEnd('slow')
                  fx.wrong()
                  return true
                }
                timer.current = window.setTimeout(() => {
                  const next = machineMove(c.fen())
                  const after = new Chess(next)
                  const hist = new Chess(c.fen())
                  const mm = hist.moves({ verbose: true }).find((x) => new Chess(c.fen()).move(x).after === next)
                  if (mm) setLast({ from: mm.from, to: mm.to })
                  setFen(next)
                  if (after.isDraw()) {
                    setEnd('draw')
                    fx.wrong()
                  }
                }, 420)
                return true
              }
        }
      />
      {end === 'draw' && (
        <div className="king-fb no" role="alert">
          <b>{new Chess(fen).isStalemate() ? 'Stalemate!' : 'The rook is gone!'}</b>
          <p>{new Chess(fen).isStalemate() ? 'The king has no move but is not in check – that is a draw. Always leave him a square until the mate.' : 'The king took your rook. Keep the rook far away or protected by your king.'}</p>
          <button type="button" className="primary wide" onClick={reset}>Try again</button>
        </div>
      )}
      {end === 'slow' && (
        <div className="king-fb no" role="alert">
          <b>50 moves – the Machine escapes</b>
          <p>Cut the king off with the rook, then bring your king closer step by step.</p>
          <button type="button" className="primary wide" onClick={reset}>Try again</button>
        </div>
      )}
    </div>
  )
}

// ---------- Orbit: Chess960 ----------

function random960(): string {
  const row: string[] = Array(8).fill('')
  const free = () => row.map((p, k) => (p ? -1 : k)).filter((k) => k >= 0)
  row[[0, 2, 4, 6][Math.floor(Math.random() * 4)]] = 'b'
  row[[1, 3, 5, 7][Math.floor(Math.random() * 4)]] = 'b'
  for (const p of ['q', 'n', 'n']) {
    const f = free()
    row[f[Math.floor(Math.random() * f.length)]] = p
  }
  const [a, k, c] = free()
  row[a] = 'r'
  row[k] = 'k'
  row[c] = 'r'
  const back = row.join('')
  return `${back}/pppppppp/8/8/8/8/PPPPPPPP/${back.toUpperCase()} w - - 0 1`
}

function Shuffle({ s }: { s: Station }) {
  const [fen, setFen] = useState(random960)
  const [count, setCount] = useState(1)
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title="Planet 960" />
      <p className="king-lesson">On Planet 960 the back row is shuffled. Bishops on opposite colours, the king between the rooks – and the black army mirrors the white one.</p>
      <KBoard fen={fen} orientation="white" />
      <div className="king-counter">
        <span>Starting position <b>{count}</b> of 960</span>
        <button type="button" onClick={() => { setFen(random960()); setCount(count + 1); fx.move('Nc3') }}>Shuffle 🎲</button>
      </div>
      <button type="button" className="primary wide" onClick={() => go(`king/${s.id}/boss`)}>Face the Shuffler</button>
    </div>
  )
}

// ---------- Chennai: the Grand Tour ----------

function GrandTour({ s, rep }: { s: Station; rep: Repertoire }) {
  const [rounds] = useState<BoardRound[]>(() => {
    const italian = rep.lines.filter((l) => l.source !== 'import' && l.opening === 'Italian Game' && l.side === 'w')
    const london = rep.lines.filter((l) => l.source !== 'import' && l.opening === 'London System' && l.side === 'w')
    const tag = (r: BoardRound, taunt: string) => ({ ...r, taunt })
    return [
      tag(FORKS[2], 'Samarkand: one jump, two targets.'),
      tag(MATES[1], 'Baghdad: a puzzle from the book.'),
      tag(ROOK_MATES[1], 'The North: the rook ladder.'),
      tag(QUEEN_TACTICS[0], 'Valencia: the mad queen.'),
      ...lineRounds(italian, 1).map((r) => tag(r, 'Rome: your Italian.')),
      ...lineRounds(london, 1).map((r) => tag(r, 'London: your system.')),
    ]
  })
  return <BoardRounds s={s} rounds={rounds} boss />
}

// ---------- on the road: a scout of the Shadow Realm with mixed tasks from everything you learned ----------

const AMBUSH_KEY = 'chess-trainer-ambush'
function lastAmbush(): number {
  try {
    return Number(localStorage.getItem(AMBUSH_KEY) ?? 0)
  } catch {
    return 0
  }
}
function markAmbush() {
  try {
    localStorage.setItem(AMBUSH_KEY, String(Date.now()))
  } catch {
    // not remembered: the next ride can be ambushed again
  }
}

// What you can be asked: only what the stations you beat have taught
function roadPool(beaten: string[], lines: Line[]): LPuzzle[] {
  const pool: LPuzzle[] = []
  if (beaten.includes('kannauj')) pool.push(...GUARD.map((r, k) => asPuzzle(r, 'guard' + k)))
  if (beaten.includes('samarkand')) pool.push(...pick(['fork'], 14, 6), ...pick(['fork'], 20, 3).map((x) => ({ ...x, threat: true })), ...pick(['hanging'], 0, 4))
  if (beaten.includes('rome')) {
    pool.push(...ROME_THREATS.map((r, k) => asPuzzle(r, 'rt' + k)), ...trapRounds(lines).map((r, k) => asPuzzle(r, 'trap' + k)))
    pool.push(...lineRounds(stationLines(stationById('rome')!, lines), 4).map((r, k) => asPuzzle(r, 'rome' + k)))
  }
  if (beaten.includes('baghdad')) pool.push(...pick(['mate1'], 10, 4), ...pick(['backrank'], 10, 3), ...pick(['mate2'], 10, 3))
  return pool
}

function canBeAmbushed(beaten: string[]): boolean {
  return beaten.filter((id) => ['kannauj', 'samarkand', 'rome', 'baghdad'].includes(id)).length >= 2
}

export function Encounter({ to, rep }: { to?: string; rep: Repertoire }) {
  const target = stationById(to)
  const [tasks] = useState(() => {
    resetCareful()
    return shuffle(roadPool(loadKing().beaten, rep.lines)).slice(0, 3)
  })
  const road = { ...stationById('kannauj')!, id: 'road', name: 'On the road', year: target ? `to ${target.name}` : '' }
  const rideOn = () => {
    if (target) saveKing({ ...loadKing(), travel: target.id })
    go('')
  }
  return (
    <BoardContext.Provider value={{ elephants: false, palette: 'fog' }}>
      <PuzzleRounds
        s={road}
        puzzles={tasks}
        title="A scout blocks the road!"
        lesson="A scout of the Shadow Realm jumps out. Three tasks from everything you learned – nobody tells you what kind."
        back=""
        finish={<EncounterWon onRide={rideOn} target={target?.name} />}
      />
    </BoardContext.Provider>
  )
}

function EncounterWon({ onRide, target }: { onRide: () => void; target?: string }) {
  const [{ nuts, gold }] = useState(() => ({ nuts: earn(`road/${new Date().toDateString()}/${Math.random().toString(36).slice(2, 6)}`, 10), gold: takeCareful() }))
  useEffect(() => {
    fx.success()
  }, [])
  return (
    <div className="screen king-screen">
      <div className="done">
        <div className="king-medal" aria-hidden="true">🌫</div>
        <div className="done-title">The scout flees!</div>
        <p>What you learned is still there. The shadow did not get a single point.</p>
        <ChestnutReward amount={nuts} gold={gold} />
        <div className="done-actions">
          <button type="button" className="primary" onClick={onRide}>{target ? `Ride on to ${target}` : 'World map'}</button>
        </div>
      </div>
    </div>
  )
}

// ---------- your habits: where you leave your book in your real games ----------

export function Habits({ rep }: { rep: Repertoire }) {
  const k = loadKing()
  const player = k.baseline?.player ?? getPlayer()
  const [rounds, setRounds] = useState<Crossroad[] | null>(null)
  const [games, setGames] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!player) return
    // finished games only: the app never looks at a game that is still running
    recentRapid(player, 100)
      .then((all) => {
        const book = rep.lines.filter((l) => l.source !== 'import')
        setGames(all.length)
        setRounds(habitCrossroads(bookReport(all.map((g) => ({ pgn: g.pgn, color: myColor(g, player) })), book, 8), book))
      })
      .catch(() => setError('chess.com cannot be reached right now. Try again later.'))
  }, [player, rep.lines])
  const camp = { ...stationById('kannauj')!, id: 'habits', name: 'Training Camp', year: 'your habits' }
  const wait = (text: string, action?: React.ReactNode) => (
    <div className="screen king-screen">
      <StationHead s={camp} back={() => go('tent')} title="Your habits" />
      <p className="king-lesson">{text}</p>
      {action}
    </div>
  )
  if (!player) return wait('First tell me your chess.com name in the chess check.', <button type="button" className="primary wide" onClick={() => go('check')}>Check my chess</button>)
  if (error) return wait(error)
  if (!rounds) return wait('Hoppy reads your last rapid games…')
  if (!rounds.length) return wait(`In your last ${games} rapid games you never left your book twice at the same place. Well done!`)
  return <CrossRounds s={camp} rounds={rounds} title="Your habits" fromBook lesson={`From your last ${games} rapid games: here you left your book most often. Which move does your book play?`} />
}

// ---------- warm-up before a real game: the guard, a threat, your lines ----------

export function WarmUp({ rep }: { rep: Repertoire }) {
  const [rounds] = useState<BoardRound[]>(() => {
    const now = Date.now()
    const white = rep.lines.filter((l) => l.source !== 'import' && l.side === 'w')
    const due = white.filter((l) => (rep.srs.get(l.id)?.due ?? Infinity) <= now)
    return [
      { ...shuffle([...GUARD, ...GUARD_BOSS])[0], taunt: '' },
      shuffle(ROME_THREATS)[0],
      ...lineRounds(due.length >= 2 ? due : white, 2),
    ]
  })
  const tent = { ...stationById('kannauj')!, id: 'tent', name: 'Training Camp', year: 'before your game' }
  return (
    <BoardContext.Provider value={{ elephants: false, palette: 'walnut' }}>
      <BoardRounds
        s={tent}
        rounds={rounds}
        title="Warm-up"
        lesson="Four quick ones before your game: what is free, what is threatened, and two moves from your lines."
        back="tent"
        finish={
          <div className="screen king-screen">
            <div className="done">
              <div className="king-medal" aria-hidden="true">⚔</div>
              <div className="done-title">Ready for battle</div>
              <p>Before every move: what does your opponent threaten? Good luck – on chess.com you fight alone.</p>
              <div className="done-actions">
                <button type="button" onClick={() => go('tent')}>Training Camp</button>
                <a className="button primary" href="https://www.chess.com/play/online" target="_blank" rel="noopener" onClick={() => saveKing({ ...loadKing(), warmupAt: Date.now() })}>Play on chess.com</a>
              </div>
            </div>
          </div>
        }
      />
    </BoardContext.Provider>
  )
}

// ---------- the War Tent: all the trainers the app already has ----------

export function WarTent({ puzzles }: { puzzles: Puzzles }) {
  const winning = useMemo(() => puzzles.puzzles.filter((p) => clampScore(p.scoreBefore) >= 300), [puzzles.puzzles])
  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the world map">←</button>
        <div>
          <div className="eyebrow">Your camp · it travels with you</div>
          <h2>The Training Camp</h2>
        </div>
      </div>
      <div className="king-banner">
        <img src={IMG + 'tent.jpg'} alt="" />
        <div>
          <span className="king-kicker">Your camp · it travels with you</span>
          <p>A good general trains before every battle.</p>
        </div>
      </div>
      <button type="button" className="wide king-continue check-entry" onClick={() => go('check')}>
        <small>{loadKing().baseline ? 'your starting value is saved' : 'your real chess.com games'}</small>
        {loadKing().baseline ? 'Your chess check' : 'Check your chess: what costs you points?'}
      </button>
      <button type="button" className="primary wide king-continue" onClick={() => go('warmup')}>
        <small>2 minutes · before you play on chess.com</small>
        Warm-up before your game
      </button>
      <button type="button" className="wide king-continue" onClick={() => go('atlas')}>
        <small>new weapons · every big opening family</small>
        Opening atlas: widen your horizon
      </button>
      <button type="button" className="wide king-continue" onClick={() => go('habits')}>
        <small>from your last 100 rapid games</small>
        Your habits: where you leave your book
      </button>
      <div className="king-stations">
        <button type="button" onClick={() => go('review')}><span aria-hidden="true">🗺</span><b>Battle Plans</b><small>Your opening lines that are due</small></button>
        <button type="button" onClick={() => go('puzzles')}><span aria-hidden="true">🩹</span><b>Lost Battles</b><small>Your own mistakes as puzzles</small></button>
        <button type="button" onClick={() => go('threats')}><span aria-hidden="true">🗼</span><b>Watchtower</b><small>First check what the enemy threatens</small></button>
        <button type="button" disabled={!winning.length} onClick={() => go('play/puzzle/' + encodeURIComponent(winning[Math.floor(Math.random() * winning.length)].id))}><span aria-hidden="true">💰</span><b>Treasure Chest</b><small>Win your winning positions</small></button>
        <button type="button" onClick={() => go('play')}><span aria-hidden="true">🛡</span><b>Sparring Ground</b><small>A game vs Hoppy-Bot</small></button>
        <button type="button" onClick={() => go('daily')}><span aria-hidden="true">🃏</span><b>Today's cards</b><small>Everything due, mixed</small></button>
      </div>
      <div className="king-links">
        <button type="button" onClick={() => go('path')}>All openings</button>
        <button type="button" onClick={() => go('attacks')}>Attacks & Traps</button>
        <button type="button" onClick={() => go('weaknesses')}>My weaknesses</button>
        <button type="button" onClick={() => go('accuracy')}>How well did I play? (test)</button>
        <button type="button" onClick={() => go('trophies')}>Trophies</button>
        <button type="button" onClick={() => go('watch')}>Together with Johanna</button>
      </div>
    </div>
  )
}
