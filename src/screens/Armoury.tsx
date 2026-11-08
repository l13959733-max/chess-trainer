import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { LAST_MOVE } from '../components/Board'
import { ChestnutReward } from '../components/Chestnut'
import { go } from '../hooks/useHashRoute'
import PUZZLES from '../data/lichess-puzzles.json'
import {
  KINDS, REAL_GAMES, SLICES, STAGES, TECHNIQUES, finishStage, isOpen, loadArmoury, medal, passed, realCheck, saveArmoury,
  type Medal, type Stage, type Technique,
} from '../lib/armoury'
import { getPlayer } from '../lib/chesscom'
import { getGameRecords, getPuzzles, type GameRecord, type Puzzle } from '../lib/db'
import { feedback as fx } from '../lib/feedback'
import { earn } from '../lib/king'
import { KBoard, OnePuzzle, type LPuzzle } from './King'
import '../king.css'

const ALL = PUZZLES as Record<string, LPuzzle[]>
const MEDAL: Record<Medal, string> = { none: '', bronze: '🥉', silver: '🥈', gold: '🥇' }
const MEDAL_NAME: Record<Medal, string> = { none: 'no medal yet', bronze: 'bronze', silver: 'silver', gold: 'gold' }
const NUTS: Record<Medal, number> = { none: 0, bronze: 10, silver: 20, gold: 40 }

