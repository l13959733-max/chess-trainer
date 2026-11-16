import { useMemo, useState } from 'react'
import { DoubleRing, type RingPart } from '../components/RingChart'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import { CATEGORY, OTHER_KIND, otherKindOf, phaseOf, type Category, type OtherKind, type Phase } from '../lib/weakness'

// "My weaknesses" (Lu, 16.11.): everything in ONE card – a double ring (outside: what went wrong, inside: when in
// the game), the three phases to train, then every kind of mistake as a slim row that opens its rule and training.
// "Other" is split into what the engine lines show (lib/weakness.ts otherKindOf). The button on top leads to today's
// training, which picks your weakness by itself (trainingToday.redCandidates).

const FAMILIES = [
  { key: 'opponent', short: "Opponent's chance not seen", color: '#ef4a5a' },
  { key: 'chance', short: 'Own chance missed', color: '#8a5cf6' },
  { key: 'other', short: 'No material lost – slower mistakes', color: '#b9b3c9' },
] as const

const PHASES: { key: Phase; title: string; sub: string; color: string }[] = [
  { key: 'opening', title: 'Opening', sub: 'moves 1–12', color: '#ffc531' },
  { key: 'middlegame', title: 'Middlegame', sub: '', color: '#4fc414' },
  { key: 'endgame', title: 'Endgame', sub: 'few pieces left', color: '#2ea7f0' },
]

type Row = { key: string; title: string; rule: string; n: number; color: string; train: string; threat?: string }

