import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { MascotDrawing } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import { roadAmbush } from '../lib/ambush'
import { STATIONS, isOpen, loadKing, mirrorOpen, opensAfter, route, saveKing, stationById, titleOf, type Station } from '../lib/king'
import { dayNumber, loadResults } from '../lib/threatcheck'

// Explore mode (Lu, 12.11.): the whole painted world map, big and calm. Every city is a round painted coin
// (like the steps inside a city), the road is gold up to the next city and shows only three cities ahead.
// Pinch (or + / −) zooms into the painting. The story comes when you open a city, not here.
// Nothing moves by itself: after a city you come back here and tap the next one yourself.

const IMG = import.meta.env.BASE_URL + 'king/'
const W = 1800
const H = 764
// where a coin is drawn: near its city, spread so that no coin hides another (Europe is crowded)
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
const R = 28 // coin radius on the map at zoom 1
const SCROLL_KEY = 'hoppy-explore-scroll'
const ZOOM_KEY = 'hoppy-explore-zoom'
const ZOOM_MIN = 1
const ZOOM_MAX = 2.6

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
function readJSON<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function writeJSON(key: string, v: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(v))
  } catch {
    // not remembered: the map opens on the next city
  }
}
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

export function KingStamps() {
  const [state] = useState(loadKing)
  const [toast, setToast] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(0) // stage height
  const [zoom, setZoom] = useState(() => clampZoom(readJSON<number>(ZOOM_KEY) ?? 1))
  const cities = route().map((id) => stationById(id)!).filter(Boolean)
  const next = cities.find((s) => isOpen(s, state.beaten) && !state.beaten.includes(s.id))
  const bosses = STATIONS.filter((s) => !s.finale).length
  const beatenCount = state.beaten.filter((id) => STATIONS.some((s) => s.id === id && !s.finale)).length
  const dailyOpen = !loadResults()[dayNumber()]
  const nextIdx = next ? cities.indexOf(next) : cities.length - 1
  const shownRoad = cities.slice(0, nextIdx + 1 + AHEAD)
  const goldRoad = cities.slice(0, nextIdx + 1)

  // the map fills the height (a bit more, so the coins are big); zoom makes it bigger
  useLayoutEffect(() => {
    if (stage.current) setH(Math.max(stage.current.clientHeight, 420))
  }, [])
  const svgH = Math.round(h * 1.15 * zoom)
  const svgW = Math.round((svgH * W) / H)
  const k = svgH / H // screen pixels per map unit
  // coins and road grow slower than the map: zooming in shows more of the painting
  const u = 1 / Math.sqrt(zoom)

  function remember() {
    const sc = scroller.current
    if (sc) writeJSON(SCROLL_KEY, { left: sc.scrollLeft, top: sc.scrollTop })
  }

  // open where you left the map, else on the next city
  const placed = useRef(false)
  useLayoutEffect(() => {
    const sc = scroller.current
    if (!sc || !h || placed.current) return
    placed.current = true
    const saved = readJSON<{ left: number; top: number }>(SCROLL_KEY)
    if (saved) {
      sc.scrollLeft = saved.left
      sc.scrollTop = saved.top
    } else if (next) {
      const p = at(next)
      sc.scrollLeft = p.x * k - sc.clientWidth / 2
      sc.scrollTop = p.y * k - sc.clientHeight / 2
    }
  }, [h, k, next])

  // zoom around a point of the screen (the pinch centre or the middle), keeping that spot under the finger
  const pending = useRef<{ fx: number; fy: number; mx: number; my: number } | null>(null)
  const zoomTo = (z: number, fx?: number, fy?: number) => {
    const sc = scroller.current
    if (!sc) return
    const nz = clampZoom(z)
    const kNow = (sc.querySelector('svg')?.clientHeight ?? H) / H
    const cx = fx ?? sc.clientWidth / 2
    const cy = fy ?? sc.clientHeight / 2
    pending.current = { fx: cx, fy: cy, mx: (sc.scrollLeft + cx) / kNow, my: (sc.scrollTop + cy) / kNow }
    setZoom(nz)
    writeJSON(ZOOM_KEY, nz)
  }
  useLayoutEffect(() => {
    const sc = scroller.current
    const p = pending.current
    if (!sc || !p) return
    pending.current = null
    sc.scrollLeft = p.mx * k - p.fx
    sc.scrollTop = p.my * k - p.fy
    writeJSON(SCROLL_KEY, { left: sc.scrollLeft, top: sc.scrollTop })
  }, [k])

  // pinch with two fingers (the page itself does not zoom)
  const zoomRef = useRef(zoom)
  const zoomToRef = useRef(zoomTo)
  useEffect(() => {
    zoomRef.current = zoom
    zoomToRef.current = zoomTo
  })
  useEffect(() => {
    const sc = scroller.current
    if (!sc) return
    let start: { d: number; z: number } | null = null
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) start = { d: dist(e.touches), z: zoomRef.current }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !start) return
      e.preventDefault()
      const r = sc.getBoundingClientRect()
      const fx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left
      const fy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top
      const z = clampZoom(start.z * (dist(e.touches) / start.d))
      if (Math.abs(z - zoomRef.current) > 0.03) zoomToRef.current(z, fx, fy)
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) start = null
    }
    sc.addEventListener('touchstart', onStart, { passive: true })
    sc.addEventListener('touchmove', onMove, { passive: false })
    sc.addEventListener('touchend', onEnd)
    return () => {
      sc.removeEventListener('touchstart', onStart)
      sc.removeEventListener('touchmove', onMove)
      sc.removeEventListener('touchend', onEnd)
    }
  }, [])

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

  const scaleAt = (p: { x: number; y: number }) => `translate(${p.x},${p.y}) scale(${u}) translate(${-p.x},${-p.y})`
  const np = next ? at(next) : null
  const NR = R * 1.25
  return (
    <div className="explore">
      <div className="explore-top">
        <span className="king-coins" aria-label={`${titleOf(state.beaten)}, ${state.coins} chestnuts`}>
          <small>{titleOf(state.beaten)}</small>🌰 {state.coins}
        </span>
        <span className="explore-count">{beatenCount} / {bosses}</span>
      </div>
      {state.warmupAt && (
        <button type="button" className="explore-back" onClick={() => go('afterwards')}>
          <b>Back from chess.com?</b> Read your game
        </button>
      )}
      <div className="explore-stage" ref={stage}>
        <div className="explore-scroll" ref={scroller} onScroll={remember}>
          {h > 0 && (
            <svg width={svgW} height={svgH} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="World map of your journey with Hoppy" style={{ '--u': u } as CSSProperties}>
              <defs>
                {cities.map((s) => {
                  const p = at(s)
                  return (
                    <clipPath key={s.id} id={'coin-' + s.id}>
                      <circle cx={p.x} cy={p.y} r={s === next ? NR : R} />
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
              {cities.map((s, i) => {
                const p = at(s)
                const st = state.beaten.includes(s.id) ? 'done' : s === next ? 'next' : 'locked'
                const r = st === 'next' ? NR : R
                const bx = p.x + r * 0.74
                const by = p.y + r * 0.74
                const fs = st === 'next' ? 15 : 12
                const lw = s.name.length * fs * 0.58 + 14
                return (
                  <g
                    key={s.id}
                    transform={scaleAt(p)}
                    className={`ex-coin ${st}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${i + 1}. ${s.name}${st === 'done' ? ', done' : st === 'locked' ? ', still ahead' : ''}`}
                    onClick={() => open(s)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(s)}
                  >
                    {st === 'next' && <circle className="ex-pulse" cx={p.x} cy={p.y} r={r + 7} />}
                    <circle className="ex-rim-under" cx={p.x} cy={p.y + 6} r={r + 5} />
                    <circle className="ex-rim" cx={p.x} cy={p.y} r={r + 5} />
                    <image href={IMG + 'stamp-' + s.id + '.jpg'} x={p.x - r} y={p.y - r} width={2 * r} height={2 * r} clipPath={`url(#coin-${s.id})`} preserveAspectRatio="xMidYMid slice" className={st === 'locked' ? 'ex-gray' : ''} />
                    {st === 'done' && (
                      <g transform={`translate(${bx},${by})`}>
                        <circle r="11" className="ex-tick" />
                        <text y="5" className="ex-badge-text">✓</text>
                      </g>
                    )}
                    {st === 'locked' && (
                      <g transform={`translate(${bx},${by})`}>
                        <circle r="11" className="ex-num" />
                        <text y="4.5" className="ex-badge-text">{i + 1}</text>
                      </g>
                    )}
                    <rect className="ex-label" x={p.x - lw / 2} y={p.y + r + 10} width={lw} height={fs * 1.45} rx={fs * 0.72} />
                    <text x={p.x} y={p.y + r + 10 + fs * 1.08} className="ex-name" fontSize={fs}>{s.name}</text>
                  </g>
                )
              })}
              {np && (
                <g pointerEvents="none" transform={scaleAt(np)}>
                  <g className="king-bob">
                    <rect x={np.x - 44} y={np.y - NR - 50} width="88" height="30" rx="10" className="ex-start" />
                    <path d={`M${np.x - 8},${np.y - NR - 21} L${np.x},${np.y - NR - 12} L${np.x + 8},${np.y - NR - 21} Z`} fill="#fff" />
                    <text x={np.x} y={np.y - NR - 29} className="ex-start-text">START</text>
                  </g>
                  <g transform={`translate(${np.x + NR + 8},${np.y - 18})`}>
                    <ellipse cx="25" cy="52" rx="16" ry="4" fill="#3b2a14" opacity=".25" />
                    <g className="king-bob">
                      <g transform="scale(.44)">
                        <MascotDrawing />
                      </g>
                    </g>
                  </g>
                </g>
              )}
            </svg>
          )}
        </div>
        <div className="explore-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomTo(zoom * 1.4)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomTo(zoom / 1.4)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out">−</button>
        </div>
        {toast && <div className="king-toast" role="status">{toast}</div>}
      </div>
      <div className="explore-bottom">
        <button type="button" className="explore-go" onClick={() => (next ? open(next) : go('tent'))}>
          ▶ START <small>{next ? next.name : 'Training Camp'}</small>
        </button>
        <nav className="explore-modes" aria-label="Modes">
          <button type="button" onClick={() => go('')}><span aria-hidden="true">🏠</span>Home</button>
          <button type="button" onClick={() => go('journey')}><span aria-hidden="true">🗺️</span>Map</button>
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
          <button type="button" onClick={() => go('rush')}>💥 Square Rush</button>
          <button type="button" onClick={() => go('journey')}>🌍 The real map</button>
          <button type="button" className="close" onClick={() => setMore(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
