import { useState } from 'react'
import { go } from '../hooks/useHashRoute'
import { openCity } from '../lib/travel'
import type { Repertoire } from '../hooks/useRepertoire'
import { ATLAS, type AtlasEntry } from '../lib/atlas'
import { MIRROR, STATIONS, isOpen, loadKing } from '../lib/king'
import '../king.css'

// The opening atlas: every big opening family, what you already play, and new weapons to learn
export function Atlas({ rep }: { rep: Repertoire }) {
  const [open, setOpen] = useState<string | null>(null)
  const lines = (e: AtlasEntry) => (e.opening ? rep.lines.filter((l) => l.source !== 'import' && l.side === e.side && l.opening === e.opening) : [])
  const groups: { title: string; entries: AtlasEntry[] }[] = [
    { title: 'With White', entries: ATLAS.filter((e) => e.side === 'w') },
    { title: 'With Black against 1.e4', entries: ATLAS.filter((e) => e.side === 'b' && e.against === 'vs 1.e4') },
    { title: 'With Black against 1.d4', entries: ATLAS.filter((e) => e.side === 'b' && e.against === 'vs 1.d4') },
  ]
  // where on the journey you learn it: the station whose lines are this opening
  const beaten = loadKing().beaten
  const place = (e: AtlasEntry) =>
    e.opening ? [...STATIONS, ...MIRROR].find((s) => s.lines && s.lines.side === e.side && [s.lines.opening].flat().includes(e.opening!)) : undefined
  const known = ATLAS.filter((e) => {
    const ls = lines(e)
    return ls.length && ls.every((l) => rep.srs.has(l.id))
  }).length
  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('tent')} aria-label="Back to the Training Camp">←</button>
        <div>
          <div className="eyebrow">Opening atlas · {known} of {ATLAS.length} learned</div>
          <h2>Widen your horizon</h2>
        </div>
      </div>
      <p className="king-lesson">Every big opening family in chess. Learn a new weapon – or understand what your opponents play against you.</p>
      {groups.map((g) => (
        <section key={g.title} className="check-section">
          <h3>{g.title}</h3>
          {g.entries.map((e) => {
            const ls = lines(e)
            const learned = ls.filter((l) => rep.srs.has(l.id)).length
            const state = !ls.length ? 'soon' : learned === ls.length ? 'learned' : learned ? 'learning' : 'new'
            const label = { soon: 'coming soon', learned: '✓ learned', learning: `${learned} of ${ls.length} lines`, new: `${ls.length} lines to learn` }[state]
            return (
              <div key={e.id} className={`atlas-entry ${state}`}>
                <button type="button" className="quest-row" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                  <span className="quest-mark" aria-hidden="true">{state === 'learned' ? '✓' : state === 'soon' ? '·' : '♞'}</span>
                  <span>
                    <b>{e.name}</b>
                    <small>{e.moves} · {label}</small>
                  </span>
                </button>
                {open === e.id && (
                  <div className="atlas-more">
                    <p>{e.fits}</p>
                    {(() => {
                      const at = place(e)
                      if (!at) return null
                      return isOpen(at, beaten) ? (
                        <button type="button" className="primary wide" onClick={() => openCity(at.id)}>Learn it on your journey: {at.name}</button>
                      ) : (
                        <p className="note">On your journey: {at.name} – it opens later. You can learn the lines here already.</p>
                      )
                    })()}
                    {ls.length ? (
                      ls.map((l) => (
                        <button key={l.id} type="button" className="wide" onClick={() => go((rep.srs.has(l.id) ? 'drill/' : 'learn/') + l.id)}>
                          {rep.srs.has(l.id) ? '✓ Practice: ' : 'Learn: '}
                          {l.title}
                        </button>
                      ))
                    ) : (
                      <p className="note">The lines for this opening come later.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
