// Checks every built-in line with Stockfish: each move of the learner's side must be close to
// the engine's best move, so Lu never learns a bad move. Prints problems and the final evaluation.
// Usage: node scripts/check-lines.mjs [depth]   (depth 16 by default)
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Chess } from 'chess.js'

const require = createRequire(import.meta.url)
const enginePath = require('stockfish').findEngine('lite-single')
const DEPTH = +(process.argv[2] ?? 16)
const MAX_LOSS = 60 // centipawns
const PROCS = 8

function engine() {
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
  return {
    init: () => ask('isready'),
    // score in centipawns from the side to move's view (mate = ±10000)
    async score(fen) {
      const c = new Chess(fen)
      if (c.isCheckmate()) return -10000
      if (c.isDraw()) return 0
      p.stdin.write('ucinewgame\nposition fen ' + fen + '\n')
      const bm = await ask('go depth ' + DEPTH)
      const cp = / score cp (-?\d+)/.exec(last), mate = / score mate (-?\d+)/.exec(last)
      return { s: cp ? +cp[1] : Math.sign(+mate[1]) * 10000, best: bm.split(' ')[1] }
    },
    kill: () => p.kill(),
  }
}

const jobs = []
for (const file of readdirSync('data').filter((f) => f.endsWith('.pgn'))) {
  for (const pgn of readFileSync('data/' + file, 'utf8').split(/\n(?=\[Event )/).filter((g) => g.trim())) {
    const c = new Chess()
    c.loadPgn(pgn)
    const h = c.getHeaders()
    jobs.push({ file, title: h.Event, side: h.Side === 'Black' ? 'b' : 'w', moves: c.history({ verbose: true }), finalFen: c.fen() })
  }
}

let next = 0, problems = 0
const out = []
await Promise.all(Array.from({ length: PROCS }, async () => {
  const e = engine()
  await e.init()
  while (next < jobs.length) {
    const j = jobs[next++]
    const notes = []
    for (const m of j.moves) {
      if (m.color !== j.side) continue
      const before = await e.score(m.before)
      const after = await e.score(m.after)
      const afterS = typeof after === 'number' ? after : after.s
      const loss = before.s - -afterS
      if (loss > MAX_LOSS && before.best !== m.from + m.to + (m.promotion ?? '')) {
        const best = new Chess(m.before).move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] }).san
        notes.push(`${m.san} loses ${loss} (best ${best})`)
      }
    }
    const fin = await e.score(j.finalFen)
    const finS = typeof fin === 'number' ? fin : fin.s
    const forLearner = new Chess(j.finalFen).turn() === j.side ? finS : -finS
    problems += notes.length
    out.push(`${notes.length ? '✗' : '✓'} [${j.side}] ${j.title}: end ${forLearner > 0 ? '+' : ''}${(forLearner / 100).toFixed(2)}${notes.length ? '\n    ' + notes.join('\n    ') : ''}`)
  }
  e.kill()
}))
console.log(out.sort().join('\n'))
console.log(`\n${jobs.length} lines, ${problems} problems`)
process.exit(problems ? 1 : 0)
