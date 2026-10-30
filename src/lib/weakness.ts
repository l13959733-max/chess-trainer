// Sorts each mistake into a kind of weakness, the same way the 30.10.2026 analysis of all of Lu's
// games did: did the player miss what the OPPONENT can do, or miss their OWN chance?
import { Chess, type Square } from 'chess.js'
import type { Score } from './blunders'

export type Category =
  | 'hung-piece'
  | 'ignored-threat'
  | 'left-undefended'
  | 'tactic'
  | 'allowed-mate'
  | 'free-piece'
  | 'missed-mate'
  | 'missed-tactic'
  | 'other'

export interface Refutation {
  best: string // UCI, the opponent's best answer to the played move
  pv: string[]
  score: Score // from the opponent's view
}

export const CATEGORY: Record<Category, { title: string; family: 'opponent' | 'chance' | 'other'; rule: string }> = {
  'hung-piece': { title: 'Piece left hanging', family: 'opponent', rule: 'Before you let go of a piece: who attacks that square, and who protects it?' },
  'ignored-threat': { title: 'Threat not seen', family: 'opponent', rule: 'After every move of your opponent, ask: what does it attack now?' },
  'left-undefended': { title: 'Protection taken away', family: 'opponent', rule: 'When a piece moves, check what it was protecting.' },
  tactic: { title: 'Fork or pin not seen', family: 'opponent', rule: 'Look at every check, capture and attack your opponent has after your move.' },
  'allowed-mate': { title: 'Checkmate allowed', family: 'opponent', rule: 'Watch your king: find every check your opponent can give.' },
  'free-piece': { title: 'Free piece not taken', family: 'chance', rule: 'Before you move, ask: can I take something for free?' },
  'missed-mate': { title: 'Checkmate missed', family: 'chance', rule: 'Always look at your checks first – one of them might be mate.' },
  'missed-tactic': { title: 'Winning trick missed', family: 'chance', rule: 'Look for moves that attack two things at once.' },
  other: { title: 'Position got worse', family: 'other', rule: 'Make a plan: develop, castle, and put your pieces on good squares.' },
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function material(c: Chess, color: 'w' | 'b') {
  return c.board().flat().reduce((s, p) => s + (p && p.color === color ? VALUE[p.type] : 0), 0)
}

// Material change for `me` when the line is played from `fen`
function swing(fen: string, ucis: string[], me: 'w' | 'b'): number {
  const c = new Chess(fen)
  const opp = me === 'w' ? 'b' : 'w'
  const d0 = material(c, me) - material(c, opp)
  for (const u of ucis) {
    try {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    } catch {
      break
    }
  }
  return material(c, me) - material(c, opp) - d0
}

const LINE = 8 // plies

export function categorize(p: { fen: string; played: string; best: string; pv: string[]; kind: 'blunder' | 'missed-mate'; refutation?: Refutation }): Category {
  if (p.kind === 'missed-mate') return 'missed-mate'
  const me = new Chess(p.fen).turn()
  const opp = me === 'w' ? 'b' : 'w'
  const r = p.refutation
  if (r && 'mate' in r.score && r.score.mate > 0) return 'allowed-mate'

  const bestGain = swing(p.fen, p.pv.slice(0, LINE), me)
  if (r) {
    const c = new Chess(p.fen)
    const played = c.move(p.played)
    const target = c.get(r.best.slice(2, 4) as Square)
    const loss = swing(c.fen(), r.pv.length ? r.pv.slice(0, LINE) : [r.best], me)
    if (target && target.color === me && loss <= -2) {
      if (r.best.slice(2, 4) === played.to) return 'hung-piece'
      const before = new Chess(p.fen)
      const sq = r.best.slice(2, 4) as Square
      if (before.get(sq)?.color === me && before.attackers(sq, opp).includes(r.best.slice(0, 2) as Square)) return 'ignored-threat'
      return 'left-undefended'
    }
    if (bestGain >= 2 && new Chess(p.fen).get(p.best.slice(2, 4) as Square)) return 'free-piece'
    if (loss <= -2) return 'tactic'
  } else if (bestGain >= 2 && new Chess(p.fen).get(p.best.slice(2, 4) as Square)) return 'free-piece'
  if (bestGain >= 2) return 'missed-tactic'
  return 'other'
}

export type Phase = 'opening' | 'middlegame' | 'endgame'

// Where in the game a position is: the first 12 moves are the opening; endgame = little material left
export function phaseOf(fen: string): Phase {
  const moveNo = Number(fen.split(' ')[5]) || 1
  if (moveNo <= 12) return 'opening'
  const c = new Chess(fen)
  const pieces = c.board().flat().reduce((s, p) => s + (p && p.type !== 'p' && p.type !== 'k' ? VALUE[p.type] : 0), 0)
  return pieces <= 13 ? 'endgame' : 'middlegame'
}
