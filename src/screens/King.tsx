import { useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { ARROW, Board, LAST_MOVE } from '../components/Board'
import { Avatar, HOPPY_INNER, LIAM_INNER, Portrait, RIDER_INNER, SHIP_INNER, TENT_INNER } from '../components/KingArt'
import { PathStep } from '../components/PathStep'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import type { Repertoire } from '../hooks/useRepertoire'
import { clampScore } from '../lib/blunders'
import { feedback as fx } from '../lib/feedback'
import { ARMY, LORD_FOG, RIDDLES, STATIONS, TENT_AT, loadKing, saveKing, stationById, type Station } from '../lib/king'
import '../king.css'

const IMG = import.meta.env.BASE_URL + 'king/'

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

const FOG = (x: number, y: number) =>
  `<g opacity=".92"><ellipse cx="${x - 14}" cy="${y - 6}" rx="34" ry="16" fill="#fff"/><ellipse cx="${x + 18}" cy="${y + 4}" rx="30" ry="14" fill="#fff"/><ellipse cx="${x}" cy="${y - 18}" rx="22" ry="13" fill="#fff"/><text x="${x}" y="${y + 2}" text-anchor="middle" font-size="22" font-weight="800" fill="#9a93ad">?</text></g>`

function KingMap() {
  const [state, setState] = useState(loadKing)
  const [toast, showToast] = useToast()
  const scroller = useRef<HTMLDivElement>(null)
  const token = useRef<SVGGElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const traveling = useRef(false)
  const here = stationById(state.here) ?? STATIONS[0]

  // Open on the station where Liam stands
  useEffect(() => {
    const sc = scroller.current
    if (!sc) return
    sc.scrollLeft = Math.max(0, here.x - sc.clientWidth / 2)
    sc.scrollTop = Math.max(0, here.y - sc.clientHeight / 2)
  }, [here])

  function travel(target: Station) {
    if (traveling.current) return
    if (!target.open) {
      showToast(`${target.name} is still in the fog – it opens in the next stage.`)
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
    if (sea) el.innerHTML = `${SHIP_INNER}<g transform="translate(-16,-32) scale(0.2)">${LIAM_INNER}</g><g transform="translate(-2,-26) scale(0.16)">${HOPPY_INNER}</g>`
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dur = reduce ? 1 : Math.min(2200, 400 + len * 2.4)
    let t0 = 0
    const frame = (now: number) => {
      t0 ||= now
      const t = Math.min(1, (now - t0) / dur)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const pt = path.getPointAtLength(e * len)
      el.setAttribute('transform', `translate(${pt.x},${pt.y - (sea ? 6 : 76)})`)
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
          <image href={IMG + 'worldmap.jpg'} x="0" y="0" width="1800" height="764" />
          {STATIONS.map((s) => {
            const beaten = state.beaten.includes(s.id)
            const ring = beaten ? '#ffc531' : s.open ? '#4fc414' : '#b5afc4'
            return (
              <g
                key={s.id}
                className="king-stop"
                transform={`translate(${s.x},${s.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${s.name}, ${s.year}${s.open ? '' : ', still in the fog'}`}
                onClick={() => travel(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    travel(s)
                  }
                }}
              >
                {s.open && !beaten && s.id !== here.id && <circle r="30" fill={ring} opacity=".3" className="king-pulse" />}
                <ellipse cx="0" cy="14" rx="30" ry="11" fill={ring} opacity=".3" stroke={ring} strokeWidth="3" />
                <circle r="36" fill="transparent" />
                {beaten && (
                  <g transform="translate(26,6)">
                    <circle r="9" fill="#ffc531" stroke="#e0a200" strokeWidth="2" />
                    <text y="4" fontSize="11" textAnchor="middle" fontWeight="900" fill="#fff">✓</text>
                  </g>
                )}
                <text className="king-label" y="40" textAnchor="middle">{s.name}</text>
                <g transform="translate(0,55)">
                  <rect x="-38" y="-10" width="76" height="16" rx="8" fill="#2b2140" opacity=".88" />
                  <text className="king-year" y="2.5" textAnchor="middle">{s.year}</text>
                </g>
                {!s.open && <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: FOG(0, -10) }} />}
              </g>
            )
          })}
          <g className="king-stop" transform={`translate(${TENT_AT.x},${TENT_AT.y})`} role="button" tabIndex={0} aria-label="War Tent" onClick={() => go('tent')} onKeyDown={(e) => e.key === 'Enter' && go('tent')}>
            <g dangerouslySetInnerHTML={{ __html: TENT_INNER }} />
            <text className="king-label" y="24" textAnchor="middle">War Tent</text>
          </g>
          <g ref={token} transform={`translate(${here.x},${here.y - 76})`}>
            <g className="king-bob" dangerouslySetInnerHTML={{ __html: RIDER_INNER }} />
          </g>
        </svg>
      </div>
      <div className="king-hud">
        <Avatar who="hoppy" className="king-hud-face" />
        <div className="king-bubble">
          {state.beaten.length === 0 ? (
            <>Prince Liam, our journey starts in <b>Kannauj</b>. Tap a city to travel!</>
          ) : (
            <>Well done! {state.beaten.length} of 3 stations conquered. Where to next?</>
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
  if (!s || !s.open) {
    return (
      <div className="screen king-screen">
        <p className="note">This station is still in the fog.</p>
        <button type="button" className="primary" onClick={() => go('')}>World map</button>
      </div>
    )
  }
  if (sub === 'talk') return <KingTalk s={s} />
  if (sub === 'army') return <KingArmy s={s} />
  // Keys: a quest and its boss share a screen, but each starts fresh
  if (sub === 'riddle') return <KingRiddle key="quest" s={s} boss={false} />
  if (sub === 'boss') return s.boss.kind === 'london' ? <LordFog key="boss" s={s} /> : s.boss.kind === 'riddle' ? <KingRiddle key="boss" s={s} boss /> : <ArmyQuiz key="boss" s={s} />
  return <StationPage s={s} rep={rep} />
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
  const lines = useMemo(() => (s.opening ? rep.lines.filter((l) => l.source !== 'import' && l.opening === s.opening && l.side === 'w') : []), [rep.lines, s.opening])
  const beaten = loadKing().beaten.includes(s.id)
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('')} />
      {s.scene ? (
        <div className="king-banner">
          <img src={IMG + s.scene} alt="" />
          <div>
            <span className="king-kicker">Year {s.year}</span>
            <p>{s.intro}</p>
          </div>
        </div>
      ) : (
        <div className="king-era" style={{ background: s.color }}>
          <span className="king-kicker">Year {s.year}</span>
          <p>{s.intro}</p>
        </div>
      )}
      {s.master && (
        <div className="king-master">
          <Portrait m={s.master} className="king-portrait" />
          <div>
            <b>{s.master.name}</b>
            <small>{s.master.from}</small>
          </div>
          <button type="button" onClick={() => go(`king/${s.id}/talk`)}>Talk</button>
        </div>
      )}
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
            {beaten ? '✓' : s.boss.face}
          </button>
          <div className="path-label">Boss: {s.boss.name}</div>
          {beaten && <div className="path-result perfect">Beaten</div>}
        </div>
      </div>
    </div>
  )
}

function KingTalk({ s }: { s: Station }) {
  const m = s.master!
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

// Kannauj: the army with the Indian pieces
const START = ['rnbqkbnr', 'pppppppp', '8', '8', '8', '8', 'PPPPPPPP', 'RNBQKBNR']
function IndianBoard() {
  const icon = Object.fromEntries(ARMY.map((a) => [a.piece, a.icon]))
  const cells: React.ReactNode[] = []
  START.forEach((row, r) => {
    let f = 0
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let k = 0; k < +ch; k++, f++) cells.push(<div key={`${r}${f}`} className={`king-sq ${(r + f) % 2 ? 'd' : 'l'}`} />)
      } else {
        cells.push(
          <div key={`${r}${f}`} className={`king-sq ${(r + f) % 2 ? 'd' : 'l'}`}>
            <span className={`king-piece ${ch === ch.toUpperCase() ? 'w' : 'b'}`}>{icon[ch.toLowerCase()]}</span>
          </div>,
        )
        f++
      }
    }
  })
  return <div className="king-board" role="img" aria-label="Starting position with the Indian army">{cells}</div>
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

