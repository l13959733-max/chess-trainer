// Coach for games against Hoppy-Bot: simple plans for the position and a verdict on the player's move.
import { Chess, type Color, type Square } from 'chess.js'
import type { Candidate } from './bot'
import { winChance } from './bot'
import { piecesInDanger } from './safety'

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

// Plans a beginner can follow, most urgent first (at most 3)
export function plans(fen: string, me: Color): string[] {
  const c = new Chess(fen)
  const out: string[] = []
  const danger = piecesInDanger(fen, me)
  if (danger.length) out.push(`First save your ${NAME[c.get(danger[0])!.type]} on ${danger[0]} – it can be taken.`)
  if (c.inCheck()) out.push('You are in check: move the king, block, or take the checking piece.')
  const home = me === 'w' ? 1 : 8
  const minors = (['b', 'c', 'f', 'g'] as const)
    .map((f) => `${f}${home}` as Square)
    .filter((sq) => {
      const p = c.get(sq)
      return p && p.color === me && (p.type === 'n' || p.type === 'b')
    })
  if (minors.length >= 3) out.push('Bring out your knights and bishops – most of them are still at home.')
  else if (minors.length) out.push(`Bring out your ${minors.map((sq) => `${NAME[c.get(sq)!.type]} on ${sq}`).join(' and ')}.`)
  const castling = fen.split(' ')[2]
  const canCastle = me === 'w' ? /[KQ]/.test(castling) : /[kq]/.test(castling)
  const king = c.board().flat().find((p) => p && p.type === 'k' && p.color === me)
  if (canCastle && king && (king.square === 'e1' || king.square === 'e8')) out.push('Castle soon: it brings your king to safety and your rook into the game.')
  if (!out.length) out.push('Look for a piece that does little and find it a better square. Check what your opponent attacks before every move.')
  return out.slice(0, 3)
}

export type Verdict = 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

// How good was the move, compared with the engine's best (lost winning chance in percentage points)
export function verdict(cands: Candidate[], uci: string): { verdict: Verdict; best: Candidate; loss: number } | null {
  if (!cands.length) return null
  const sorted = [...cands].sort((a, b) => winChance(b.score) - winChance(a.score))
  const best = sorted[0]
  const mine = cands.find((x) => x.uci === uci || x.uci.slice(0, 4) === uci.slice(0, 4))
  if (!mine) return null
  const loss = winChance(best.score) - winChance(mine.score)
  const v: Verdict = mine === best || loss < 3 ? 'great' : loss < 10 ? 'good' : loss < 20 ? 'inaccuracy' : loss < 30 ? 'mistake' : 'blunder'
  return { verdict: v, best, loss }
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
const CENTER = ['d4', 'e4', 'd5', 'e5']

// One short reason why a move is good, from facts on the board (most important first)
export function reason(fen: string, uci: string): string {
  const c = new Chess(fen)
  const me = c.turn()
  const opp: Color = me === 'w' ? 'b' : 'w'
  const dangerBefore = piecesInDanger(fen, me)
  let m
  try {
    m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  } catch {
    return ''
  }
  if (c.isCheckmate()) return 'checkmate!'
  if (m.captured) return `takes the ${NAME[m.captured]} on ${m.to}${c.inCheck() ? ' with check' : ''}.`
  if (dangerBefore.includes(m.from as Square)) return `saves your ${NAME[m.piece]} – it was in danger on ${m.from}.`
  const dangerAfter = piecesInDanger(c.fen(), me)
  if (dangerBefore.length > dangerAfter.length) return `protects your ${NAME[new Chess(fen).get(dangerBefore[0])!.type]} on ${dangerBefore[0]}.`
  if (m.san.startsWith('O-O')) return 'castles: your king is safe and your rook joins the game.'
  if (c.inCheck()) return 'gives check, so your opponent has to answer it.'
  // attacks an enemy piece that is unprotected or worth more than the attacker
  const targets = c.moves({ square: m.to as Square, verbose: true }).filter((x) => x.captured).map((x) => ({ sq: x.to as Square, type: x.captured! }))
  const juicy = targets.filter((t) => t.type !== 'p' && (VALUE[t.type] > VALUE[m.piece] || c.attackers(t.sq, opp).length === 0))
  if (juicy.length >= 2) return `attacks two things at once: the ${NAME[juicy[0].type]} on ${juicy[0].sq} and the ${NAME[juicy[1].type]} on ${juicy[1].sq} – a fork!`
  if (juicy.length) return `attacks the ${NAME[juicy[0].type]} on ${juicy[0].sq}.`
  const home = me === 'w' ? '1' : '8'
  if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === home) return `develops your ${NAME[m.piece]} to a good square.`
  if (m.piece === 'p' && CENTER.includes(m.to)) return 'takes space in the center.'
  if (m.piece === 'p' && ['c4', 'c5', 'f4', 'f5'].includes(m.to)) return 'fights for the center from the side.'
  if (m.piece === 'r' && !c.board().flat().some((p) => p && p.type === 'p' && p.square[0] === m.to[0])) return 'puts the rook on an open file.'
  return 'a solid move that keeps your position healthy.'
}
