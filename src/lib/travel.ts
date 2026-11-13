import { go } from '../hooks/useHashRoute'
import { roadAmbush } from './ambush'
import { isOpen, loadKing, route, saveKing, stationById, type Station } from './king'

// Travelling to a city, the same from every screen: a road ambush may stop you on the way.
export function travelTo(s: Station) {
  const king = loadKing()
  if (s.id !== king.here) {
    if (roadAmbush(king.beaten)) return go('encounter/' + s.id)
    saveKing({ ...king, here: s.id })
  }
  openCity(s.id)
}

// Lu, 13.11.: opening a city always starts at the cover of its book chapter. Coming back from a game or a line
// (go('king/<id>') directly) keeps the page you were on.
export function openCity(id: string, sub = '') {
  try {
    sessionStorage.removeItem('hoppy-book-page-' + id)
  } catch {
    // nothing remembered
  }
  go('king/' + id + sub)
}

// the next city on the journey (open, boss not yet beaten)
export function nextCity(beaten: string[]): Station | undefined {
  return route()
    .map((id) => stationById(id))
    .find((s): s is Station => !!s && isOpen(s, beaten) && !beaten.includes(s.id))
}
