import { useMemo, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import type { useRepertoire } from '../hooks/useRepertoire'
import { MIRROR, STATIONS } from '../lib/king'
import { keyOf, loadBlack, saveBlack, type BlackChoice } from '../lib/openingRush'
import { openCity } from '../lib/travel'
import { BLACK_D4, BLACK_E4, type BlackSystem } from '../lib/blackSystems'

// Your Black system #/black (Lu, 22.11.2026: "ich kann noch gar nicht mit Schwarz spielen … mir jetzt ein
// schwarzes System raussuchen können, um bei chess.com spielen zu können"). One answer to 1.e4, one to 1.d4,
// chosen freely – no story first. Each choice leads to its lines (the city in the Mirror World) and its Rush.

type Rep = ReturnType<typeof useRepertoire>

// the city that teaches this opening as Black
function cityOf(opening: string) {
  return [...MIRROR, ...STATIONS].find((s) => s.lines?.side === 'b' && (Array.isArray(s.lines.opening) ? s.lines.opening : [s.lines.opening]).includes(opening))
}

export function BlackSystemScreen({ rep }: { rep: Rep }) {
  const [choice, setChoice] = useState<BlackChoice>(loadBlack)
  const count = useMemo(() => {
    const n = new Map<string, number>()
    for (const l of rep.lines) if (l.side === 'b' && l.opening && l.source !== 'import') n.set(l.opening, (n.get(l.opening) ?? 0) + 1)
    return n
  }, [rep.lines])
  const pick = (vs: 'e4' | 'd4', id: string) => {
    const c = { ...choice, [vs]: id }
    setChoice(c)
    saveBlack(c)
  }
  const group = (vs: 'e4' | 'd4', list: BlackSystem[]) => (
    <section className="bs-group" aria-label={`Against 1.${vs}`}>
      <h2>Against 1.{vs}</h2>
      {list.map((s) => {
        const on = choice[vs] === s.id
        const lines = s.openings.reduce((t, o) => t + (count.get(o) ?? 0), 0)
        const keys = s.openings.filter((o) => count.has(o)).map((o) => keyOf(o, 'b'))
        return (
          <div key={s.id} className={`bs-card${on ? ' on' : ''}`}>
            <button type="button" className="bs-main" aria-pressed={on} onClick={() => pick(vs, s.id)}>
              <span className="bs-radio" aria-hidden="true">{on ? '●' : ''}</span>
              <span className="bs-tx">
                <b>{s.name}</b>
                <small className="bs-moves">{s.moves} · {lines} lines</small>
                <span className="bs-style">{s.style}</span>
                {s.tip && <span className="bs-tip">Hoppy’s tip: {s.tip}</span>}
              </span>
            </button>
            {on && (
              <div className="bs-go">
                {s.openings
                  .filter((o) => count.has(o))
                  .map((o) => {
                    const city = cityOf(o)
                    return city ? (
                      <button type="button" key={o} onClick={() => openCity(city.id)}>📖 Learn: {o}</button>
                    ) : null
                  })}
                {keys.length > 0 && (
                  <button type="button" className="primary" onClick={() => go('opening-rush/' + keys.join('~'))}>⚡ Rush: all of it</button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
  return (
    <div className="screen bs">
      <div className="rush-head">
        <button type="button" className="back" onClick={() => go('opening-rush')} aria-label="Back">←</button>
        <h1>Your Black system</h1>
      </div>
      <p className="note">Pick one answer to 1.e4 and one to 1.d4. Every city is open – learn the lines there, then train them in the Rush. You can change it any time.</p>
      {group('e4', BLACK_E4)}
      {group('d4', BLACK_D4)}
      <button type="button" className="or-pick" onClick={() => go('opening-rush/' + keyOf('Other first moves', 'b'))}>
        White plays something else (1.c4, 1.Nf3 …)? ⚡ Rush: Other first moves
      </button>
    </div>
  )
}
