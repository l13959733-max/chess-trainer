// Helps write a new repertoire line: plays the given moves and asks Stockfish for its main line
// from there. The result still needs comments – and still goes through check-lines.mjs.
// Usage: node scripts/extend-line.mjs "1.e4 e5 2.Nc3 Nf6 3.f4 exf4 4.e5 Qe7" [plies] [depth]
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { Chess } from 'chess.js'

const require = createRequire(import.meta.url)
const [moves = '', plies = '8', depth = '20'] = process.argv.slice(2)
const c = new Chess()
for (const san of moves.replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(Boolean)) c.move(san)

const p = spawn(process.execPath, [require('stockfish').findEngine('lite-single')], { stdio: 'pipe' })
let buf = '', last = ''
const done = new Promise((resolve) => {
  p.stdout.on('data', (d) => {
    buf += d
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i)
      buf = buf.slice(i + 1)
      if (l.startsWith('info') && l.includes(' pv ')) last = l
      if (l.startsWith('bestmove')) resolve()
    }
  })
})
p.stdin.write(`position fen ${c.fen()}\ngo depth ${depth}\n`)
await done
p.kill()
const score = / score (cp|mate) (-?\d+)/.exec(last)
const pv = last.split(' pv ')[1].trim().split(' ').slice(0, +plies)
const out = []
for (const u of pv) {
  const ply = c.history().length
  const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
  out.push(ply % 2 === 0 ? `${ply / 2 + 1}. ${m.san}` : m.san)
}
console.log(`${moves} | ${out.join(' ')} | ${score[1]} ${score[2]} (side to move)`)
