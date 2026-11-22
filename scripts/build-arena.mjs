// Builds the extra tasks of Opening Rush (src/data/arena/<slug>.json) with Stockfish – Lu, 22.11.2026:
// "die Eröffnung hardcore trainieren … wie reagiert man in welcher Situation, nur viel umfangreicher".
// The book moves come from data/*.pgn at runtime; this script adds what the book does not cover:
//   react  – the opponent leaves your book with a good move (within 0.8 pawns of his best): find the best answer
//            (every answer within 0.2 pawns of the best counts)
//   punish – the opponent makes a mistake that loses at least 2 pawns: find the one move that punishes it
//            (the best move must be clearly better than the second best, so the answer is unique)
// Every task is checked by Stockfish here; src/lib/openingRush.test.ts checks that every move is legal.
// Usage: node scripts/build-arena.mjs [opening …]   (default: the Catalan and every Black opening with 2+ lines)
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Chess } from 'chess.js'

const require = createRequire(import.meta.url)
const enginePath = require('stockfish').findEngine('lite-single')
const PROCS = 8
const D_OPP = 13 // the opponent's candidate moves
const D_ME = 15 // your answers
const D_SCAN = 9 // quick scan of every legal opponent move for mistakes
const REACT_WITHIN = 80 // cp: a deviation counts as "good" when it is this close to the opponent's best
const ALT_WITHIN = 20 // cp: answers this close to your best also count
const MISTAKE = 200 // cp: a move that loses this much is a mistake to punish
const UNIQUE = 150 // cp: the punishing move must be this much better than the second best
const OUT = 'src/data/arena'

function engine() {
  const p = spawn(process.execPath, [enginePath], { stdio: 'pipe' })
  let buf = '', waiter = null, infos = new Map()
  p.stdout.on('data', (d) => {
    buf += d
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i)
      buf = buf.slice(i + 1)
      if (l.startsWith('info') && l.includes(' score ') && l.includes(' pv ')) {
        const mp = +(/ multipv (\d+)/.exec(l)?.[1] ?? 1)
        const cp = / score cp (-?\d+)/.exec(l), mate = / score mate (-?\d+)/.exec(l)
        const s = cp ? +cp[1] : Math.sign(+mate[1]) * (10000 - Math.abs(+mate[1]))
        infos.set(mp, { s, mate: !!mate, pv: l.split(' pv ')[1].trim().split(' ') })
      }
      if (waiter && (l.startsWith('bestmove') || l === 'readyok')) { const w = waiter; waiter = null; w(l) }
    }
  })
  const ask = (cmd) => new Promise((r) => { waiter = r; p.stdin.write(cmd + '\n') })
  return {
    init: () => ask('isready'),
    // the best `n` moves for the side to move, score in cp from its view (mate ≈ ±10000)
    async top(fen, depth, n = 1) {
      infos = new Map()
      p.stdin.write(`ucinewgame\nsetoption name MultiPV value ${n}\nposition fen ${fen}\n`)
      await ask('go depth ' + depth)
      return [...infos.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
    },
    kill: () => p.kill(),
  }
}

const place = (fen) => fen.split(' ').slice(0, 4).join(' ')
const uciOf = (m) => m.from + m.to + (m.promotion ?? '')
function sanLine(fen, pv, n) {
  const c = new Chess(fen)
  const out = []
  for (const u of pv.slice(0, n)) {
    const no = c.moveNumber()
    const w = c.turn() === 'w'
    let m
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) } catch { break }
    out.push(w ? `${no}.${m.san}` : out.length ? m.san : `${no}...${m.san}`)
  }
  return out.join(' ')
}
// what the engine line wins, in plain words: the pieces each side captures along the line (up to 8 half-moves,
// longer while captures go on), equal captures cancel out – "wins a knight for a pawn"
// knights and bishops are both "a piece": a bishop for a knight is a trade, not a win
const CLASS = { p: 'p', n: 'm', b: 'm', r: 'r', q: 'q' }
const NAME = { p: 'pawn', m: 'piece', r: 'rook', q: 'queen' }
const CVAL = { p: 1, m: 3, r: 5, q: 9 }
function winsText(fen, pv, me) {
  const c = new Chess(fen)
  const got = [], lost = []
  for (const [i, u] of pv.entries()) {
    if (i >= 12) break
    let m
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) } catch { break }
    if (m.captured) (m.color === me ? got : lost).push(CLASS[m.captured])
    if (i >= 7 && !m.captured) break
  }
  if (c.isCheckmate() && c.turn() !== me) return 'and it ends in mate'
  for (const x of [...got]) {
    const k = lost.indexOf(x)
    if (k >= 0) { lost.splice(k, 1); got.splice(got.indexOf(x), 1) }
  }
  const val = (a) => a.reduce((t, x) => t + CVAL[x], 0)
  if (!got.length || val(got) <= val(lost)) return ''
  const words = (a) => {
    const n = {}
    for (const x of a) n[x] = (n[x] ?? 0) + 1
    return Object.entries(n).sort((x, y) => CVAL[y[0]] - CVAL[x[0]]).map(([x, k]) => (k === 1 ? `${x === 'q' ? 'the' : 'a'} ${NAME[x]}` : `${k} ${NAME[x]}s`)).join(' and ')
  }
  return `and wins ${words(got)}${lost.length ? ' for ' + words(lost) : ''}`
}

