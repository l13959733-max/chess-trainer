import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { MascotDrawing, Mascot } from '../components/Mascot'
import { StoryBox } from '../components/StoryBox'
import { go } from '../hooks/useHashRoute'
import { roadAmbush } from '../lib/ambush'
import { STATIONS, isOpen, loadKing, mirrorOpen, opensAfter, route, saveKing, stationById, titleOf, type Station } from '../lib/king'
import { dayNumber, loadResults } from '../lib/threatcheck'

// Explore mode (Lu, 12.11., draft E "stamps"): the painted world map, every city a small painted card,
// the road gold up to Hoppy and only three cities ahead, Hoppy tells the story at the top.
// Nothing moves by itself: after a city you come back here and tap the next one yourself.

const IMG = import.meta.env.BASE_URL + 'king/'
const W = 1800
const H = 764
// where a card is drawn: near its city, spread so that no card hides another (Europe is crowded)
const AT: Record<string, [number, number]> = {
  kannauj: [1470, 470], persia: [1320, 450], samarkand: [1370, 330], baghdad: [1205, 455], orbit: [1440, 235], chennai: [1515, 590],
  valencia: [800, 405], barcelona: [890, 385], rome: [995, 380], paris: [880, 295], london: [845, 210], edinburgh: [760, 160],
  reykjavik: [670, 95], north: [935, 105], palace: [955, 205], vienna: [1040, 285], forest: [1120, 165], newyork: [440, 322], rio: [600, 600],
}
const at = (s: Station) => {
  const p = AT[s.id] ?? [s.x, s.y]
  return { x: p[0], y: p[1] }
}
const AHEAD = 3 // legs of the road shown after the next city
const CARD = 54
const SCROLL_KEY = 'hoppy-explore-scroll'
const VIEW_KEY = 'hoppy-explore-view'
// Regions (Lu, 12.11., draft F): one part of the world at a time, big
const REGIONS: { id: string; name: string; box: [number, number, number, number]; ids: string[] }[] = [
  { id: 'asia', name: 'India & Persia', box: [1120, 200, 1600, 650], ids: ['kannauj', 'persia', 'samarkand', 'baghdad', 'orbit', 'chennai'] },
  { id: 'europe', name: 'Europe', box: [640, 50, 1180, 460], ids: ['north', 'valencia', 'barcelona', 'rome', 'palace', 'vienna', 'paris', 'edinburgh', 'london', 'forest', 'reykjavik'] },
  { id: 'america', name: 'Americas', box: [330, 230, 720, 680], ids: ['newyork', 'rio'] },
]
const regionOf = (id?: string) => REGIONS.find((r) => id && r.ids.includes(id)) ?? REGIONS[0]
function readView(): 'map' | 'regions' {
  try {
    return localStorage.getItem(VIEW_KEY) === 'regions' ? 'regions' : 'map'
  } catch {
    return 'map'
  }
}

function leg(a: { x: number; y: number }, b: { x: number; y: number }) {
  const bend = Math.hypot(a.x - b.x, a.y - b.y) > 300 ? 0.16 : 0.08
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return `Q${(mx - (b.y - a.y) * bend).toFixed(1)},${(my + (b.x - a.x) * bend).toFixed(1)} ${b.x},${b.y}`
}
function roadPath(cities: Station[]): string {
  if (cities.length < 2) return ''
  const p = cities.map(at)
  return `M${p[0].x},${p[0].y} ` + p.slice(1).map((b, i) => leg(p[i], b)).join(' ')
}

