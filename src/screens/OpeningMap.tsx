import { useMemo, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { PathStep } from '../components/PathStep'
import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import type { Line, Side } from '../lib/pgn'
import { isDue } from '../lib/srs'
import { buildTree, moveLabel, movesLabel, nextChoice, openingsOf, percentFor, statsFor, STATS_INFO, type TreeNode } from '../lib/tree'

// Which opening when: at every point where the other side has a choice, what you answer –
// and, where real game results are loaded, how well each answer scores.
export function OpeningMap({ rep, side: start }: { rep: Repertoire; side?: string }) {
  const [side, setSide] = useState<Side>(start === 'b' ? 'b' : 'w')
  const tree = useMemo(() => buildTree(rep.lines, side), [rep.lines, side])
  const [now] = useState(() => Date.now())
  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">{tree.lines.length} lines</div>
          <h2>Which opening when?</h2>
        </div>
      </div>
      <div className="map-side" role="group" aria-label="Your side">
        <button type="button" className={side === 'w' ? 'on' : ''} aria-pressed={side === 'w'} onClick={() => setSide('w')}>I play White</button>
        <button type="button" className={side === 'b' ? 'on' : ''} aria-pressed={side === 'b'} onClick={() => setSide('b')}>I play Black</button>
      </div>
      <div className="greet">
        <Mascot mood="happy" />
        {side === 'w' ? 'Black can answer in many ways. Here you see what you play against each one.' : 'White can start in many ways. Here you see what you play against each one.'}
      </div>
      <button type="button" className="primary wide" disabled={!tree.lines.length} onClick={() => go('surprise/' + side)}>
        🎲 Surprise me – Hoppy picks {side === 'w' ? "Black's" : "White's"} moves
      </button>
      <div className="map-body">
        <p className="note small">{STATS_INFO || 'Percentages from real games are not loaded yet.'}</p>
        <Branch node={tree} side={side} rep={rep} now={now} depth={0} />
      </div>
    </div>
  )
}

const myTurn = (node: TreeNode, side: Side) => (node.path.length % 2 === 0) === (side === 'w')

function Branch({ node: from, side, rep, now, depth }: { node: TreeNode; side: Side; rep: Repertoire; now: number; depth: number }) {
  const { node, skipped } = nextChoice(from)
  if (!node.children.length) return node.lines.length === 1 ? <MapPath lines={node.lines} rep={rep} now={now} /> : null
  const then = skipped.length ? <p className="map-then">Then {movesLabel(node.path, from.path.length)}</p> : null
  if (myTurn(node, side)) {
    const best = bestOf(node.children, side)
    return (
      <>
        {then}
        <div className="map-options">
          {node.children.map((c) => <Option key={c.path.join(' ')} node={c} side={side} rep={rep} now={now} depth={depth} best={c === best} />)}
        </div>
      </>
    )
  }
  const them = side === 'w' ? 'Black' : 'White'
  return (
    <>
      {then}
      {node.children.map((c) => (
        <details key={c.path.join(' ')} className="map-reply" open={depth === 0 && node.children.length <= 2}>
          <summary>
            {them} plays <b>{moveLabel(c.path)}</b>
            <small>{c.lines.length === 1 ? '1 line' : `${c.lines.length} lines`}</small>
          </summary>
          <Branch node={c} side={side} rep={rep} now={now} depth={depth + 1} />
        </details>
      ))}
    </>
  )
}

function Option({ node, side, rep, now, depth, best }: { node: TreeNode; side: Side; rep: Repertoire; now: number; depth: number; best: boolean }) {
  const names = openingsOf(node)
  const learned = node.lines.filter((l) => rep.srs.get(l.id)).length
  const stats = statsFor(node.path)
  const pct = stats && percentFor(stats, side)
  const single = node.lines.length === 1 ? node.lines[0] : null
  return (
    <section className={`map-option ${best ? 'best' : ''}`}>
      <div className="map-option-head">
        <span className="map-move">You play {moveLabel(node.path)}</span>
        {best && <span className="map-best">Best score</span>}
      </div>
      <div className="map-names">{single ? single.title : names.length > 3 ? `${names.slice(0, 3).join(' · ')} and ${names.length - 3} more` : names.join(' · ')}</div>
      {pct && (
        <div className="map-stats" aria-label={`Wins ${pct.win} percent, draws ${pct.draw}, losses ${pct.loss}`}>
          <div className="map-bar">
            <span className="win" style={{ width: pct.win + '%' }} />
            <span className="draw" style={{ width: pct.draw + '%' }} />
            <span className="loss" style={{ width: pct.loss + '%' }} />
          </div>
          <small>You win {pct.win}% · draw {pct.draw}% · lose {pct.loss}% · {pct.games.toLocaleString('en')} games</small>
        </div>
      )}
      <div className="map-actions">
        <small>{node.lines.length === 1 ? '1 line' : `${node.lines.length} lines`} · {learned} played</small>
        {!single && <button type="button" className="primary" onClick={() => open(pickLine(node.lines, rep, now), rep)}>Practise</button>}
      </div>
      {single ? <MapPath lines={[single]} rep={rep} now={now} /> : <Branch node={node} side={side} rep={rep} now={now} depth={depth + 1} />}
    </section>
  )
}

// The lines at the end of a branch, as the same learning path as on the overview
function MapPath({ lines, rep, now }: { lines: Line[]; rep: Repertoire; now: number }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="path">
      {lines.map((line, i) => (
        <PathStep key={line.id} line={line} i={i} rep={rep} now={now} branch={null} open={open === line.id} onToggle={() => setOpen(open === line.id ? null : line.id)} />
      ))}
    </div>
  )
}

// A line never played starts with Learn, like on the overview: first see the moves, then play them yourself
function open(line: Line, rep: Repertoire) {
  go((rep.srs.get(line.id) ? 'drill/' : 'learn/') + line.id)
}

// The answer with the best score for you, when at least two have real results
function bestOf(options: TreeNode[], side: Side): TreeNode | null {
  const scored = options.map((o) => ({ o, s: statsFor(o.path) })).filter((x) => x.s)
  if (scored.length < 2) return null
  const score = (x: (typeof scored)[number]) => {
    const p = percentFor(x.s!, side)
    return p.win + p.draw / 2
  }
  return scored.reduce((a, b) => (score(b) > score(a) ? b : a)).o
}

// Due lines first, then new ones, else any
function pickLine(lines: Line[], rep: Repertoire, now: number): Line {
  const due = lines.filter((l) => isDue(rep.srs.get(l.id), now))
  const fresh = lines.filter((l) => !rep.srs.get(l.id))
  const pool = due.length ? due : fresh.length ? fresh : lines
  return pool[Math.floor(Math.random() * pool.length)]
}