export function Weaknesses({ puzzles, player }: { puzzles: Puzzles; player: string }) {
  const list = puzzles.puzzles
  const counts = useMemo(() => {
    const c = new Map<Category, number>()
    for (const p of list) if (p.category) c.set(p.category, (c.get(p.category) ?? 0) + 1)
    return c
  }, [list])
  const phases = useMemo(() => {
    const c = new Map<Phase, number>()
    for (const p of list) c.set(phaseOf(p.fen), (c.get(phaseOf(p.fen)) ?? 0) + 1)
    return c
  }, [list])
  const others = useMemo(() => {
    const c = new Map<OtherKind, number>()
    for (const p of list) if (p.category === 'other') c.set(otherKindOf(p), (c.get(otherKindOf(p)) ?? 0) + 1)
    return c
  }, [list])
  const sortedTotal = [...counts.values()].reduce((a, b) => a + b, 0)
  // The catch-all class is no habit you can fix with one rule, so it never counts as the biggest weakness
  const top = [...counts.entries()].filter(([c]) => c !== 'other').sort((a, b) => b[1] - a[1])[0]
  const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0)
  const [open, setOpen] = useState<string | null>(null)

  const fam = FAMILIES.map((f) => {
    const cats = (Object.keys(CATEGORY) as Category[]).filter((c) => CATEGORY[c].family === f.key && counts.get(c))
    return { ...f, cats, n: cats.reduce((s, c) => s + counts.get(c)!, 0) }
  })
  // every row: the kinds, and "Other" split into its parts – biggest first inside each colour
  const rows: Row[] = fam.flatMap<Row>((f) =>
    f.key === 'other'
      ? (Object.keys(OTHER_KIND) as OtherKind[])
          .filter((k) => others.get(k))
          .sort((a, b) => others.get(b)! - others.get(a)!)
          .map((k) => ({ key: 'other:' + k, title: OTHER_KIND[k].title, rule: OTHER_KIND[k].rule, n: others.get(k)!, color: f.color, train: 'puzzles/other/' + k }))
      : f.cats
          .filter((c) => c !== 'other')
          .sort((a, b) => counts.get(b)! - counts.get(a)!)
          .map((c) => ({ key: c, title: CATEGORY[c].title, rule: CATEGORY[c].rule, n: counts.get(c)!, color: f.color, train: 'puzzles/' + c, threat: f.key === 'opponent' ? 'threats/' + c : undefined })),
  )
  const outer: RingPart[] = fam.map((f) => ({ label: f.short, n: f.n, color: f.color }))
  const inner: RingPart[] = PHASES.map((ph) => ({ label: ph.title, n: phases.get(ph.key) ?? 0, color: ph.color }))

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">{player} · {list.length} mistakes from your games</div>
          <h2>My weaknesses</h2>
        </div>
      </div>

      {puzzles.sorting && (
        <section className="play-card">
          <div className="label">Sorting your older mistakes</div>
          <div className="bar"><span style={{ width: `${(puzzles.sorting.done / puzzles.sorting.total) * 100}%` }} /></div>
          <p className="note small">{puzzles.sorting.done} of {puzzles.sorting.total}. Stockfish looks at each one once. Keep the app open.</p>
        </section>
      )}

      {!list.length ? (
        <div className="greet">
          <Mascot mood="happy" />
          No mistakes yet. Analyse your chess.com games on the overview, or play a game against Hoppy-Bot.
        </div>
      ) : (
        top && (
          <div className="greet">
            <Mascot mood="happy" />
            <span>
              Your biggest weakness: <b>{CATEGORY[top[0]].title}</b> ({pct(top[1], sortedTotal)}% of your mistakes). The rule: <b>{CATEGORY[top[0]].rule}</b>
              {/* Lu, 16.11.: the button leads to Training – today's path brings your weakness by itself */}
              <button type="button" className="primary wide weak-go" onClick={() => {
                  try {
                    sessionStorage.setItem('hoppy-train-weakness', '1') // Training jumps to the weakness block
                  } catch {
                    // Training opens at the top
                  }
                  go('tent')
                }}>Train in today’s path ›</button>
            </span>
          </div>
        )
      )}

      {sortedTotal > 0 && (
        <section className="play-card weak-sum">
          <div className="weak-top">
            <DoubleRing outer={outer} inner={inner} center={sortedTotal} sub="mistakes" label={`Outside: ${outer.map((o) => `${o.label} ${pct(o.n, sortedTotal)}%`).join(', ')}. Inside: ${inner.map((o) => `${o.label} ${pct(o.n, list.length)}%`).join(', ')}`} />
            <div className="weak-legend">
              <small>Outside · what went wrong</small>
              {fam.map((f) => (
                <div key={f.key}><i style={{ background: f.color }} /><em>{f.short}</em><span>{pct(f.n, sortedTotal)}%</span></div>
              ))}
            </div>
          </div>

          <div className="weak-phases">
            <small>Inside · when in the game – tap to train</small>
            <div className="weak-phase-row">
              {PHASES.map((ph) => {
                const n = phases.get(ph.key) ?? 0
                return (
                  <button key={ph.key} type="button" className="weak-phase" disabled={!n} onClick={() => go('puzzles/phase/' + ph.key)} aria-label={`Train your ${ph.title.toLowerCase()} mistakes (${n})`}>
                    <i style={{ background: ph.color }} />
                    <b>{pct(n, list.length)}%</b>
                    <span>{ph.title}</span>
                    {ph.sub && <em>{ph.sub}</em>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lu, 16.11.: "der Überblick soll kleiner sein" – the kinds as small tiles in two columns; tap one for its
              rule and its own training. Everything together is the weakness workout in Training. */}
          <div className="weak-grid">
            {rows.map((r) => (
              <button key={r.key} type="button" className={`weak-tile${open === r.key ? ' on' : ''}`} aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>
                <i style={{ background: r.color }} aria-hidden="true" />
                <span>{r.title}</span>
                <b>{r.n}</b>
              </button>
            ))}
          </div>
          {(() => {
            const r = rows.find((x) => x.key === open)
            return r ? (
              <div className="weak-more">
                <p className="note"><b>{r.title}:</b> {r.rule}</p>
                <div className="row">
                  <button type="button" onClick={() => go(r.train)}>Find the better move</button>
                  {r.threat && <button type="button" onClick={() => go(r.threat!)}>What's the threat?</button>}
                </div>
              </div>
            ) : null
          })()}
          <p className="note small">Grey = the position got 2+ pawns worse, but no material went in the next 4 moves. Hoppy sorts these by what the engine’s lines show.</p>
        </section>
      )}
    </div>
  )
}
