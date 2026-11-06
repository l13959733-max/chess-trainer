import { useMemo, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { PathStep } from '../components/PathStep'
import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import type { Side } from '../lib/pgn'
import { lastLine } from '../lib/returnTo'
import { isDue } from '../lib/srs'
import { buildTree, moveLabel, nextChoice, openingsOf, percentFor, statsFor, STATS_INFO, type TreeNode } from '../lib/tree'

// Which opening when: for every answer of the other side, what you play – in the same chapters and
// learning path as "Learn openings", and, where real game results are loaded, how well it scores.
export function OpeningMap({ rep, side }: { rep: Repertoire; side?: string }) {
  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">Your openings</div>
          <h2>What to play when?</h2>
        </div>
      </div>
      <div className="map-body">
        <WhatWhen rep={rep} start={side === 'b' ? 'b' : 'w'} />
      </div>
    </div>
  )
}

const myTurn = (node: TreeNode, side: Side) => (node.path.length % 2 === 0) === (side === 'w')
const count = (n: number) => (n === 1 ? '1 line' : `${n} lines`)

export function WhatWhen({ rep, start = 'w' }: { rep: Repertoire; start?: Side }) {
  // Back from a line: its side and its chapter are open again
  const back = rep.lines.find((l) => l.id === lastLine())
  const [side, setSide] = useState<Side>(back?.side ?? start)
  const tree = useMemo(() => buildTree(rep.lines, side), [rep.lines, side])
  const [now] = useState(() => Date.now())
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const keys = tree.children.flatMap((f) => f.children).filter((r) => back && r.lines.includes(back)).map((r) => r.path.join(' '))
    return new Set(keys)
  })
  const [openLine, setOpenLine] = useState<string | null>(null)
  const them = side === 'w' ? 'Black' : 'White'
  const toggle = (key: string) => {
    const next = new Set(openKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setOpenKeys(next)
  }
  return (
    <>
      <div className="map-side" role="group" aria-label="Your side">
        <button type="button" className={side === 'w' ? 'on' : ''} aria-pressed={side === 'w'} onClick={() => setSide('w')}>I play White</button>
        <button type="button" className={side === 'b' ? 'on' : ''} aria-pressed={side === 'b'} onClick={() => setSide('b')}>I play Black</button>
      </div>
      <div className="greet">
        <Mascot mood="happy" />
        {them} can answer in many ways. Open one and see what you play against it.
      </div>
      <button type="button" className="primary wide map-surprise" disabled={!tree.lines.length} onClick={() => go('surprise/' + side)}>
        🎲 Surprise me – Hoppy picks {them}'s moves
      </button>
      <p className="note small">{STATS_INFO || 'Percentages from real games are not loaded yet.'}</p>

      {/* Sections: the first move (yours as White, White's as Black). Chapters: the next move. */}
      {tree.children.map((first) => (
        <section key={first.path[0]}>
          <h3 className="chapter-group">{side === 'w' ? `You start with ${moveLabel(first.path)}` : `White starts with ${moveLabel(first.path)}`}</h3>
          {first.children.map((reply) => {
            const key = reply.path.join(' ')
            const isOpen = openKeys.has(key)
            const played = reply.lines.filter((l) => rep.srs.get(l.id)).length
            const due = reply.lines.filter((l) => isDue(rep.srs.get(l.id), now)).length
            const { node: choice } = nextChoice(reply)
            const answers = myTurn(choice, side) && choice.children.length ? choice.children : []
            return (
              <div key={key} className={`chapter ${isOpen ? 'open' : ''}`}>
                <button type="button" className="chapter-head" aria-expanded={isOpen} onClick={() => toggle(key)}>
                  <span className={`side-dot ${side === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
                  <span className="chapter-title">
                    {myTurn(first, side) ? `You play ${moveLabel(reply.path)}` : `${them} plays ${moveLabel(reply.path)}`}
                    <small className="chapter-moves">{summary(reply, answers)}</small>
                  </span>
                  <span className="chapter-count">
                    {played}/{reply.lines.length}
                    {due > 0 && <b className="chapter-due">{due} due</b>}
                  </span>
                  <span className="chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && <Choices node={reply} side={side} rep={rep} now={now} openLine={openLine} onToggle={(id) => setOpenLine(openLine === id ? null : id)} />}
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}

// Under the chapter title: what you answer, or which opening it is
function summary(reply: TreeNode, answers: TreeNode[]): string {
  if (answers.length) {
    const names = [...new Set(answers.map((a) => openingsOf(a)[0] ?? ''))]
    const moves = answers.map((a) => moveLabel(a.path))
    if (names.length === 1) return `${names[0]} · you play ${moves.length > 1 ? moves.slice(0, -1).join(', ') + ' or ' + moves[moves.length - 1] : moves[0]}`
    return 'You play ' + answers.map((a) => `${moveLabel(a.path)} ${openingsOf(a)[0] ?? ''}`.trim()).join(' · ')
  }
  const names = openingsOf(reply)
  return `${names.slice(0, 2).join(' · ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''} · ${count(reply.lines.length)}`
}

// Inside a chapter: one heading per choice (your answers with their score, or the other side's tries),
// each with its lines as the learning path
function Choices({ node: from, side, rep, now, openLine, onToggle }: { node: TreeNode; side: Side; rep: Repertoire; now: number; openLine: string | null; onToggle: (id: string) => void }) {
  const { node } = nextChoice(from)
  const branches = node.children.length ? node.children : [node]
  const mine = myTurn(node, side)
  const them = side === 'w' ? 'Black' : 'White'
  return (
    <div className="map-choices">
      {branches.map((b) => {
        const stats = mine ? statsFor(b.path) : null
        const pct = stats && percentFor(stats, side)
        return (
          <div key={b.path.join(' ')} className="map-choice">
            {b !== node && (
              <div className="map-choice-head">
                <span className="map-move">{mine ? `You play ${moveLabel(b.path)}` : `If ${them} plays ${moveLabel(b.path)}`}</span>
                {mine && <span className="map-names">{openingsOf(b).join(' · ')}</span>}
              </div>
            )}
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
            <div className="path">
              {b.lines.map((line, i) => (
                <PathStep key={line.id} line={line} i={i} rep={rep} now={now} branch={null} open={openLine === line.id} onToggle={() => onToggle(line.id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