// how natural a mistake looks (the ones a club player really makes come first)
function natural(c, m) {
  let n = 0
  if (m.captured) n += 3
  if (m.san.includes('+')) n += 1
  if (m.piece === 'p') n += 2
  if ((m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8')) n += 3
  if (m.san.startsWith('O-O')) n += 3
  if (m.piece === 'k') n -= 5
  if (m.piece === 'q' && !m.captured) n -= 1
  return n
}

// the book of one opening: positions where you move, positions where the opponent moves
function book(name, side) {
  const lines = []
  for (const file of readdirSync('data').filter((f) => f.endsWith('.pgn')))
    for (const pgn of readFileSync('data/' + file, 'utf8').split(/\n(?=\[Event )/).filter((g) => g.trim())) {
      const c = new Chess()
      c.loadPgn(pgn)
      const h = c.getHeaders()
      if (h.Opening === name && (h.Side === 'Black' ? 'b' : 'w') === side) lines.push(c.history({ verbose: true }))
    }
  // the trunk all lines share: tasks start at its last opponent move
  let trunk = 0
  while (lines.every((l) => l[trunk] && l[trunk].san === lines[0][trunk].san)) trunk++
  const opp = new Map(), mine = new Map()
  for (const l of lines)
    l.forEach((m, ply) => {
      const k = place(m.before)
      const map = m.color === side ? mine : opp
      const e = map.get(k) ?? { fen: m.before, ply, path: l.slice(0, ply).map((x) => x.san), sans: new Set() }
      e.sans.add(m.san)
      map.set(k, e)
    })
  return { lines, trunk, opp, mine }
}

function pathText(sans, startPly = 0) {
  return sans.map((s, i) => ((startPly + i) % 2 === 0 ? `${Math.floor((startPly + i) / 2) + 1}.${s}` : s)).join(' ')
}

async function buildOpening(name, side, pool) {
  const b = book(name, side)
  const nodes = [...b.opp.values()].filter((n) => n.ply >= Math.max(0, b.trunk - 1) && n.ply <= 22)
  const tasks = []
  const seen = new Set()
  let next = 0
  await Promise.all(pool.map(async (e) => {
    while (next < nodes.length) {
      const node = nodes[next++]
      const c = new Chess(node.fen)
      const legal = c.moves({ verbose: true })
      const top = await e.top(node.fen, D_OPP, 6)
      if (!top.length) continue
      const oppBest = top[0].s
      // react: good moves outside your book
      const devs = top.filter((t) => t.s >= oppBest - REACT_WITHIN).map((t) => t.pv[0]).filter((u) => !legal.some((m) => uciOf(m) === u && node.sans.has(m.san))).slice(0, 3)
      const react = async (fen, oppUci, path, ply, deeper) => {
        const a = new Chess(fen)
        const om = a.move({ from: oppUci.slice(0, 2), to: oppUci.slice(2, 4), promotion: oppUci[4] })
        const after = a.fen()
        if (seen.has(place(after)) || b.mine.has(place(after)) || a.isGameOver()) return
        seen.add(place(after)) // claimed before the engine runs: the workers run side by side
        const mine = await e.top(after, D_ME, 3)
        if (!mine.length) return
        const best = mine[0]
        const alts = mine.slice(1).filter((t) => t.s >= best.s - ALT_WITHIN).map((t) => t.pv[0])
        const bestSan = new Chess(after).move({ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), promotion: best.pv[0][4] }).san
        const altSans = alts.map((u) => new Chess(after).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san)
        tasks.push({
          id: 'r:' + place(after),
          kind: 'react',
          fen,
          moves: [oppUci, best.pv[0]],
          ...(alts.length ? { alts } : {}),
          path: pathText([...path, om.san]),
          ply: ply + 1,
          why: `${om.san} is not in your book. Best: ${bestSan}${altSans.length ? ` (${altSans.join(' or ')} is fine too)` : ''}. The idea: ${sanLine(after, best.pv, 4)}.`,
        })
        // one step deeper on the main deviation: the opponent's best reply, then your answer again
        if (deeper && ply < 20) {
          const a2 = new Chess(after)
          const mm = a2.move({ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), promotion: best.pv[0][4] })
          const t2 = await e.top(a2.fen(), D_OPP, 1)
          if (t2.length) await react(a2.fen(), t2[0].pv[0], [...path, om.san, mm.san], ply + 2, false)
        }
      }
      for (const [k, u] of devs.entries()) await react(node.fen, u, node.path, node.ply, k === 0)
      // punish: the opponent's mistakes
      const cands = []
      for (const m of legal) {
        if (node.sans.has(m.san) || devs.includes(uciOf(m))) continue
        const a = new Chess(node.fen)
        a.move(m.san)
        if (a.isGameOver()) continue
        const q = await e.top(a.fen(), D_SCAN, 1)
        if (q.length && q[0].s >= -oppBest + MISTAKE) cands.push({ m, after: a.fen(), nat: natural(c, m) })
      }
      cands.sort((x, y) => y.nat - x.nat)
      let found = 0
      for (const cand of cands.slice(0, 6)) {
        if (found >= 2 || seen.has(place(cand.after)) || cand.nat < 0) continue
        seen.add(place(cand.after))
        const two = await e.top(cand.after, D_ME, 2)
        if (!two.length) continue
        const [s1, s2] = two
        if (s1.s < -oppBest + MISTAKE || s1.s < 180 || (s2 && s1.s - s2.s < UNIQUE && s2.s >= 80)) continue
        found++
        const bestSan = new Chess(cand.after).move({ from: s1.pv[0].slice(0, 2), to: s1.pv[0].slice(2, 4), promotion: s1.pv[0][4] }).san
        const wins = winsText(cand.after, s1.pv, side)
        tasks.push({
          id: 'p:' + place(cand.after),
          kind: 'punish',
          fen: node.fen,
          moves: [uciOf(cand.m), s1.pv[0]],
          path: pathText([...node.path, cand.m.san]),
          ply: node.ply + 1,
          why: `${cand.m.san}? is a mistake. ${bestSan}! punishes it${wins ? ' ' + wins : ''}. The idea: ${sanLine(cand.after, s1.pv, 4)}.`,
        })
      }
    }
  }))
  return tasks.sort((x, y) => x.ply - y.ply || x.id.localeCompare(y.id))
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// which openings: the Catalan, and every Black opening with at least 2 lines
const groups = new Map()
for (const file of readdirSync('data').filter((f) => f.endsWith('.pgn')))
  for (const pgn of readFileSync('data/' + file, 'utf8').split(/\n(?=\[Event )/).filter((g) => g.trim())) {
    const o = /\[Opening "([^"]+)"\]/.exec(pgn)?.[1]
    const side = /\[Side "Black"\]/.test(pgn) ? 'b' : 'w'
    if (o) groups.set(o + '|' + side, (groups.get(o + '|' + side) ?? 0) + 1)
  }
const wanted = process.argv.slice(2)
const todo = [...groups.entries()]
  .map(([k, n]) => ({ name: k.split('|')[0], side: k.split('|')[1], n }))
  .filter((g) => (wanted.length ? wanted.includes(g.name) : (g.name === 'Catalan' && g.side === 'w') || (g.side === 'b' && g.n >= 2)))

mkdirSync(OUT, { recursive: true })
const pool = Array.from({ length: PROCS }, () => engine())
await Promise.all(pool.map((e) => e.init()))
for (const g of todo) {
  const t0 = Date.now()
  const tasks = await buildOpening(g.name, g.side, pool)
  writeFileSync(`${OUT}/${slug(g.name)}-${g.side}.json`, JSON.stringify({ opening: g.name, side: g.side, tasks }) + '\n')
  console.log(`${g.name} [${g.side}]: ${tasks.filter((t) => t.kind === 'react').length} react, ${tasks.filter((t) => t.kind === 'punish').length} punish (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
pool.forEach((e) => e.kill())
