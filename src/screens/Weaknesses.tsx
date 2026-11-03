import { useMemo } from 'react'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import type { Puzzles } from '../hooks/usePuzzles'
import { CATEGORY, phaseOf, type Category, type Phase } from '../lib/weakness'

const FAMILIES = [
  { key: 'opponent', title: "You didn't see what your opponent can do" },
  { key: 'chance', title: 'You missed your own chance' },
  { key: 'other', title: 'Other mistakes' },
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

      {FAMILIES.map((f) => {
        const cats = (Object.keys(CATEGORY) as Category[]).filter((c) => CATEGORY[c].family === f.key && counts.get(c))
        if (!cats.length) return null
        const sum = cats.reduce((s, c) => s + counts.get(c)!, 0)
        return (
          <section key={f.key} className="play-card">
            <div className="label">{f.title} · {pct(sum, sortedTotal)}%</div>
            {cats
              .sort((a, b) => counts.get(b)! - counts.get(a)!)
              .map((c) => (
                <div key={c} className="weak-row">
                  <div className="weak-head">
                    <b>{CATEGORY[c].title}</b>
                    <span className="count">{counts.get(c)}</span>
                  </div>
                  <div className="bar"><span style={{ width: `${pct(counts.get(c)!, sortedTotal)}%` }} /></div>
                  <p className="note">{CATEGORY[c].rule}</p>
                  <div className="row">
                    <button type="button" onClick={() => go('puzzles/' + c)}>Find the better move</button>
                    {f.key === 'opponent' && (
                      <button type="button" onClick={() => go('threats/' + c)}>What's the threat?</button>
                    )}
                  </div>
                </div>
              ))}
          </section>
        )
      })}

      {list.length > 0 && (
        <section className="play-card">
          <div className="label">Where your mistakes happen</div>
          {PHASES.map((ph) => (
            <div key={ph.key} className="weak-row">
              <div className="weak-head">
                <b>{ph.title}</b>
                <span className="count">{phases.get(ph.key) ?? 0} · {pct(phases.get(ph.key) ?? 0, list.length)}%</span>
              </div>
              <div className="bar"><span style={{ width: `${pct(phases.get(ph.key) ?? 0, list.length)}%` }} /></div>
            </div>
          ))}
          <p className="note small">Few endgame mistakes usually means few endgames: most of your games are decided earlier. Converting a won position is trained under “Win it”.</p>
        </section>
      )}
    </div>
  )
}
