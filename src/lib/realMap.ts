// The real world map (Journey) as one lasting map, see prewarm() below. Used by screens/RealMap.tsx.
import maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import { isOpen, loadKing, route, stationById, type Station } from './king'

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
export const LNGLAT: Record<string, [number, number]> = {
  kannauj: [79.92, 27.05], persia: [51.67, 32.65], samarkand: [66.96, 39.65], baghdad: [44.36, 33.31],
  north: [10.39, 63.43], valencia: [-0.38, 39.47], barcelona: [2.17, 41.39], rome: [12.5, 41.9],
  palace: [9.93, 51.54], vienna: [16.37, 48.21], paris: [2.35, 48.86], edinburgh: [-3.19, 55.95],
  london: [-0.13, 51.51], forest: [33.3, 59.2], reykjavik: [-21.94, 64.15], newyork: [-74.01, 40.71],
  rio: [-43.17, -22.91], moscow: [37.62, 55.76], orbit: [63.31, 45.96], chennai: [80.27, 13.08],
}
// planned cities, shown on the map but not playable yet (Lu, 12.11.: "Russland dazunehmen")
export const SOON: { id: string; name: string; at: [number, number]; note: string }[] = [
]

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

// ---------- one map for the whole visit (Lu, 14.11.: "wenn ich oben aufs Abenteuer klicke, die Map sofort da") ----------
// The map is built once, hidden, a moment after the app starts (style, tiles, coins). Opening the page only moves the
// finished map into view; leaving parks it again instead of throwing it away. So it is there at once, also the 2nd time.

export const CITIES = route().map((id) => stationById(id)!).filter((s) => s && LNGLAT[s.id])
export interface Persistent {
  holder: HTMLDivElement // MapLibre's container: moves between the page and the parking spot
  map: maplibregl.Map | null
  failed: boolean
  nodes: Record<string, HTMLDivElement> // one DOM node per coin; React draws into them, MapLibre moves them
  hoppyNode: HTMLDivElement
  soonNodes: Record<string, HTMLDivElement>
  hoppy: maplibregl.Marker | null
  nextIdx: number // how far the road is drawn
  onZoom: ((far: boolean) => void) | null // the open page listens; nobody while parked
  onFail: (() => void) | null
  starting: boolean
}
let P: Persistent | null = null

function parking(): HTMLDivElement {
  let el = document.getElementById('rm-parking') as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = 'rm-parking'
    el.setAttribute('aria-hidden', 'true')
    // full size so MapLibre draws and loads the tiles, but invisible and untouchable
    el.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;z-index:-1;overflow:hidden'
    document.body.appendChild(el)
  }
  return el
}

function roadState() {
  const king = loadKing()
  const next = CITIES.find((s) => isOpen(s, king.beaten) && !king.beaten.includes(s.id))
  return { next, nextIdx: next ? CITIES.indexOf(next) : CITIES.length - 1 }
}

