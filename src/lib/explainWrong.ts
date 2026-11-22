// Why was my move wrong? (Lu, 22.11.2026: "Fehler erklären") – Stockfish in the browser compares your move with the
// right one. Only what the engine line shows is said: the opponent's answer, what it captures, mate – no numbers.
// A move that is nearly as good is called that honestly ("not bad – but your book move is …").
import { Chess } from 'chess.js'
import { evaluate } from './engine'
import type { Score } from './blunders'

const CLASS: Record<string, string> = { p: 'p', n: 'm', b: 'm', r: 'r', q: 'q' }
const NAME: Record<string, string> = { p: 'pawn', m: 'piece', r: 'rook', q: 'queen' }
const VAL: Record<string, number> = { p: 1, m: 3, r: 5, q: 9 }
const NEARLY = 60 // cp: a move this close to the right one is "not bad"

const play = (c: Chess, u: string) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })

// the moves of an engine line in notation: "9.Bxb7 Rb8 10.Bg2"
export function sanLine(fen: string, pv: string[], n: number): string {
  const c = new Chess(fen)
  const out: string[] = []
  for (const u of pv.slice(0, n)) {
    const no = c.moveNumber()
    const w = c.turn() === 'w'
    let m
    try {
      m = play(c, u)
    } catch {
      break
    }
    out.push(w ? `${no}.${m.san}` : out.length ? m.san : `${no}...${m.san}`)
  }
  return out.join(' ')
}

// what `side` wins along an engine line: captures of both sides (up to 8 half-moves, longer while captures go on),
// equal ones cancel out, a knight for a bishop is a trade. "wins a piece for a pawn", "" when nothing is won.
export function winsText(fen: string, pv: string[], side: 'w' | 'b'): string {
  const c = new Chess(fen)
  const got: string[] = []
  const lost: string[] = []
  for (const [i, u] of pv.entries()) {
    if (i >= 12) break
    let m
    try {
      m = play(c, u)
    } catch {
      break
    }
    if (m.captured) (m.color === side ? got : lost).push(CLASS[m.captured])
    if (i >= 7 && !m.captured) break
  }
  if (c.isCheckmate() && c.turn() !== side) return 'and it ends in mate'
  for (const x of [...got]) {
    const k = lost.indexOf(x)
    if (k >= 0) {
      lost.splice(k, 1)
      got.splice(got.indexOf(x), 1)
    }
  }
  const val = (a: string[]) => a.reduce((t, x) => t + VAL[x], 0)
  if (!got.length || val(got) <= val(lost)) return ''
  const words = (a: string[]) => {
    const n: Record<string, number> = {}
    for (const x of a) n[x] = (n[x] ?? 0) + 1
    return Object.entries(n)
      .sort((x, y) => VAL[y[0]] - VAL[x[0]])
      .map(([x, k]) => (k === 1 ? `${x === 'q' ? 'the' : 'a'} ${NAME[x]}` : `${k} ${NAME[x]}s`))
      .join(' and ')
  }
  return `and wins ${words(got)}${lost.length ? ' for ' + words(lost) : ''}`
}

const cp = (s: Score) => ('cp' in s ? s.cp : Math.sign(s.mate) * (10000 - Math.abs(s.mate)))

// The sentence for a wrong move, from the two evaluations (pure, tested). `fen` = your turn, before your move.
export function wrongText(o: { fen: string; wrong: string; right: string; kind: 'book' | 'react' | 'punish'; afterWrong: { score: Score; pv: string[] }; afterRight: { score: Score; pv?: string[] } }): string {
  const c = new Chess(o.fen)
  const me = c.turn()
  const wSan = play(new Chess(o.fen), o.wrong).san
  const rSan = play(new Chess(o.fen), o.right).san
  const after = new Chess(o.fen)
  play(after, o.wrong)
  // both scores are from the opponent's view (he moves next)
  const loss = cp(o.afterWrong.score) - cp(o.afterRight.score)
  const who = me === 'w' ? 'Black' : 'White'
  // what the right move would have won: your move, then the engine's line after it
  const rightWins = winsText(o.fen, [o.right, ...(o.afterRight.pv ?? [])], me)
  const rightPart = `The right move was ${rSan}${rightWins ? ' – it ' + rightWins.replace(/^and /, '') : ''}.`
  if (loss < NEARLY) return `${wSan} is not bad – but ${o.kind === 'book' ? 'your book move' : 'the best move'} here is ${rSan}.`
  const reply = o.afterWrong.pv[0]
  if (!reply) return `${wSan} is a mistake. ${rightPart}`
  const replySan = play(new Chess(after.fen()), reply).san
  const mates = 'mate' in o.afterWrong.score && o.afterWrong.score.mate > 0
  const wins = winsText(after.fen(), o.afterWrong.pv, me === 'w' ? 'b' : 'w')
  const what = mates ? 'and it leads to mate' : wins || 'and your position gets clearly worse'
  return `${wSan} is a mistake: ${who} answers ${replySan} ${what}. The line: ${sanLine(after.fen(), o.afterWrong.pv, 4)}. ${rightPart}`
}

// Ask Stockfish (in the browser) and build the sentence. Null when the engine cannot run.
export async function explainWrong(fen: string, wrong: string, right: string, kind: 'book' | 'react' | 'punish'): Promise<string | null> {
  try {
    const a = new Chess(fen)
    play(a, wrong)
    const b = new Chess(fen)
    play(b, right)
    if (a.isCheckmate()) return null
    const afterWrong = await evaluate(a.fen(), 12, true)
    const afterRight = b.isCheckmate() ? { score: { mate: -1 } as Score, pv: [] } : await evaluate(b.fen(), 12, true)
    return wrongText({ fen, wrong, right, kind, afterWrong, afterRight })
  } catch {
    return null
  }
}
