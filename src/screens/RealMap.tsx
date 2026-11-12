import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MascotDrawing } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import { roadAmbush } from '../lib/ambush'
import { isOpen, loadKing, opensAfter, route, saveKing, stationById, type Station } from '../lib/king'

// Draft (Lu, 12.11. evening): a real map like in the Neuhaus software – free OpenStreetMap tiles from OpenFreeMap
// (no key, no cost), drawn in the book colours (cream, terracotta). Cities sit where they really are; you zoom
// from the whole world down to the streets of Barcelona. The painted map stays the start page.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const VIEW_KEY = 'hoppy-realmap-view'
const AHEAD = 3
const TERRA = '#7a3420'

// [longitude, latitude]. Places that are not one town on a real map are put where their story happens:
// Persia = Isfahan, The North = Trondheim, Queen's Palace = Göttingen (the manuscript), Winter Forest = Russian forest,
// Orbit = Baikonur (the rocket start). Lu decides.
const LNGLAT: Record<string, [number, number]> = {
  kannauj: [79.92, 27.05], persia: [51.67, 32.65], samarkand: [66.96, 39.65], baghdad: [44.36, 33.31],
  north: [10.39, 63.43], valencia: [-0.38, 39.47], barcelona: [2.17, 41.39], rome: [12.5, 41.9],
  palace: [9.93, 51.54], vienna: [16.37, 48.21], paris: [2.35, 48.86], edinburgh: [-3.19, 55.95],
  london: [-0.13, 51.51], forest: [37.5, 57.5], reykjavik: [-21.94, 64.15], newyork: [-74.01, 40.71],
  rio: [-43.17, -22.91], orbit: [63.31, 45.96], chennai: [80.27, 13.08],
}
const IMG = import.meta.env.BASE_URL + 'king/'

