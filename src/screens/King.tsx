import { Chess } from 'chess.js'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE } from '../components/Board'
import { Avatar, Portrait, SHIP_INNER } from '../components/KingArt'
import { PathStep } from '../components/PathStep'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import type { Repertoire } from '../hooks/useRepertoire'
import { clampScore } from '../lib/blunders'
import { feedback as fx } from '../lib/feedback'
import {
  ARMY, CROSSROADS, FORKS, GRAIN, LEWIS, MATES, QUEEN_TACTICS, RIDDLES, ROOK_MATES, STATIONS, TENT_AT, TURK,
  isOpen, lineRounds, loadKing, saveKing, stationById, stationLines, type BoardRound, type Crossroad, type QuizQuestion, type Station,
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
  const beatenCount = state.beaten.filter((id) => !stationById(id)?.finale).length
  const crowned = state.beaten.includes('chennai')

  // Open on the station where Liam stands
  useEffect(() => {
    const sc = scroller.current
    if (!sc) return
    sc.scrollLeft = Math.max(0, here.x - sc.clientWidth / 2)
    sc.scrollTop = Math.max(0, here.y - sc.clientHeight / 2)
  }, [here])

  function travel(target: Station) {
    if (traveling.current) return
    if (!isOpen(target, state.beaten)) {
      showToast(`${target.name} opens when all ${BOSSES} bosses are beaten – ${BOSSES - beatenCount} to go.`)
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
    let t0 = 0
    const frame = (now: number) => {
      t0 ||= now
      const t = Math.min(1, (now - t0) / dur)
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
          <g className="king-stop" transform={`translate(${TENT_AT.x},${TENT_AT.y})`} role="button" tabIndex={0} aria-label="War Tent" onClick={() => go('tent')} onKeyDown={(e) => e.key === 'Enter' && go('tent')}>
            <Medallion img="tent.jpg" />
            <text className="king-label" y="44" textAnchor="middle">War Tent</text>
          </g>
          <g ref={token} transform={`translate(${here.x},${here.y - TOKEN_LIFT})`} aria-label="Prince Liam and Hoppy are here">
            <g className="king-bob">
              <path d="M-8,24 L0,40 L8,24 Z" fill="#8b6b3d" />
              <Medallion img="liam.jpg" />
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
        <div className="king-bubble">
          {crowned ? (
            <>All hail <b>King Liam</b>! You conquered the whole world of chess.</>
          ) : beatenCount === 0 ? (
            <>Prince Liam, our journey starts in <b>Kannauj</b>. Tap a city to travel!</>
          ) : beatenCount === BOSSES ? (
            <>Every boss is beaten. <b>Chennai</b> awaits – the crown is near!</>
          ) : (
            <>{beatenCount} of {BOSSES} bosses beaten. Where to next?</>
          )}
        </div>
      </div>
      {toast && <div className="king-toast" role="status">{toast}</div>}
      <nav className="king-dock" aria-label="Places">
        <button type="button" onClick={() => go('tent')}><span aria-hidden="true">⛺</span>War Tent</button>
        <button type="button" onClick={() => go('path')}><span aria-hidden="true">📚</span>All openings</button>
        <button type="button" onClick={() => go('weaknesses')}><span aria-hidden="true">📖</span>Quest book</button>
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
  { kicker: 'Kannauj, India · around the year 600', title: 'An army small enough to fit on a table', text: 'Foot soldiers, horses, chariots and elephants on 64 squares. Nobody knows who invented it.' },
  { kicker: 'Persia · the Book of Kings', title: 'A riddle on a silk letter', text: '"Work out how this game is played – or Persia pays India." And the game begins to travel.' },
  { kicker: '1,500 years · around the world', title: 'Follow the game. Become King of Chess.', text: 'Prince Liam and Hoppy learn from the masters and defeat the bosses. It is a war where nobody bleeds.' },
]

function KingIntro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const s = SCENES[i]
  return (
    <div className="king-intro">
      <div className={`king-intro-art scene-${i}`}>
        {i === 0 ? (
          <img src={IMG + 'kannauj.jpg'} alt="Prince Liam kneels at the first chessboard in a palace in Kannauj, his horse Hoppy behind him" />
        ) : i === 1 ? (
          <img src={IMG + 'persia.jpg'} alt="At the Persian court an envoy with an elephant has brought a chessboard and a riddle" />
        ) : (
          <img className="map-crop" src={IMG + 'worldmap.jpg'} alt="The painted world map of the journey" />
        )}
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

function StationScreen({ s, sub, rep }: { s: Station; sub?: string; rep: Repertoire }) {
  // Keys: a quest and its boss can share a screen, but each starts fresh
  switch (sub) {
    case 'talk': return <KingTalk s={s} />
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

function StationPage({ s, rep }: { s: Station; rep: Repertoire }) {
  const [now] = useState(() => Date.now())
  const [open, setOpen] = useState<string | null>(null)
  const lines = useMemo(() => stationLines(s, rep.lines), [rep.lines, s])
  const beaten = loadKing().beaten.includes(s.id)
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('')} />
      <div className="king-banner">
        <img src={IMG + s.scene} alt="" />
        <div>
          <span className="king-kicker">Year {s.year}</span>
          <p>{s.intro}</p>
        </div>
      </div>
      <div className="king-master">
        <Portrait m={s.master} className="king-portrait" />
        <div>
          <b>{s.master.name}</b>
          <small>{s.master.from}</small>
        </div>
        <button type="button" onClick={() => go(`king/${s.id}/talk`)}>Talk</button>
      </div>
      <div className="king-skills">
        {s.skills.map((k) => <span key={k}>{k}</span>)}
      </div>
      <div className="path king-path">
        {s.games.map((g, i) => (
          <div key={g.id} className={`path-step offset-${i % 4}`}>
            <button type="button" className="path-node king-game" onClick={() => go(`king/${s.id}/${g.id}`)} aria-label={g.title}>✦</button>
            <div className="path-label">{g.title}</div>
          </div>
        ))}
        {lines.map((line, i) => (
          <PathStep key={line.id} line={line} i={i + s.games.length} rep={rep} now={now} branch={null} open={open === line.id} onToggle={() => setOpen(open === line.id ? null : line.id)} />
        ))}
        <div className="path-step">
          <button type="button" className={`path-node king-boss ${beaten ? 'beaten' : ''}`} onClick={() => go(`king/${s.id}/boss`)} aria-label={`Boss: ${s.boss.name}`}>
            {beaten ? '✓' : <img className="king-node-img" src={IMG + s.boss.img} alt="" />}
          </button>
          <div className="path-label">Boss: {s.boss.name}</div>
          {beaten && <div className="path-result perfect">Beaten</div>}
        </div>
      </div>
    </div>
  )
}

function KingTalk({ s }: { s: Station }) {
  const m = s.master
  const [n, setN] = useState(1)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [n])
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={m.name} />
      <div className="king-talk">
        {m.talk.slice(0, n).map((l, i) => (
          <div key={i} className={`king-line ${l.who === 'master' ? '' : 'me'}`}>
            {l.who === 'master' ? <Portrait m={m} className="king-avatar" /> : <Avatar who={l.who} className="king-avatar" />}
            <div className="king-say">{l.text}</div>
          </div>
        ))}
      </div>
      <div ref={end}>
        <button type="button" className="primary wide" onClick={() => (n < m.talk.length ? setN(n + 1) : go('king/' + s.id))}>
          {n < m.talk.length ? 'Next' : 'Start the quests'}
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
        <q>{line}</q>
        {progress !== undefined && <div className="king-hp"><span style={{ width: `${progress}%` }} /></div>}
        {hearts !== undefined && <Hearts n={hearts} />}
      </div>
    </div>
  )
}

function beat(id: string) {
  const p = loadKing()
  if (!p.beaten.includes(id)) saveKing({ ...p, beaten: [...p.beaten, id] })
}

function Victory({ s }: { s: Station }) {
  useEffect(() => {
    beat(s.id)
    fx.success()
  }, [s.id])
  const crown = s.finale
  return (
    <div className="screen king-screen">
      <div className={`done king-victory ${crown ? 'crown' : ''}`}>
        <div className="king-defeated" aria-hidden="true">
          <img src={IMG + (crown ? 'liam.jpg' : s.boss.img)} alt="" />
          <span>{crown ? '👑' : '🏅'}</span>
        </div>
        <div className="done-title">{crown ? 'King of Chess!' : `${s.boss.name} is beaten!`}</div>
        <p>{s.boss.win}</p>
        <div className="done-actions">
          <button type="button" onClick={() => go('king/' + s.id)}>{s.name}</button>
          <button type="button" className="primary" onClick={() => go('')}>World map</button>
        </div>
      </div>
    </div>
  )
}

function QuestDone({ s, icon, title, text }: { s: Station; icon: string; title: string; text: string }) {
  useEffect(() => {
    fx.success()
  }, [])
  return (
    <div className="screen king-screen">
      <div className="done">
        <div className="king-medal" aria-hidden="true">{icon}</div>
        <div className="done-title">{title}</div>
        <p>{text}</p>
        <div className="done-actions">
          <button type="button" onClick={() => go('king/' + s.id)}>{s.name}</button>
          <button type="button" className="primary" onClick={() => go(`king/${s.id}/boss`)}>Face the boss</button>
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
              if (o === q.answer) fx.move('Nf3')
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
        <div className="king-fb ok">
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
      <button type="button" className="primary wide" onClick={() => go(`king/${s.id}/boss`)}>Ready for the Captain of the Guard</button>
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

function BoardRounds({ s, rounds, boss, title, lesson, hint, orientation = 'white' }: { s: Station; rounds: BoardRound[]; boss?: boolean; title?: string; lesson?: string; hint?: string; orientation?: 'white' | 'black' }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [state, setState] = useState<'play' | 'wrong' | 'hit'>('play')
  if (i >= rounds.length) return boss ? <Victory s={s} /> : <QuestDone s={s} icon="✦" title="Well done!" text={`You finished “${title}”. ${s.boss.name} is waiting.`} />
  const r = rounds[i]
  const arrows: Arrow[] = state === 'wrong' ? [{ startSquare: r.from, endSquare: r.to, color: ARROW.correct }] : []
  const styles = state === 'hit' ? { [r.from]: LAST_MOVE, [r.to]: LAST_MOVE } : {}
  // The move is really played: the piece glides to its square, like in the normal game
  const fen = state === 'hit' ? new Chess(r.fen).move({ from: r.from, to: r.to }).after : r.fen
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : title} />
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
                  fx.move(r.san)
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
        <div className="king-fb ok">
          <b>Hit! {r.san}</b>
          <p>{r.why}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setState('play') }}>{i + 1 < rounds.length ? (boss ? 'Next attack' : 'Next') : boss ? 'Finish!' : 'Done'}</button>
        </div>
      ) : state === 'wrong' ? (
        <div className="king-fb no" role="alert">
          <b>Not that one</b>
          <p>{boss ? 'You lose a heart. ' : ''}Play the green arrow.</p>
        </div>
      ) : (
        <p className="note">{orientation === 'black' ? 'You play Black' : 'You play White'}{hint ? <> · <b>{hint}</b></> : ''}. Play your move on the board.</p>
      )}
    </div>
  )
}