function readScroll(key: string): { left: number; top: number } | null {
  try {
    const v = sessionStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export function KingStamps() {
  const [state] = useState(loadKing)
  const [toast, setToast] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(0) // stage height
  const [view, setView] = useState(readView)
  const cities = route().map((id) => stationById(id)!).filter(Boolean)
  const next = cities.find((s) => isOpen(s, state.beaten) && !state.beaten.includes(s.id))
  const bosses = STATIONS.filter((s) => !s.finale).length
  const beatenCount = state.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length
  const crowned = state.beaten.includes('chennai')
  const dailyOpen = !loadResults()[dayNumber()]
  const doneIdx = cities.reduce((n, s, i) => (state.beaten.includes(s.id) ? i : n), -1)
  const nextIdx = next ? cities.indexOf(next) : cities.length - 1
  const shownRoad = cities.slice(0, nextIdx + 1 + AHEAD)
  const goldRoad = cities.slice(0, Math.max(doneIdx, nextIdx) + 1)
  const [regionId, setRegionId] = useState(() => regionOf(next?.id).id)
  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0]
  const scrollKey = SCROLL_KEY + ':' + (view === 'map' ? 'map' : region.id)

  // the map is a bit taller than the screen, so the cards are big; it stays where you left it
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    setH(Math.max(el.clientHeight, 420))
  }, [])
  // what the map shows: the whole world (a bit taller than the screen, so the cards are big) or one region
  const [vx, vy, vw, vh] = view === 'map' ? [0, 0, W, H] : (() => {
    const [x0, y0, x1, y1] = region.box
    return [x0, y0, x1 - x0, y1 - y0]
  })()
  const svgH = view === 'map' ? Math.round(h * 1.3) : h
  const k = svgH / vh // screen pixels per map unit
  const kMap = (h * 1.3) / H
  const u = view === 'map' ? 1 : (1.15 * kMap) / k // cards a little bigger in a region, same look
  const svgW = Math.round(vw * k)
  const visible = view === 'map' ? cities : cities.filter((c) => region.ids.includes(c.id))
  useLayoutEffect(() => {
    const sc = scroller.current
    if (!sc || !h) return
    const saved = readScroll(scrollKey)
    if (saved) {
      sc.scrollLeft = saved.left
      sc.scrollTop = saved.top
    } else {
      const p = next && visible.includes(next) ? at(next) : null
      sc.scrollLeft = p ? (p.x - vx) * k - sc.clientWidth / 2 : 0
      sc.scrollTop = p ? (p.y - vy) * k - sc.clientHeight / 2 : 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, scrollKey])
  function remember() {
    const sc = scroller.current
    if (!sc) return
    try {
      sessionStorage.setItem(scrollKey, JSON.stringify({ left: sc.scrollLeft, top: sc.scrollTop }))
    } catch {
      // not remembered: the map opens on the next city
    }
  }

  function say(t: string) {
    setToast(t)
    window.setTimeout(() => setToast((x) => (x === t ? null : x)), 2600)
  }
  function open(s: Station) {
    if (!isOpen(s, state.beaten)) {
      say(`${s.name} is still ahead. First beat the boss in ${opensAfter(s, state.beaten)?.name ?? 'the city before'}.`)
      return
    }
    if (s.id !== state.here) {
      if (roadAmbush(state.beaten)) {
        go('encounter/' + s.id)
        return
      }
      saveKing({ ...loadKing(), here: s.id })
    }
    go('king/' + s.id)
  }

  // Hoppy tells the story of the next city (Game Boy style)
  const story = crowned
    ? [{ who: 'Hoppy', text: 'You are the King of Chess! Every city is open – ride wherever you like.' }]
    : next
      ? [
          { who: 'Hoppy', text: beatenCount === 0 ? `Chess was born in India. Our journey starts in ${next.name}!` : `Next stop: ${next.name}, ${next.year}.` },
          { who: 'Hoppy', text: next.intro },
          { who: 'Hoppy', text: `Tap ${next.name} on the map – or the green button.` },
        ]
      : []
  const face = (
    <span className="king-hoppy gb-hoppy">
      <Mascot />
    </span>
  )

  return (
    <div className="explore">
      <div className="explore-top">
        <span className="king-coins" aria-label={`${titleOf(state.beaten)}, ${state.coins} chestnuts`}>
          <small>{titleOf(state.beaten)}</small>🌰 {state.coins}
        </span>
        <span className="explore-count">{beatenCount} / {bosses}</span>
      </div>
      {story.length > 0 && <StoryBox key={next?.id ?? 'crown'} compact lines={story.map((l) => ({ ...l, face }))} />}
      {state.warmupAt && (
        <button type="button" className="explore-back" onClick={() => go('afterwards')}>
          <b>Back from chess.com?</b> Read your game
        </button>
      )}
      <div className="explore-views">
        <span className="explore-seg" role="group" aria-label="View">
          {(['map', 'regions'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v)
                try {
                  localStorage.setItem(VIEW_KEY, v)
                } catch {
                  // the view is not remembered
                }
              }}
            >
              {v === 'map' ? 'Map' : 'Regions'}
            </button>
          ))}
        </span>
        {view === 'regions' && (
          <span className="explore-regions">
            {REGIONS.map((r) => (
              <button key={r.id} type="button" aria-pressed={r.id === region.id} onClick={() => setRegionId(r.id)}>
                {r.name} <small>{r.ids.filter((id) => state.beaten.includes(id)).length}/{r.ids.length}</small>
              </button>
            ))}
          </span>
        )}
      </div>
      <div className="explore-stage" ref={stage}>
        <div className="explore-scroll" ref={scroller} onScroll={remember}>
          {h > 0 && (
            <svg width={svgW} height={svgH} viewBox={`${vx} ${vy} ${vw} ${vh}`} role="img" aria-label="World map of your journey with Hoppy" style={{ '--u': u } as CSSProperties}>
              <defs>
                {cities.map((s) => {
                  const p = at(s)
                  const size = s === next ? CARD * 1.3 : CARD
                  return (
                    <clipPath key={s.id} id={'stamp-' + s.id}>
                      <rect x={p.x - size / 2} y={p.y - size / 2} width={size} height={size} rx="6" />
                    </clipPath>
                  )
                })}
              </defs>
              <image href={IMG + 'worldmap.jpg'} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
              <g pointerEvents="none">
                <path d={roadPath(shownRoad)} className="ex-road-edge" />
                <path d={roadPath(shownRoad)} className="ex-road" />
                <path d={roadPath(shownRoad)} className="ex-road-dots" />
                {goldRoad.length > 1 && <path d={roadPath(goldRoad)} className="ex-gold-edge" />}
                {goldRoad.length > 1 && <path d={roadPath(goldRoad)} className="ex-gold" />}
              </g>
              {visible.map((s) => {
                const i = cities.indexOf(s)
                const p = at(s)
                const st = state.beaten.includes(s.id) ? 'done' : s === next ? 'next' : isOpen(s, state.beaten) ? 'open' : 'locked'
                const size = st === 'next' ? CARD * 1.3 : CARD
                const x0 = p.x - size / 2
                const y0 = p.y - size / 2
                return (
                  <g
                    key={s.id}
                    transform={`translate(${p.x},${p.y}) scale(${u}) translate(${-p.x},${-p.y})`}
                    className={`ex-stamp ${st}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${i + 1}. ${s.name}${st === 'done' ? ', done' : st === 'locked' ? ', still ahead' : ''}`}
                    onClick={() => open(s)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(s)}
                  >
                    {st === 'next' && <rect className="ex-pulse" x={x0 - 8} y={y0 - 8} width={size + 16} height={size + 30} rx="12" />}
                    <rect x={x0 - 5} y={y0} width={size + 10} height={size + 24} rx="9" className="ex-shadow" />
                    <rect x={x0 - 5} y={y0 - 5} width={size + 10} height={size + 24} rx="9" className="ex-card" />
                    <image href={IMG + 'stamp-' + s.id + '.jpg'} x={x0} y={y0} width={size} height={size} clipPath={`url(#stamp-${s.id})`} preserveAspectRatio="xMidYMid slice" className={st === 'locked' ? 'ex-gray' : ''} />
                    <text x={p.x} y={y0 + size + 13} className="ex-name" fontSize={(st === 'next' ? 13 : 10.5) * (s.name.length > 11 ? 0.85 : 1)}>{s.name}</text>
                    {st === 'done' && (
                      <g transform={`translate(${x0 + size + 2},${y0 - 2})`}>
                        <circle r="11" className="ex-tick" />
                        <text y="5" className="ex-badge-text">✓</text>
                      </g>
                    )}
                    {st === 'locked' && (
                      <g transform={`translate(${x0 + size + 2},${y0 - 2})`}>
                        <circle r="11" className="ex-num" />
                        <text y="4.5" className="ex-badge-text">{i + 1}</text>
                      </g>
                    )}
                  </g>
                )
              })}
              {next && visible.includes(next) && (
                <g pointerEvents="none" transform={`translate(${at(next).x},${at(next).y}) scale(${u}) translate(${-at(next).x},${-at(next).y})`}>
                  <g className="king-bob">
                    <rect x={at(next).x - 44} y={at(next).y - 82} width="88" height="30" rx="10" className="ex-start" />
                    <path d={`M${at(next).x - 8},${at(next).y - 53} L${at(next).x},${at(next).y - 44} L${at(next).x + 8},${at(next).y - 53} Z`} fill="#fff" />
                    <text x={at(next).x} y={at(next).y - 61} className="ex-start-text">START</text>
                  </g>
                  <g transform={`translate(${at(next).x + 42},${at(next).y - 20})`}>
                    <ellipse cx="27" cy="54" rx="17" ry="4" fill="#3b2a14" opacity=".25" />
                    <g className="king-bob">
                      <g transform="scale(.45)">
                        <MascotDrawing />
                      </g>
                    </g>
                  </g>
                </g>
              )}
            </svg>
          )}
        </div>
        {view === 'regions' && next && !visible.includes(next) && (
          <button type="button" className="explore-where" onClick={() => setRegionId(regionOf(next.id).id)}>
            Hoppy is in {next.name} →
          </button>
        )}
        {toast && <div className="king-toast" role="status">{toast}</div>}
      </div>
      <div className="explore-bottom">
        <button type="button" className="explore-go" onClick={() => (next ? open(next) : go('tent'))}>
          ▶ START <small>{next ? next.name : 'Training Camp'}</small>
        </button>
        <nav className="explore-modes" aria-label="Modes">
          <button type="button" className="on" aria-current="page"><span aria-hidden="true">🗺️</span>Explore</button>
          <button type="button" onClick={() => go('tent')}><span aria-hidden="true">⛺</span>Training</button>
          <button type="button" className={dailyOpen ? 'dot' : ''} onClick={() => go('threat-check')}><span aria-hidden="true">🎯</span>Daily</button>
          <button type="button" onClick={() => setMore(!more)} aria-expanded={more}><span aria-hidden="true">☰</span>More</button>
        </nav>
      </div>
      {more && (
        <div className="explore-more" role="dialog" aria-label="More">
          <button type="button" onClick={() => go('quests')}>📖 Quest book</button>
          <button type="button" onClick={() => go('road')}>🧭 Fast travel (list)</button>
          <button type="button" onClick={() => go(state.beaten.includes('kannauj') ? 'portal' : 'check')}>🌀 Real world</button>
          <button type="button" onClick={() => go('watch')}>👫 Together</button>
          {mirrorOpen(state.beaten) && <button type="button" onClick={() => go('mirror')}>🪞 Mirror World</button>}
          <button type="button" onClick={() => go('path')}>📚 All openings</button>
          <button type="button" onClick={() => go('world')}>🗺️ The old map</button>
          <button type="button" className="close" onClick={() => setMore(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