// recolour the plain OpenFreeMap style: paper land, calm sea, roads only when you come close, few labels
function bookStyle(s: StyleSpecification): StyleSpecification {
  const hide = /shield|airport|aeroway|railway|highway-name|label_other|label_village|waterway_line_label|tunnel/
  const layers = s.layers.flatMap((l) => {
    if (hide.test(l.id)) return []
    const p = { ...(('paint' in l && l.paint) || {}) } as Record<string, unknown>
    if (l.id === 'background') p['background-color'] = '#efe6d3'
    else if (l.id === 'water') p['fill-color'] = '#c3d3cf'
    else if (l.id === 'park' || l.id === 'landcover_wood') Object.assign(p, { 'fill-color': '#dfdcc0', 'fill-opacity': 0.55 })
    else if (l.id === 'landuse_residential') Object.assign(p, { 'fill-color': '#e8dcc5', 'fill-opacity': 0.7 })
    else if (l.id.startsWith('landcover_ice') || l.id === 'landcover_glacier') p['fill-color'] = '#f6f1e6'
    else if (l.id === 'building') p['fill-color'] = '#dccbb0'
    else if (l.id === 'waterway') p['line-color'] = '#b5c8c3'
    else if (l.id.includes('casing')) p['line-color'] = '#dccab0'
    else if (l.type === 'line' && l.id.startsWith('highway')) p['line-color'] = '#f8f2e6'
    else if (l.id.startsWith('boundary')) Object.assign(p, { 'line-color': '#c09a84', 'line-opacity': 0.8 })
    else if (l.type === 'symbol') Object.assign(p, { 'text-color': '#8b6450', 'text-halo-color': '#efe6d3', 'text-halo-width': 1.4 })
    // one English name per place (the plain style writes Latin and local script under each other)
    const layout = l.type === 'symbol' ? { ...(l.layout || {}), 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']] } : 'layout' in l ? l.layout : undefined
    return [{ ...l, paint: p, ...(layout ? { layout } : {}) } as typeof l]
  })
  return { ...s, layers }
}

function readView(): { center: [number, number]; zoom: number } | null {
  try {
    const v = sessionStorage.getItem(VIEW_KEY)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}
function writeView(m: maplibregl.Map) {
  try {
    const c = m.getCenter()
    sessionStorage.setItem(VIEW_KEY, JSON.stringify({ center: [c.lng, c.lat], zoom: m.getZoom() }))
  } catch {
    // not remembered: the map opens on the next city
  }
}
const line = (ids: Station[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: ids.map((s) => LNGLAT[s.id]) },
})

export default function RealMap() {
  const [state] = useState(loadKing)
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [failed, setFailed] = useState(false)
  const [picked, setPicked] = useState<Station | null>(null)
  const cities = useMemo(() => route().map((id) => stationById(id)!).filter((s) => s && LNGLAT[s.id]), [])
  const next = cities.find((s) => isOpen(s, state.beaten) && !state.beaten.includes(s.id))
  const nextIdx = next ? cities.indexOf(next) : cities.length - 1
  // one DOM node per coin; React draws into them, MapLibre moves them with the map
  const nodes = useMemo(() => Object.fromEntries(cities.map((s) => [s.id, document.createElement('div')])), [cities])
  const hoppyNode = useMemo(() => document.createElement('div'), [])

  useEffect(() => {
    if (!box.current) return
    let gone = false
    const saved = readView()
    const start = next ? LNGLAT[next.id] : LNGLAT.kannauj
    fetch(STYLE_URL)
      .then((r) => r.json())
      .then((style: StyleSpecification) => {
        if (gone || !box.current) return
        const m = new maplibregl.Map({
          container: box.current,
          style: bookStyle(style),
          center: saved?.center ?? start,
          zoom: saved?.zoom ?? 3.2,
          minZoom: 1.2,
          maxZoom: 16,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        })
        m.touchZoomRotate.disableRotation()
        m.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right')
        map.current = m
        m.on('moveend', () => writeView(m))
        m.on('load', () => {
          m.addSource('road-all', { type: 'geojson', data: line(cities.slice(0, nextIdx + 1 + AHEAD)) })
          m.addSource('road-done', { type: 'geojson', data: line(cities.slice(0, nextIdx + 1)) })
          m.addLayer({ id: 'road-all', type: 'line', source: 'road-all', paint: { 'line-color': TERRA, 'line-width': 2.5, 'line-opacity': 0.55, 'line-dasharray': [1.5, 2] }, layout: { 'line-cap': 'round' } })
          m.addLayer({ id: 'road-done', type: 'line', source: 'road-done', paint: { 'line-color': TERRA, 'line-width': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        })
        cities.forEach((s) => new maplibregl.Marker({ element: nodes[s.id], anchor: 'center' }).setLngLat(LNGLAT[s.id]).addTo(m))
        if (next) new maplibregl.Marker({ element: hoppyNode, anchor: 'bottom-left', offset: [22, -6] }).setLngLat(LNGLAT[next.id]).addTo(m)
      })
      .catch(() => !gone && setFailed(true))
    return () => {
      gone = true
      map.current?.remove()
      map.current = null
    }
  }, [cities, nodes, hoppyNode, next, nextIdx])

  function pick(s: Station) {
    setPicked(s)
    map.current?.flyTo({ center: LNGLAT[s.id], zoom: Math.max(map.current.getZoom(), 5.5), duration: 1400, essential: true })
  }
  function open(s: Station) {
    if (s.id !== state.here) {
      if (roadAmbush(state.beaten)) {
        go('encounter/' + s.id)
        return
      }
      saveKing({ ...loadKing(), here: s.id })
    }
    go('king/' + s.id)
  }
  const pickedOpen = picked ? isOpen(picked, state.beaten) : false
  return (
    <div className="rm">
      <div className="rm-map" ref={box} />
      {failed && <p className="rm-fail">The map needs internet. Try again when you are online.</p>}
      <div className="rm-top">
        <button type="button" onClick={() => go('journey')}>← Painted map</button>
        <span>Draft · real map</span>
      </div>
      {cities.map((s, i) => {
        const st = state.beaten.includes(s.id) ? 'done' : s === next ? 'next' : 'locked'
        return createPortal(
          <button type="button" className={`rm-coin rm-${st}`} onClick={() => pick(s)} aria-label={`${i + 1}. ${s.name}`}>
            <img src={IMG + 'stamp-' + s.id + '.jpg'} alt="" />
            {st === 'done' && <i className="rm-badge">✓</i>}
            {st === 'locked' && <i className="rm-badge">{i + 1}</i>}
            <span className="rm-name">{s.name}</span>
          </button>,
          nodes[s.id],
          s.id,
        )
      })}
      {next &&
        createPortal(
          <svg className="rm-hoppy king-bob" viewBox="0 0 120 120" width="54" height="54" aria-hidden="true">
            <MascotDrawing />
          </svg>,
          hoppyNode,
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
    </div>
  )
}