function LineBoss({ s, rep }: { s: Station; rep: Repertoire }) {
  const lines = useMemo(() => stationLines(s, rep.lines), [rep.lines, s])
  const [rounds] = useState(() => lineRounds(lines, 4))
  if (!rounds.length) return <p className="note">No lines found for this station.</p>
  return <BoardRounds s={s} rounds={rounds} boss hint={s.lines?.title ?? s.lines?.opening} orientation={s.lines?.side === 'b' ? 'black' : 'white'} />
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

function CrossRounds({ s, rounds, boss }: { s: Station; rounds: Crossroad[]; boss?: boolean }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [picked, setPicked] = useState<string | null>(null)
  if (i >= rounds.length) return boss ? <Victory s={s} /> : <QuestDone s={s} icon="🧭" title="You know the roads" text="Every answer of your opponent has its road in your book." />
  const c = rounds[i]
  const choice = c.options.find((o) => o.san === picked)
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : 'Which road?'} />
      {boss && <BossCard s={s} line={i === 0 ? s.boss.taunt : 'Next crossroads!'} progress={(100 * (rounds.length - i)) / rounds.length} hearts={hearts} />}
      {boss && i === 0 && <p className="note small">57% 1...e5 · 20% 1...d5: your 1,155 games of 3 months (analysis of Oct 31).</p>}
      <KBoard fen={c.fen} orientation="white" />
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
            <b>{o.san}</b> <small>{o.note}</small>
          </button>
        ))}
      </div>
      {boss && hearts <= 0 ? (
        <OutOfHearts s={s} why={c.why} retry={() => { setI(0); setHearts(3); setPicked(null) }} />
      ) : choice?.ok ? (
        <div className="king-fb ok">
          <p>Right road! {c.why}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setPicked(null) }}>Next</button>
        </div>
      ) : picked ? (
        <div className="king-fb no" role="alert"><p>Wrong road – that is not in your book. Try another.</p></div>
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

// ---------- the War Tent: all the trainers the app already has ----------

export function WarTent({ puzzles }: { puzzles: Puzzles }) {
  const winning = useMemo(() => puzzles.puzzles.filter((p) => clampScore(p.scoreBefore) >= 300), [puzzles.puzzles])
  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the world map">←</button>
        <div>
          <div className="eyebrow">Your camp · it travels with you</div>
          <h2>The War Tent</h2>
        </div>
      </div>
      <div className="king-banner">
        <img src={IMG + 'tent.jpg'} alt="" />
        <div>
          <span className="king-kicker">Your camp · it travels with you</span>
          <p>A good general trains before every battle.</p>
        </div>
      </div>
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
        <button type="button" onClick={() => go('trophies')}>Trophies</button>
        <button type="button" onClick={() => go('watch')}>Together with Johanna</button>
      </div>
    </div>
  )
}
