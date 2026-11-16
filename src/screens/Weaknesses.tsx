import { useMemo, useState } from 'react'
import { RING_COLORS, RingChart } from '../components/RingChart'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import { CATEGORY, phaseOf, type Category, type Phase } from '../lib/weakness'

const FAMILIES = [
  { key: 'opponent', title: "You didn't see what your opponent can do", short: "Opponent's chance not seen" },
  { key: 'chance', title: 'You missed your own chance', short: 'Own chance missed' },
  { key: 'other', title: 'Other mistakes', short: 'Other' },
] as const

const PHASES: { key: Phase; title: string }[] = [
  { key: 'opening', title: 'Opening (moves 1–12)' },
  { key: 'middlegame', title: 'Middlegame' },
  { key: 'endgame', title: 'Endgame' },
]

// "My weaknesses": every mistake from the analysed games, sorted by kind, each with its rule
// and a way to train exactly that.
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
  const sortedTotal = [...counts.values()].reduce((a, b) => a + b, 0)
  // The catch-all class is no habit you can fix with one rule, so it never counts as the biggest weakness
  const top = [...counts.entries()].filter(([c]) => c !== 'other').sort((a, b) => b[1] - a[1])[0]
  const threats = list.filter((p) => p.refutation && p.category && CATEGORY[p.category].family === 'opponent').length
  const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0)
  // the three kinds with their mistakes, biggest first inside each kind; colours as in the ring
  const famParts = FAMILIES.map((f, i) => {
    const cats = (Object.keys(CATEGORY) as Category[]).filter((c) => CATEGORY[c].family === f.key && counts.get(c)).sort((a, b) => counts.get(b)! - counts.get(a)!)
    return { ...f, cats, sum: cats.reduce((s, c) => s + counts.get(c)!, 0), color: RING_COLORS[i] }
  })
  const [open, setOpen] = useState<Category | null>(null)

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
              {/* Lu, 16.11.: from the top straight into the exercises of this weakness, one after another */}
              <button type="button" className="primary wide weak-go" onClick={() => go('puzzles/' + top[0])}>Train it now ›</button>
            </span>
          </div>
        )
      )}

      {threats > 0 && (
        <section className="play-card threat-card">
          <div className="label">Training for your #1 habit</div>
          <p><b>What's the threat?</b> You get the position right after one of your mistakes and play your opponent's side: find the move that punishes it. This trains the look at your opponent's chances before every move.</p>
          <button type="button" className="primary wide" onClick={() => go('threats')}>Start ({threats} positions)</button>
        </section>
      )}

      {/* Lu, 16.11.: "das ist too much, die ganzen Felder optisch zusammenfassen" – one card: a ring of the three
          kinds, then every kind of mistake as one slim row; its rule and training open only when you tap it */}
      {sortedTotal > 0 && (
        <section className="play-card weak-sum">
          <div className="label">Your mistakes by kind</div>
          <RingChart parts={famParts.map((f) => [f.short, f.sum] as [string, number])} center={sortedTotal} sub="mistakes" label={`Your mistakes: ${famParts.map((f) => `${f.short} ${pct(f.sum, sortedTotal)}%`).join(', ')}`} />
          <div className="weak-list">
            {famParts.flatMap((f) =>
              f.cats.map((c) => {
                const on = open === c
                return (
                  <div key={c} className={`weak-item${on ? ' on' : ''}`}>
                    <button type="button" className="weak-line" aria-expanded={on} onClick={() => setOpen(on ? null : c)}>
                      <i style={{ background: f.color }} aria-hidden="true" />
                      <b>{CATEGORY[c].title}</b>
                      <span className="count">{counts.get(c)}</span>
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                    {on && (
                      <div className="weak-more">
                        <p className="note">{CATEGORY[c].rule}</p>
                        <div className="row">
                          <button type="button" onClick={() => go('puzzles/' + c)}>Find the better move</button>
                          {f.key === 'opponent' && <button type="button" onClick={() => go('threats/' + c)}>What's the threat?</button>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }),
            )}
          </div>
        </section>
      )}

      {list.length > 0 && (
        <section className="play-card">
          <div className="label">Where your mistakes happen</div>
          {/* Lu, 15.11.: as a ring chart like in Training instead of bars */}
          <RingChart parts={PHASES.map((ph) => [ph.title, phases.get(ph.key) ?? 0] as [string, number])} center={list.length} sub="mistakes" label={`Where your mistakes happen: ${PHASES.map((ph) => `${ph.title} ${pct(phases.get(ph.key) ?? 0, list.length)}%`).join(', ')}`} />
          <p className="note small">Few endgame mistakes usually means few endgames: most of your games are decided earlier. Converting a won position is trained under “Win it”.</p>
        </section>
      )}
    </div>
  )
}
