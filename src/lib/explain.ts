// Explains a blunder puzzle in words, built only from facts the engine line proves:
// what the opponent's answer does (fork, free piece, pin, skewer, check, mate) and what material changes hands.
import { Chess, type Move, type Square } from 'chess.js'
import type { Score } from './blunders'
import { ending, notation, piece, sideName, t } from './i18n'

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
const LINE_PLIES = 6

export interface LineStep {
  san: string
  from: string
  to: string
  fenBefore: string
  fenAfter: string
}

export interface Explanation {
  sentences: string[]
  line: LineStep[] // to replay on the board, starting from the puzzle position
}

function playLine(fen: string, moves: (string | { from: string; to: string; promotion?: string })[], max: number): LineStep[] {
  const c = new Chess(fen)
  const out: LineStep[] = []
  for (const m of moves.slice(0, max)) {
    let mv: Move
    try {
      mv = typeof m === 'string' && !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)
        ? c.move(m)
        : c.move(typeof m === 'string' ? { from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] } : m)
    } catch {
      break
    }
    out.push({ san: mv.san, from: mv.from, to: mv.to, fenBefore: mv.before, fenAfter: mv.after })
  }
  return out
}

// Material won (positive) or lost along the line, from `me`'s side, in pawn units
function materialSwing(line: LineStep[], me: 'w' | 'b'): { net: number; lost: string[]; won: string[] } {
  let net = 0
  const lost: string[] = []
  const won: string[] = []
  for (const s of line) {
    const c = new Chess(s.fenBefore)
    const mv = c.move({ from: s.from, to: s.to, promotion: s.san.match(/=([QRBN])/)?.[1].toLowerCase() })
    if (mv.captured) {
      if (mv.color === me) { net += VALUE[mv.captured]; won.push(mv.captured) } else { net -= VALUE[mv.captured]; lost.push(mv.captured) }
    }
    if (mv.promotion) net += (mv.color === me ? 1 : -1) * (VALUE[mv.promotion] - 1)
  }
  return { net, lost, won }
}

function pieceList(types: string[]): string {
  const names = types.map((type) => piece(type, 'a'))
  return names.length <= 1 ? names.join('') : t('{a} and {b}', { a: names.slice(0, -1).join(', '), b: names.at(-1)! })
}

function pawns(n: number): string {
  return n === 1 ? t('a pawn') : t('{n} pawns', { n })
}

// Squares between two squares on a straight line, in order from `a` (exclusive) towards `b`
function ray(from: string, dx: number, dy: number): string[] {
  const out: string[] = []
  let f = from.charCodeAt(0) - 97 + dx
  let r = +from[1] + dy
  while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
    out.push(String.fromCharCode(97 + f) + r)
    f += dx
    r += dy
  }
  return out
}

const DIRS: Record<string, [number, number][]> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
}

// What a just-played opponent move does to `me`: fork, pin or skewer by the moved piece
function motifs(fenAfter: string, to: string, me: 'w' | 'b'): string[] {
  const c = new Chess(fenAfter)
  const mover = c.get(to as Square)
  if (!mover) return []
  const out: string[] = []
  const defended = (sq: string) => c.attackers(sq as Square, me).length > 0

  // Fork: the moved piece attacks two or more of my pieces that are worth more than it or are unprotected
  const targets: string[] = []
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== me) continue
    if (!c.attackers(p.square, mover.color).includes(to as Square)) continue
    if (p.type === 'k' || VALUE[p.type] > VALUE[mover.type] || !defended(p.square)) targets.push(t('your {piece} on {sq}', { piece: piece(p.type), sq: p.square }))
  }
  if (targets.length >= 2) out.push(t("It attacks {list} and {last} at the same time – a fork. You can't save both.", { list: targets.slice(0, -1).join(', '), last: targets.at(-1)! }))

  // A single attack on a piece that is unprotected or worth more than the attacker
  if (targets.length === 1 && !out.length) out.push(t('It attacks {target}.', { target: targets[0] }))

  // Pin / skewer along the moved piece's lines
  for (const [dx, dy] of DIRS[mover.type] ?? []) {
    const line = ray(to, dx, dy)
    const pieces = line.map((sq) => ({ sq, p: c.get(sq as Square) })).filter((x) => x.p)
    if (pieces.length < 2) continue
    const [first, second] = pieces
    if (first.p!.color !== me || second.p!.color !== me) continue
    const front = { piece: piece(first.p!.type), the: piece(first.p!.type, 'the'), sq: first.sq, back: piece(second.p!.type), sq2: second.sq }
    if (second.p!.type === 'k') out.push(t("It pins your {piece} on {sq} to your king: the {piece} can't move away.", front))
    else if (first.p!.type === 'k' || VALUE[first.p!.type] > VALUE[second.p!.type]) out.push(t('It attacks your {piece} on {sq}, and when it moves, your {back} on {sq2} behind it is lost – a skewer.', front))
    else if (VALUE[second.p!.type] > VALUE[first.p!.type] && VALUE[second.p!.type] > VALUE[mover.type]) out.push(t('It pins your {piece} on {sq}: if it moves, your {back} on {sq2} is lost.', front))
  }
  return out
}