function Hearts({ n }: { n: number }) {
  return <span className="king-hearts" aria-label={`${n} hearts left`}>{'♥'.repeat(Math.max(n, 0))}{'♡'.repeat(Math.max(3 - n, 0))}</span>
}

function beat(id: string) {
  const p = loadKing()
  if (!p.beaten.includes(id)) saveKing({ ...p, beaten: [...p.beaten, id] })
}

function Victory({ s, text }: { s: Station; text: string }) {
  useEffect(() => {
    beat(s.id)
    fx.success()
  }, [s.id])
  return (
    <div className="screen king-screen">
      <div className="done">
        <div className="king-medal" aria-hidden="true">🏅</div>
        <div className="done-title">{s.boss.name} is beaten!</div>
        <p>{text}</p>
        <div className="done-actions">
          <button type="button" onClick={() => go('king/' + s.id)}>{s.name}</button>
          <button type="button" className="primary" onClick={() => go('')}>World map</button>
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

// Kannauj boss: name the pieces of the army
function ArmyQuiz({ s }: { s: Station }) {
  const qs = useMemo(() => ARMY.filter((a) => a.piece !== 'k').map((a) => ({ a, options: shuffle(ARMY.filter((x) => x.piece !== 'k').map((x) => x.is)).slice(0, 3) })), [])
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [picked, setPicked] = useState<string | null>(null)
  if (i >= qs.length) return <Victory s={s} text="You know your whole army. On to Persia – a riddle is waiting!" />
  const q = qs[i]
  const options = q.options.includes(q.a.is) ? q.options : [...q.options.slice(0, 2), q.a.is].sort()
  const right = picked === q.a.is
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={s.boss.name} />
      <div className="king-boss-card">
        <span className="king-face" aria-hidden="true">{s.boss.face}</span>
        <div>
          <q>Only those who know their army may pass!</q>
          <Hearts n={hearts} />
        </div>
      </div>
      <div className="king-question"><span className="king-big" aria-hidden="true">{q.a.icon}</span> What is the <b>{q.a.name}</b> today?</div>
      <div className="king-options">
        {options.map((o) => (
          <button
            type="button"
            key={o}
            disabled={!!picked && right}
            className={picked === o ? (o === q.a.is ? 'right' : 'wrong') : ''}
            onClick={() => {
              setPicked(o)
              if (o === q.a.is) fx.move('Nf3')
              else {
                fx.wrong()
                setHearts(hearts - 1)
              }
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {hearts <= 0 ? (
        <OutOfHearts s={s} why={`The ${q.a.name} is the ${q.a.is}.`} retry={() => { setI(0); setHearts(3); setPicked(null) }} />
      ) : right ? (
        <button type="button" className="primary wide" onClick={() => { setI(i + 1); setPicked(null) }}>Next</button>
      ) : null}
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

// Persia: watch the elephant and work out its rule (as a quest, and as the boss with hearts)
function KingRiddle({ s, boss }: { s: Station; boss: boolean }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [picked, setPicked] = useState<string | null>(null)
  if (i >= RIDDLES.length)
    return boss ? (
      <Victory s={s} text="Like Buzurgmihr, you worked out the rule just by watching. The envoy bows – Persia keeps its gold." />
    ) : (
      <div className="screen king-screen">
        <div className="done">
          <div className="king-medal" aria-hidden="true">🐘</div>
          <div className="done-title">You read the rule!</div>
          <p>In shatranj the elephant jumps exactly two squares diagonally – it can only ever reach 8 of the 64 squares.</p>
          <div className="done-actions">
            <button type="button" onClick={() => go('king/' + s.id)}>Persia</button>
            <button type="button" className="primary" onClick={() => go(`king/${s.id}/boss`)}>Face the envoy</button>
          </div>
        </div>
      </div>
    )
  const r = RIDDLES[i]
  const ok = r.options.find((o) => o.text === picked)?.ok
  const styles = Object.fromEntries(r.seen.map((q) => [q, LAST_MOVE]))
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={boss ? s.boss.name : 'The riddle of the elephant'} />
      {boss && (
        <div className="king-boss-card">
          <span className="king-face" aria-hidden="true">{s.boss.face}</span>
          <div>
            <q>Work out the game – or Persia pays!</q>
            <Hearts n={hearts} />
          </div>
        </div>
      )}
      <Board fen={elephantFen(r.at)} orientation="white" squareStyles={styles} />
      <div className="king-question">🐘 {r.q}</div>
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
  const rows = Array.from({ length: 8 }, (_, k) => (k === r ? `${f ? f : ''}B${7 - f ? 7 - f : ''}` : '8'))
  return rows.join('/') + ' w - - 0 1'
}

// London: Lord Fog picks his moves from the London lines – play the move from your line on the board
function LordFog({ s }: { s: Station }) {
  const [i, setI] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [state, setState] = useState<'play' | 'wrong' | 'hit'>('play')
  if (i >= LORD_FOG.length) return <Victory s={s} text="The fog lifts over London. You get the London badge – the road to the Queen's Palace opens in the next stage." />
  const r = LORD_FOG[i]
  const arrows: Arrow[] = state === 'wrong' ? [{ startSquare: r.from, endSquare: r.to, color: ARROW.correct }] : []
  const styles = state === 'hit' ? { [r.from]: LAST_MOVE, [r.to]: LAST_MOVE } : {}
  return (
    <div className="screen king-screen">
      <StationHead s={s} back={() => go('king/' + s.id)} title={s.boss.name} />
      <div className="king-boss-card">
        <span className="king-face" aria-hidden="true">{s.boss.face}</span>
        <div>
          <q>{r.taunt}</q>
          <div className="king-hp"><span style={{ width: `${(100 * (LORD_FOG.length - i)) / LORD_FOG.length}%` }} /></div>
          <Hearts n={hearts} />
        </div>
      </div>
      <Board
        key={i}
        fen={r.fen}
        orientation="white"
        arrows={arrows}
        squareStyles={styles}
        onMove={
          state === 'hit' || hearts <= 0
            ? undefined
            : (from, to) => {
                if (from === r.from && to === r.to) {
                  fx.move(r.san)
                  setState('hit')
                  return true
                }
                fx.wrong()
                setHearts(hearts - 1)
                setState('wrong')
                return false
              }
        }
      />
      {hearts <= 0 ? (
        <OutOfHearts s={s} why={r.why} retry={() => { setI(0); setHearts(3); setState('play') }} />
      ) : state === 'hit' ? (
        <div className="king-fb ok">
          <b>Hit! {r.san}</b>
          <p>{r.why}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setState('play') }}>{i + 1 < LORD_FOG.length ? 'Next attack' : 'Finish him!'}</button>
        </div>
      ) : state === 'wrong' ? (
        <div className="king-fb no" role="alert">
          <b>Not the move from your line</b>
          <p>You lose a heart. Play the green arrow.</p>
        </div>
      ) : (
        <p className="note">Your move – play it on the board, like in your London lines.</p>
      )}
    </div>
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
        <button type="button" style={{ background: '#2b8a3e', borderColor: '#1b5e2a' }} onClick={() => go('review')}><span aria-hidden="true">🗺</span><b>Battle Plans</b><small>Your opening lines that are due</small></button>
        <button type="button" style={{ background: '#ef4a5a', borderColor: '#c42f3e' }} onClick={() => go('puzzles')}><span aria-hidden="true">🩹</span><b>Lost Battles</b><small>Your own mistakes as puzzles</small></button>
        <button type="button" style={{ background: '#2ea7f0', borderColor: '#1d84c4' }} onClick={() => go('threats')}><span aria-hidden="true">🗼</span><b>Watchtower</b><small>First check what the enemy threatens</small></button>
        <button type="button" style={{ background: '#ffc531', borderColor: '#e0a200', color: '#3a3450' }} disabled={!winning.length} onClick={() => go('play/puzzle/' + encodeURIComponent(winning[Math.floor(Math.random() * winning.length)].id))}><span aria-hidden="true">💰</span><b>Treasure Chest</b><small>Win your winning positions</small></button>
        <button type="button" style={{ background: '#5f5875', borderColor: '#3a3450' }} onClick={() => go('play')}><span aria-hidden="true">🛡</span><b>Sparring Ground</b><small>A game vs Hoppy-Bot</small></button>
        <button type="button" style={{ background: '#8a5cf6', borderColor: '#5b36c9' }} onClick={() => go('daily')}><span aria-hidden="true">🃏</span><b>Today's cards</b><small>Everything due, mixed</small></button>
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