function drawRoad(p: Persistent) {
  const m = p.map
  if (!m || !m.isStyleLoaded()) return
  const all = line(CITIES.slice(0, p.nextIdx + 1 + AHEAD))
  const done = line(CITIES.slice(0, p.nextIdx + 1))
  const a = m.getSource('road-all') as maplibregl.GeoJSONSource | undefined
  if (a) {
    a.setData(all)
    ;(m.getSource('road-done') as maplibregl.GeoJSONSource).setData(done)
    return
  }
  m.addSource('road-all', { type: 'geojson', data: all })
  m.addSource('road-done', { type: 'geojson', data: done })
  m.addLayer({ id: 'road-all', type: 'line', source: 'road-all', paint: { 'line-color': TERRA, 'line-width': 2.5, 'line-opacity': 0.55, 'line-dasharray': [1.5, 2] }, layout: { 'line-cap': 'round' } })
  m.addLayer({ id: 'road-done', type: 'line', source: 'road-done', paint: { 'line-color': TERRA, 'line-width': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
}

// Hoppy and the road follow the journey (a boss beaten since the map was built)
function refresh(p: Persistent) {
  const { next, nextIdx } = roadState()
  // only redraw the road when the journey moved on (redrawing makes the map busy for a moment)
  const moved = nextIdx !== p.nextIdx || !p.map?.getSource('road-all')
  p.nextIdx = nextIdx
  if (moved) drawRoad(p)
  if (!p.map) return
  if (next) {
    if (!p.hoppy) p.hoppy = new maplibregl.Marker({ element: p.hoppyNode, anchor: 'bottom-left', offset: [22, -6] }).setLngLat(LNGLAT[next.id]).addTo(p.map)
    else p.hoppy.setLngLat(LNGLAT[next.id])
  } else if (p.hoppy) {
    p.hoppy.remove()
    p.hoppy = null
  }
}

export function persistent(): Persistent {
  if (P) return P
  const holder = document.createElement('div')
  holder.style.cssText = 'position:absolute;inset:0'
  parking().appendChild(holder)
  P = {
    holder,
    map: null,
    failed: false,
    nodes: Object.fromEntries(CITIES.map((s) => [s.id, document.createElement('div')])),
    hoppyNode: document.createElement('div'),
    soonNodes: Object.fromEntries(SOON.map((c) => [c.id, document.createElement('div')])),
    hoppy: null,
    nextIdx: roadState().nextIdx,
    onZoom: null,
    onFail: null,
    starting: false,
  }
  return P
}

// Build the map (once). Called a moment after the app starts, and by the page itself if you are quicker.
export function prewarm() {
  const p = persistent()
  if (p.map || p.starting) return
  p.starting = true
  p.failed = false
  const saved = readView()
  const { next } = roadState()
  fetch(STYLE_URL)
    .then((r) => r.json())
    .then((style: StyleSpecification) => {
      const m = new maplibregl.Map({
        container: p.holder,
        style: bookStyle(style),
        center: saved?.center ?? (next ? LNGLAT[next.id] : LNGLAT.kannauj),
        zoom: saved?.zoom ?? 3.2,
        minZoom: 1.2,
        maxZoom: 16,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      })
      m.touchZoomRotate.disableRotation()
      m.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right')
      p.map = m
      m.on('moveend', () => writeView(m))
      const zoomed = () => p.onZoom?.(m.getZoom() < 4.6)
      m.on('zoomend', zoomed)
      m.on('load', () => {
        zoomed()
        refresh(p)
      })
      CITIES.forEach((s) => new maplibregl.Marker({ element: p.nodes[s.id], anchor: 'center' }).setLngLat(LNGLAT[s.id]).addTo(m))
      SOON.forEach((c) => new maplibregl.Marker({ element: p.soonNodes[c.id], anchor: 'center' }).setLngLat(c.at).addTo(m))
      refresh(p)
    })
    .catch(() => {
      p.failed = true
      p.onFail?.()
    })
    .finally(() => {
      p.starting = false
    })
}


// The page shows the map: move it in, listen to zoom and errors; the returned function parks it again
export function attach(el: HTMLElement, on: { zoom: (far: boolean) => void; fail: () => void }): () => void {
  const p = persistent()
  el.appendChild(p.holder)
  p.onZoom = on.zoom
  p.onFail = on.fail
  if (!p.map) prewarm()
  else {
    p.map.resize()
    refresh(p)
    on.zoom(p.map.getZoom() < 4.6)
  }
  return () => {
    p.onZoom = null
    p.onFail = null
    parking().appendChild(p.holder)
  }
}
export const currentMap = () => P?.map ?? null

// for the click test (scripts/e2e): is the map open with every tile drawn?
;(window as unknown as { __mapIdle?: () => boolean }).__mapIdle = () => !!P?.map && P.map.loaded() && P.map.areTilesLoaded() && !!P.holder.closest('.rm')