// A piece of mine that is attacked and has no safe square to go to
function trapped(fen: string, me: 'w' | 'b'): string | null {
  const c = new Chess(fen)
  if (c.turn() !== me || c.inCheck()) return null // in check, pieces can't move for other reasons
  const opp = me === 'w' ? 'b' : 'w'
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== me || p.type === 'k' || p.type === 'p') continue
    const attackers = c.attackers(p.square, opp)
    if (!attackers.length) continue
    const cheapest = Math.min(...attackers.map((sq) => VALUE[c.get(sq)!.type]))
    const defended = c.attackers(p.square, me).length > 0
    if (defended && cheapest >= VALUE[p.type]) continue
    const escapes = c.moves({ square: p.square, verbose: true }).filter((m) => {
      if (m.captured && VALUE[m.captured] >= VALUE[p.type]) return true
      const after = new Chess(m.after)
      return after.attackers(m.to as Square, opp).length === 0
    })
    if (!escapes.length) return t('Your {piece} on {sq} is attacked and has no safe square left – it is trapped.', { piece: piece(p.type), sq: p.square, o: ending(p.type) })
  }
  return null
}

function lineText(line: LineStep[], max = 4): string {
  return line.slice(0, max).map((s) => notation(s.san)).join(' ')
}

// Why the move from the game was a mistake. `refutation` = engine line after it (opponent to move).
export function explainMistake(fen: string, played: string, refutation: { score: Score; pv: string[] }): Explanation {
  const me = new Chess(fen).turn()
  const line = playLine(fen, [played, ...refutation.pv], LINE_PLIES + 1)
  const sentences: string[] = []
  if (line.length < 2) return { sentences: [t('After {move} the engine finds a strong answer for your opponent.', { move: notation(played) })], line }
  const reply = line[1]
  const oppColor = me === 'w' ? 'b' : 'w'
  const opp = sideName(oppColor)
  const Opp = sideName(oppColor, true)

  if ('mate' in refutation.score && refutation.score.mate > 0) {
    sentences.push(t('After {move}, {opp} can force checkmate in {n}: {line}.', { move: notation(played), opp, n: refutation.score.mate, line: lineText(line.slice(1, 1 + refutation.score.mate * 2)) }))
    return { sentences, line }
  }

  const before = new Chess(reply.fenBefore)
  const answer = before.move({ from: reply.from, to: reply.to, promotion: reply.san.match(/=([QRBN])/)?.[1].toLowerCase() })
  // A trade = my recapture on the same square takes back about the same value
  const back = line[2] && line[2].to === reply.to ? new Chess(line[2].fenBefore).get(reply.to as Square) : null
  const recapture = !!(answer.captured && back && Math.abs(VALUE[back.type] - VALUE[answer.captured]) <= 1)
  const check = answer.san.includes('+') ? t(' with check') : ''
  if (answer.captured && recapture) {
    sentences.push(t('{Opp} trades with {move}{check}, {back}.', { Opp, move: notation(reply.san), check, back: notation(line[2].san) }))
  } else if (answer.captured) {
    const unprotected = before.attackers(reply.to as Square, me).length === 0
    sentences.push(t('{Opp} answers {move}{check} and takes your {piece} on {sq}{unprotected}.', { Opp, move: notation(reply.san), check, piece: piece(answer.captured), the: piece(answer.captured, 'the'), sq: reply.to, unprotected: unprotected ? t(' – after your move it was not protected any more', { o: ending(answer.captured) }) : '' }))
  } else {
    sentences.push(t('{Opp} answers {move}{check}.', { Opp, move: notation(reply.san), check }))
  }

  // What the answer does; if nothing obvious, the first opponent move later in the line that does something
  let found = motifs(reply.fenAfter, reply.to, me)
  for (let i = 3; !found.length && i < line.length; i += 2) {
    const m = motifs(line[i].fenAfter, line[i].to, me)
    if (m.length) found = [t('Then {move}: {what}', { move: notation(line[i].san), what: m[0][0].toLowerCase() + m[0].slice(1) }), ...m.slice(1)]
  }
  sentences.push(...found.slice(0, 2))
  const trap = trapped(reply.fenAfter, me)
  if (trap) sentences.push(trap)

  const { net } = materialSwing(line, me)
  if (net <= -1) sentences.push(t('Play it through: after {line} you are {pawns} down in material.', { line: lineText(line.slice(1)), pawns: pawns(-net) }))
  else sentences.push(t('After {line} {opp} has the better position.', { line: lineText(line.slice(1)), opp }))
  return { sentences, line }
}

