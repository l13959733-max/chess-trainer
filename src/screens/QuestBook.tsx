import { go } from '../hooks/useHashRoute'
import { ROAD, STATIONS, isOpen, loadKing, opensAfter, stationById, type Station } from '../lib/king'
import { REAL_QUESTS } from '../lib/portal'
import '../king.css'

// The quest book: where you are on the journey, what comes next, and what is still open
export function QuestBook() {
  const k = loadKing()
  const order = [...ROAD, ...STATIONS.map((s) => s.id).filter((id) => !ROAD.includes(id))].map((id) => stationById(id)!)
  const next = order.find((s) => !k.beaten.includes(s.id) && isOpen(s, k.beaten))
  const done = order.filter((s) => k.beaten.includes(s.id))
  const later = order.filter((s) => !k.beaten.includes(s.id) && s !== next)

  return (
    <div className="screen king-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the world map">←</button>
        <div>
          <div className="eyebrow">Quest book</div>
          <h2>Your journey</h2>
        </div>
      </div>

      {next && (
        <section className="check-section">
          <h3>Next</h3>
          <StationRow s={next} state="next" />
          <button type="button" className="primary wide" onClick={() => go(`king/${next.id}/next`)}>Continue in {next.name}</button>
        </section>
      )}

      <section className="check-section">
        <h3>In the real world</h3>
        {REAL_QUESTS.map((q) => {
          const open = Boolean(k.quests?.[q.id])
          const done = k.got.includes(`real/${q.id}`)
          return (
            <button key={q.id} type="button" className={`quest-row ${done ? 'complete' : open ? '' : 'locked'}`} onClick={() => go('portal')} disabled={!open}>
              <span className="quest-mark" aria-hidden="true">{done ? '✓' : open ? '▶' : '🔒'}</span>
              <span>
                <b>{q.title}</b>
                <small>{done ? 'Done' : open ? 'Open – play on chess.com, then check in the portal' : `Opens after ${stationById(q.after)?.name}`}</small>
              </span>
            </button>
          )
        })}
      </section>

      {done.length > 0 && (
        <section className="check-section">
          <h3>Done · {done.length} of {STATIONS.length}</h3>
          {done.map((s) => <StationRow key={s.id} s={s} state="done" />)}
        </section>
      )}

      {later.length > 0 && (
        <section className="check-section">
          <h3>Still ahead</h3>
          {later.map((s) => <StationRow key={s.id} s={s} state={isOpen(s, k.beaten) ? 'open' : 'locked'} />)}
        </section>
      )}

      <section className="check-section">
        <h3>Your weak spots</h3>
        <p>Which mistakes cost you the most in your own games – with a rule for each.</p>
        <button type="button" className="wide" onClick={() => go('weaknesses')}>See my weak spots</button>
      </section>
    </div>
  )
}

function StationRow({ s, state }: { s: Station; state: 'next' | 'done' | 'open' | 'locked' }) {
  const got = loadKing().got
  const quests = s.games.filter((g) => !g.extra)
  const solved = quests.filter((g) => got.includes(`${s.id}/${g.id}`)).length
  const mark = { next: '▶', done: '✓', open: '•', locked: '🔒' }[state]
  return (
    <button type="button" className={`quest-row ${state === 'done' ? 'complete' : state === 'locked' ? 'locked' : ''}`} onClick={() => go(`king/${s.id}`)} disabled={state === 'locked'}>
      <span className="quest-mark" aria-hidden="true">{mark}</span>
      <span>
        <b>{s.name}</b>
        <small>
          {state === 'done'
            ? `${s.boss.name} beaten`
            : state === 'locked'
              ? `In the fog – opens after ${opensAfter(s, loadKing().beaten)?.name ?? 'the city before'}`
              : quests.length
                ? `${quests.map((g) => g.title).join(' · ')} · ${solved} of ${quests.length} done`
                : `Boss: ${s.boss.name}`}
        </small>
      </span>
    </button>
  )
}
