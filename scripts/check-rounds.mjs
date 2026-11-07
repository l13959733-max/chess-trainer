// Checks every board task of King of Chess with Stockfish: the move the game calls correct must not
// be much worse than the engine's best move (e.g. a "fork" that just loses the queen).
// Usage: npx tsx scripts/check-rounds.mjs [depth]
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { Chess } from 'chess.js'
import * as K from '../src/lib/king.ts'

const require = createRequire(import.meta.url)
const enginePath = require('stockfish').findEngine('lite-single')
const DEPTH = +(process.argv[2] ?? 16)
const MAX_LOSS = 150 // centipawns

const p = spawn(process.execPath, [enginePath], { stdio: 'pipe' })
let buf = '', waiter = null, last = ''
p.stdout.on('data', (d) => {
  buf += d
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    const l = buf.slice(0, i)
    buf = buf.slice(i + 1)
    if (l.startsWith('info') && l.includes(' score ')) last = l
    if (waiter && (l.startsWith('bestmove') || l === 'readyok')) { const w = waiter; waiter = null; w(l) }
  }
})
const ask = (cmd) => new Promise((r) => { waiter = r; p.stdin.write(cmd + '\n') })
// score in centipawns from the side to move's view (mate = ±10000)
async function score(fen) {
  const c = new Chess(fen)
  if (c.isCheckmate()) return -10000
  if (c.isDraw()) return 0
  p.stdin.write('ucinewgame\nposition fen ' + fen + '\n')
  await ask('go depth ' + DEPTH)
  const cp = / score cp (-?\d+)/.exec(last), mate = / score mate (-?\d+)/.exec(last)
  return cp ? +cp[1] : Math.sign(+mate[1]) * 10000
}

await ask('isready')
const sets = { FORKS: K.FORKS, MATES: K.MATES, ROOK_MATES: K.ROOK_MATES, QUEEN_TACTICS: K.QUEEN_TACTICS, LORD_FOG: K.LORD_FOG, GUARD: K.GUARD, GUARD_BOSS: K.GUARD_BOSS, ROME_THREATS: K.ROME_THREATS }
let problems = 0
for (const [name, rounds] of Object.entries(sets)) {
  for (const r of rounds ?? []) {
    const c = new Chess(r.fen)
    // the side that is not to move must not be in check (Stockfish refuses such positions)
    const flipped = r.fen.replace(/ [wb] /, (m) => (m === ' w ' ? ' b ' : ' w '))
    if (new Chess(flipped, { skipValidation: true }).inCheck()) { problems++; console.log(`✗ ${name} ${r.san}: impossible position, the side not to move is in check`); continue }
    const best = await score(r.fen)
    c.move({ from: r.from, to: r.to, promotion: 'q' })
    const after = -(await score(c.fen()))
    // a threat task asks for the opponent's dangerous move: it must be good for the opponent too
    const loss = best - after
    // a clear win that is not the very best is fine (e.g. "take the free piece")
    const bad = loss > MAX_LOSS && after < 300
    if (bad) problems++
    console.log(`${bad ? '✗' : '✓'} ${name} ${r.san}: best ${best}, task move ${after}${bad ? ` – loses ${loss}` : ''}`)
  }
}
console.log(`\n${problems} problems`)
p.kill()
process.exit(problems ? 1 : 0)