// Why the engine's move is better. `pv` starts with the best move; `score` = engine score before it.
export function explainBest(fen: string, pv: string[], score: Score): Explanation {
  const me = new Chess(fen).turn()
  const line = playLine(fen, pv, LINE_PLIES)
  if (!line.length) return { sentences: [], line }
  const best = line[0]
  const sentences: string[] = []

  if ('mate' in score && score.mate > 0) {
    sentences.push(t('{move} leads to checkmate in {n}: {line}.', { move: notation(best.san), n: score.mate, line: lineText(line.slice(0, score.mate * 2 - 1)) }))
    return { sentences, line }
  }

  const c = new Chess(fen)
  const mover = c.get(best.from as Square)!
  const mv = c.move({ from: best.from, to: best.to, promotion: pv[0][4] })
  // "In danger" = attacked and either unprotected or attacked by a cheaper piece
  const start = new Chess(fen)
  const attackers = start.attackers(best.from as Square, me === 'w' ? 'b' : 'w')
  const cheapest = Math.min(...attackers.map((sq) => VALUE[start.get(sq)!.type]))
  const inDanger = attackers.length > 0 && (start.attackers(best.from as Square, me).length === 0 || cheapest < VALUE[mover.type])
  if (mv.captured) sentences.push(t('{move} takes {the} on {sq}.', { move: notation(best.san), the: piece(mv.captured, 'the'), sq: best.to }))
  else if (inDanger && mover.type !== 'k') sentences.push(t('{move} brings your {piece} on {sq} out of danger.', { move: notation(best.san), piece: piece(mover.type), sq: best.from }))
  if (mv.san.includes('+')) sentences.push(t('It also gives check, so your opponent has to answer that first.'))

  const { net, won } = materialSwing(line, me)
  const cp = 'cp' in score ? score.cp : 0
  const verdict = cp > 150 ? t('keeps your advantage') : cp < -150 ? t('is the best defence in a difficult position') : t('keeps the game balanced')
  if (net >= 1) sentences.push(t('After {line} you win {what} – {pawns} up.', { line: lineText(line), what: won.length ? pieceList(won) : t('material'), pawns: pawns(net) }))
  else if (!sentences.length) sentences.push(t('{move} keeps your pieces safe and {verdict}: {line}.', { move: notation(best.san), verdict, line: lineText(line) }))
  else sentences.push(t('A likely continuation: {line}.', { line: lineText(line) }))
  return { sentences, line }
}
