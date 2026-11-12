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
  go('king/' + s.id)
}

// the next city on the journey (open, boss not yet beaten)
export function nextCity(beaten: string[]): Station | undefined {
  return route()
    .map((id) => stationById(id))
    .find((s): s is Station => !!s && isOpen(s, beaten) && !beaten.includes(s.id))
}
