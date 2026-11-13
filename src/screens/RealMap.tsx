import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import 'maplibre-gl/dist/maplibre-gl.css'
import { BottomBar } from '../components/BottomBar'
import { MascotDrawing } from '../components/Mascot'
import { isOpen, loadKing, opensAfter, type Station } from '../lib/king'
import { CITIES, LNGLAT, SOON, attach, currentMap, persistent } from '../lib/realMap'
import { travelTo } from '../lib/travel'

// Draft (Lu, 12.11. evening): a real map like in the Neuhaus software – free OpenStreetMap tiles from OpenFreeMap
// (no key, no cost), drawn in the book colours (cream, terracotta). Cities sit where they really are; you zoom
// from the whole world down to the streets of Barcelona. Since 14.11. the map itself lives on in lib/realMap.ts.
const IMG = import.meta.env.BASE_URL + 'king/'

export default function RealMap() {
  const [state] = useState(loadKing)
  const box = useRef<HTMLDivElement>(null)
  const [{ nodes, hoppyNode, soonNodes, failed: failedBefore }] = useState(persistent)
  const map = { get current() { return currentMap() } }
  const [failed, setFailed] = useState(failedBefore)
  // far out, only the next city keeps its name – Europe is too crowded for every label (Lu: „gut aufs Handy“)
  const [far, setFar] = useState(true)
  const [picked, setPicked] = useState<Station | null>(null)
  const cities = CITIES
  const next = cities.find((s) => isOpen(s, state.beaten) && !state.beaten.includes(s.id))
  const [soon, setSoon] = useState<(typeof SOON)[number] | null>(null)

  // show the finished map: move it from the parking spot into the page, park it again when you leave
  useEffect(() => {
    if (!box.current) return
    return attach(box.current, { zoom: setFar, fail: () => setFailed(true) })
  }, [])

  function pick(s: Station) {
    setSoon(null)
    setPicked(s)
    map.current?.flyTo({ center: LNGLAT[s.id], zoom: Math.max(map.current.getZoom(), 5.5), duration: 1400, essential: true })
  }
  const open = (s: Station) => travelTo(s)

  const pickedOpen = picked ? isOpen(picked, state.beaten) : false
  return (
    <div className={`rm${far ? ' rm-far' : ''}`}>
      <div className="rm-map" ref={box} />
      {failed && <p className="rm-fail">The map needs internet. Try again when you are online.</p>}
      {cities.map((s, i) => {
        const st = state.beaten.includes(s.id) ? 'done' : s === next ? 'next' : 'locked'
        return createPortal(
          <button type="button" className={`rm-coin rm-${st}`} onClick={() => (isOpen(s, state.beaten) ? open(s) : pick(s))} aria-label={`${i + 1}. ${s.name}${isOpen(s, state.beaten) ? '' : ', still ahead'}`}>
            <img src={IMG + 'stamp-' + s.id + '.jpg'} alt="" />
            {st === 'done' && <i className="rm-badge">✓</i>}
            {st === 'locked' && <i className="rm-badge">{i + 1}</i>}
            <span className="rm-name">{s.name}</span>
          </button>,
          nodes[s.id],
          s.id,
        )
      })}
      {SOON.map((c) =>
        createPortal(
          <button
            type="button"
            className="rm-coin rm-soon"
            onClick={() => {
              setPicked(null)
              setSoon(c)
              map.current?.flyTo({ center: c.at, zoom: Math.max(map.current.getZoom(), 5.5), duration: 1400, essential: true })
            }}
            aria-label={`${c.name}, coming soon`}
          >
            <span className="rm-soon-in" aria-hidden="true">♜</span>
            <span className="rm-name">{c.name} · soon</span>
          </button>,
          soonNodes[c.id],
          c.id,
        ),
      )}
      {next &&
        createPortal(
          <svg className="rm-hoppy king-bob" viewBox="0 0 120 120" width="54" height="54" aria-hidden="true">
            <MascotDrawing />
          </svg>,
          hoppyNode,
        )}
      {soon && (
        <div className="rm-sheet">
          <button type="button" className="rm-close" onClick={() => setSoon(null)} aria-label="Close">×</button>
          <p className="rm-kicker">Coming soon</p>
          <h2>{soon.name}</h2>
          <p className="rm-intro">{soon.note}</p>
        </div>
      )}
      {picked && (
        <div className="rm-sheet">
          <button type="button" className="rm-close" onClick={() => setPicked(null)} aria-label="Close">×</button>
          <p className="rm-kicker">{picked.year}</p>
          <h2>{picked.name}</h2>
          <p className="rm-intro">{picked.intro}</p>
          {pickedOpen ? (
            <button type="button" className="rm-go" onClick={() => open(picked)}>Open {picked.name}</button>
          ) : (
            <p className="rm-locked">Still ahead. First beat the boss in {opensAfter(picked, state.beaten)?.name ?? 'the city before'}.</p>
          )}
        </div>
      )}
      <BottomBar active={null} />
    </div>
  )
}