function Head({ title, eyebrow, back }: { title: string; eyebrow: string; back: string }) {
  return (
    <div className="screen-head">
      <button type="button" className="back" onClick={() => go(back)} aria-label="Back">←</button>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

export function ArmouryScreen({ id, stage }: { id?: string; stage?: string }) {
  const t = TECHNIQUES.find((x) => x.id === id)
  if (!t) return <Overview />
  if (!isOpen(t, loadArmoury())) return <Overview />
  const s = STAGES.find((x) => x.stage === stage)?.stage
  if (!s) return <TechniquePage t={t} />
  if (s === 'show') return <ShowMe key={t.id} t={t} />
  if (s === 'real') return <RealWorld t={t} />
  return <Round key={t.id + s} t={t} stage={s} />
}

function Overview() {
  const a = loadArmoury()
  return (
    <div className="screen king-screen">
      <Head title="Armoury & Shields" eyebrow="Training Camp · techniques" back="tent" />
      <p className="king-lesson">Every technique is a weapon and a shield. Bronze, silver – and gold only when it works without help and in your real games.</p>
      {KINDS.map((k) => (
        <section key={k.kind} className="check-section">
          <h3>{k.title}</h3>
          <p className="note">{k.about}</p>
          <div className="arm-list">
            {TECHNIQUES.filter((t) => t.kind === k.kind).map((t) => {
              const open = isOpen(t, a)
              const m = medal(a[t.id])
              const next = STAGES[a[t.id]?.done ?? 0]
              return (
                <button key={t.id} type="button" className={`arm-card ${open ? '' : 'locked'} m-${m}`} disabled={!open} onClick={() => go('armoury/' + t.id)}>
                  <span className="arm-icon" aria-hidden="true">{open ? t.icon : '🔒'}</span>
                  <b>{t.name}</b>
                  <small>{!open ? 'opens with the bronze before it' : next ? `next: ${next.name}` : 'all done'}</small>
                  <span className="arm-medal" aria-label={MEDAL_NAME[m]}>{MEDAL[m]}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <p className="note small">Puzzles from the Lichess database (CC0).</p>
    </div>
  )
}

function TechniquePage({ t }: { t: Technique }) {
  const p = loadArmoury()[t.id]
  const done = p?.done ?? 0
  const m = medal(p)
  return (
    <div className="screen king-screen">
      <Head title={t.name} eyebrow={`Armoury · ${MEDAL_NAME[m]}`} back="armoury" />
      <div className="arm-two">
        <div><b>⚔ Weapon</b><p>{t.weapon}</p></div>
        <div><b>🛡 Shield</b><p>{t.shield}</p></div>
      </div>
      <ol className="arm-steps">
        {STAGES.map((s, i) => (
          <li key={s.stage} className={i < done ? 'done' : i === done ? 'now' : ''}>
            <b>{i < done ? '✓ ' : ''}{s.name}</b>
            <span>{s.stage === 'real' && !t.real ? `${REAL_GAMES} finished chess.com games without a big mistake.` : s.about}</span>
            {i === 1 && <em>🥉</em>}
            {i === 3 && <em>🥈</em>}
            {i === 5 && <em>🥇</em>}
          </li>
        ))}
      </ol>
      {done < STAGES.length ? (
        <button type="button" className="primary wide king-continue" onClick={() => go(`armoury/${t.id}/${STAGES[done].stage}`)}>
          <small>step {done + 1} of {STAGES.length}</small>
          {STAGES[done].name}
        </button>
      ) : (
        <div className="king-fb ok knack"><b>Gold!</b><p>{t.name} works for you – also in your real games.</p></div>
      )}
      {done > 1 && done < STAGES.length && (
        <button type="button" className="wide" onClick={() => go(`armoury/${t.id}/help`)}>Practise again with help</button>
      )}
    </div>
  )
}

// The worked example: the first puzzle played out move by move, with what to look for
function ShowMe({ t }: { t: Technique }) {
  const p = ALL[t.theme][0]
  const [ply, setPly] = useState(0)
  const positions = useMemo(() => {
    const c = new Chess(p.fen)
    const out = [{ fen: c.fen(), last: null as null | { from: string; to: string }, san: '' }]
    for (const u of p.moves) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
      out.push({ fen: c.fen(), last: { from: m.from, to: m.to }, san: m.san })
    }
    return out
  }, [p])
  const solver = new Chess(p.fen).turn() === 'w' ? 'black' : 'white'
  const end = ply >= positions.length - 1
  const at = positions[ply]
  const text =
    ply === 0
      ? 'Your opponent is about to make a mistake. Watch.'
      : ply === 1
        ? `${at.san} – a mistake. Now look: what can ${solver} do?`
        : ply % 2 === 0
          ? `${at.san}! ${ply === 2 ? t.weapon : ''}`
          : `${at.san} – the answer.`
  return (
    <div className="screen king-screen">
      <Head title={t.name} eyebrow="Armoury · see it" back={'armoury/' + t.id} />
      <KBoard fen={at.fen} orientation={solver} squareStyles={at.last ? { [at.last.from]: LAST_MOVE, [at.last.to]: LAST_MOVE } : {}} />
      <p className="king-lesson">{end ? `That was a ${t.name.toLowerCase()}. ${t.weapon} And the shield: ${t.shield}` : text}</p>
      <div className="done-actions">
        <button type="button" disabled={ply === 0} onClick={() => setPly(ply - 1)}>Back</button>
        {end ? (
          <button type="button" className="primary" onClick={() => { saveArmoury(finishStage(loadArmoury(), t.id, 'show')); go('armoury/' + t.id) }}>Got it</button>
        ) : (
          <button type="button" className="primary" onClick={() => { const n = positions[ply + 1]; fx.move(n.san, ply % 2 === 1); setPly(ply + 1) }}>Next move</button>
        )}
      </div>
    </div>
  )
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let k = b.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    ;[b[k], b[j]] = [b[j], b[k]]
  }
  return b
}

// Mixed: this technique and two from earlier ones, without telling which is which
function puzzlesFor(t: Technique, stage: Exclude<Stage, 'show' | 'real'>): LPuzzle[] {
  const [from, to] = SLICES[stage]
  const own = ALL[t.theme].slice(from, to)
  if (stage !== 'mixed') return own
  const before = TECHNIQUES.slice(0, TECHNIQUES.indexOf(t)).filter((x) => x.kind === t.kind || x.kind === 'tactic')
  const extra = before.length ? shuffle(before).slice(0, 2).map((x) => ALL[x.theme][SLICES.mixed[0] + Math.floor(Math.random() * 4)]) : ALL[t.theme].slice(18, 20)
  return shuffle([...own, ...extra])
}

function Round({ t, stage }: { t: Technique; stage: Exclude<Stage, 'show' | 'real'> }) {
  const [puzzles] = useState(() => puzzlesFor(t, stage))
  const [i, setI] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hints, setHints] = useState(0)
  const [solved, setSolved] = useState(false)
  const [slipped, setSlipped] = useState(false) // a mistake in this puzzle
  const info = STAGES.find((s) => s.stage === stage)!
  const threat = stage === 'defend'
  if (i >= puzzles.length) return <RoundDone t={t} stage={stage} ok={passed(stage, mistakes, hints)} mistakes={mistakes} hints={hints} onRetry={() => { setI(0); setMistakes(0); setHints(0) }} />
  const p = puzzles[i]
  return (
    <div className="screen king-screen">
      <Head title={t.name} eyebrow={`${info.name} · ${i + 1} of ${puzzles.length}`} back={'armoury/' + t.id} />
      <p className="king-lesson">{info.about}</p>
      <OnePuzzle
        key={p.id + i}
        p={p}
        threat={threat}
        onMistake={() => { setMistakes((n) => n + 1); setSlipped(true) }}
        onSolved={() => setSolved(true)}
        onHelp={stage === 'help' ? () => setHints((n) => n + 1) : undefined}
      />
      {solved && (
        <div className={`king-fb ok ${threat && !slipped ? 'knack' : ''}`}>
          <b>{threat ? (slipped ? 'Now you see it.' : 'Knack! You saw it coming.') : slipped ? 'Solved – with the arrow.' : 'Good!'}</b>
          <p>{threat ? t.shield : stage === 'mixed' ? `Puzzle rating ${p.rating}.` : t.weapon}</p>
          <button type="button" className="primary wide" onClick={() => { setI(i + 1); setSolved(false); setSlipped(false) }}>Next</button>
        </div>
      )}
      <p className="note small">Puzzles from the Lichess database.</p>
    </div>
  )
}

function RoundDone({ t, stage, ok, mistakes, hints, onRetry }: { t: Technique; stage: Stage; ok: boolean; mistakes: number; hints: number; onRetry?: () => void }) {
  const [{ before, after }] = useState(() => {
    const a = loadArmoury()
    const b = medal(a[t.id])
    const next = ok ? finishStage(a, t.id, stage) : a
    saveArmoury(next)
    return { before: b, after: medal(next[t.id]) }
  })
  const won = after !== before ? after : null
  const [nuts] = useState(() => (won ? earn(`armoury/${t.id}/${won}`, NUTS[won]) : 0))
  useEffect(() => {
    if (ok) fx.success()
  }, [ok])
  return (
    <div className="screen king-screen">
      <div className="done">
        <div className="king-medal" aria-hidden="true">{won ? MEDAL[won] : ok ? '✓' : '↻'}</div>
        <div className="done-title">{won ? `${t.name}: ${MEDAL_NAME[won]}!` : ok ? 'Step done' : 'Once more'}</div>
        <p>
          {ok
            ? won === 'silver'
              ? 'You use it alone and you see it coming. Gold comes from the mixed round and your real games.'
              : 'On to the next step.'
            : hints
              ? 'Without hints this time – you can do it.'
              : `${mistakes} slips. ${stage === 'mixed' ? 'The mixed round needs every puzzle first try.' : 'One slip is allowed.'} Same puzzles again – now you know them a bit.`}
        </p>
        {nuts > 0 && <ChestnutReward amount={nuts} />}
        <div className="done-actions">
          <button type="button" onClick={() => go('armoury')}>Armoury</button>
          {ok || !onRetry ? (
            <button type="button" className="primary" onClick={() => go('armoury/' + t.id)}>Continue</button>
          ) : (
            <button type="button" className="primary" onClick={onRetry}>Try again</button>
          )}
        </div>
      </div>
    </div>
  )
}

// Gold: the technique has to work in finished, analysed chess.com games after silver
function RealWorld({ t }: { t: Technique }) {
  const player = getPlayer()
  const [data, setData] = useState<{ records: GameRecord[]; puzzles: Puzzle[] } | null>(null)
  useEffect(() => {
    Promise.all([getGameRecords(player), getPuzzles()])
      .then(([records, puzzles]) => setData({ records, puzzles: puzzles.filter((p) => (p.player ?? 'l0o2') === player && p.source !== 'bot') }))
      .catch(() => setData({ records: [], puzzles: [] }))
  }, [player])
  const p = loadArmoury()[t.id]
  const r = data ? realCheck(t, p, data.records, data.puzzles) : null
  // RoundDone saves the gold (once, when it appears)
  if (r?.ok) return <RoundDone t={t} stage="real" ok mistakes={0} hints={0} />
  return (
    <div className="screen king-screen">
      <Head title={t.name} eyebrow="Real world · for gold" back={'armoury/' + t.id} />
      <p className="king-lesson">
        Gold when {REAL_GAMES} finished chess.com games in a row (rapid or daily, played after your silver) have {t.real ? `no mistake of this kind` : 'no big mistake'}.
      </p>
      <section className="check-section">
        {!r ? <p className="note">Hoppy looks at your analysed games…</p> : (
          <>
            <p>{r.games ? `${r.games} analysed ${r.games === 1 ? 'game' : 'games'} since your silver, ${r.clean} without this mistake.` : 'No analysed game since your silver yet.'}</p>
            <div className="king-hp"><span style={{ width: `${(100 * Math.min(r.clean, REAL_GAMES)) / REAL_GAMES}%` }} /></div>
          </>
        )}
      </section>
      <div className="done-actions">
        <a className="button primary" href="https://www.chess.com/play/online" target="_blank" rel="noopener">Play on chess.com</a>
        <button type="button" onClick={() => go('afterwards')}>Read my new games</button>
      </div>
      <p className="note">Fair play: only finished games are read, never a running one.</p>
    </div>
  )
}
