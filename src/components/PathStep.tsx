import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import type { Line } from '../lib/pgn'
import { shortName } from '../lib/lineNames'
import { daysUntil, lineResult } from '../lib/srs'

// One line on the learning path: a round button (new ★, perfect ✓ or the mistakes), tap it for Learn and Play
export function PathStep({ line, i, rep, now, branch, open, onToggle }: { line: Line; i: number; rep: Repertoire; now: number; branch: string | null; open: boolean; onToggle: () => void }) {
  const s = rep.srs.get(line.id)
  const r = lineResult(s, now)
  const last = r.kind === 'new' ? 'Not played yet' : r.kind === 'perfect' ? 'Last time: perfect' : `Last time: ${r.mistakes} ${r.mistakes === 1 ? 'mistake' : 'mistakes'}`
  const next = !s || r.kind === 'new' ? '' : r.due ? 'Practice again now' : daysUntil(s, now) <= 1 ? 'Again tomorrow' : `Again in ${daysUntil(s, now)} days`
  const cls = r.kind === 'new' ? 'new' : r.kind === 'perfect' ? 'perfect' : 'mistakes'
  return (
    <div className={`path-step offset-${i % 4}`} data-line={line.id}>
      <button
        type="button"
        className={`path-node ${cls} ${r.due ? 'is-due' : ''} ${line.side === 'b' ? 'black' : ''}`}
        aria-expanded={open}
        aria-label={line.title}
        onClick={onToggle}
      >
        {r.kind === 'new' ? '★' : r.kind === 'perfect' ? '✓' : r.mistakes}
      </button>
      <div className="path-label">{shortName(line, line.opening) ?? line.title}{shortName(line, line.opening) && <small className="path-moves">{line.title}</small>}</div>
      {branch && <div className="path-branch">differs at {branch}</div>}
      {r.kind !== 'new' && (
        <div className={`path-result ${cls}`}>{r.kind === 'perfect' ? 'Perfect' : `${r.mistakes} ${r.mistakes === 1 ? 'mistake' : 'mistakes'}`}{r.due ? ' · practice again' : ''}</div>
      )}
      {open && (
        <div className="path-pop">
          <div className="meta">
            <span className={`side side-${line.side}`}>{line.side === 'w' ? 'White' : 'Black'}</span>
            <span>{Math.ceil(line.moves.length / 2)} moves</span>
            <span className={`status ${cls}`}>{last}</span>
            {next && <span className={r.due ? 'status due' : ''}>{next}</span>}
          </div>
          <div className="row">
            <button type="button" onClick={() => go('learn/' + line.id)}>Learn</button>
            <button type="button" className="primary" onClick={() => go('drill/' + line.id)}>Play</button>
          </div>
        </div>
      )}
    </div>
  )
}
