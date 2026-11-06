// Fills src/lib/opening-stats.json with real game results from the Lichess opening explorer:
// for every move the learner can choose in the built-in lines (first 8 plies), how often White won,
// drew and lost in rated blitz/rapid/classical games of club players.
// The explorer needs a Lichess token (free, no permissions): https://lichess.org/account/oauth/token/create
// Usage: LICHESS_TOKEN=lip_… node scripts/fetch-opening-stats.mjs   (or put the token in ~/.config/hoppy/lichess-token)
// The token is never written anywhere.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { Chess } from 'chess.js'

const RATINGS = process.env.RATINGS ?? '1000,1200' // Lichess rating groups: 1000 = 1000–1199, 1200 = 1200–1399
const SPEEDS = 'blitz,rapid,classical'
const MAX_PLY = 8
const OUT = 'src/lib/opening-stats.json'

let token = process.env.LICHESS_TOKEN
if (!token) {
  try {
    token = readFileSync(homedir() + '/.config/hoppy/lichess-token', 'utf8').trim()
  } catch {
    console.error('No token: set LICHESS_TOKEN or write it to ~/.config/hoppy/lichess-token')
    process.exit(1)
  }
}

// Every position right after a learner's move, as SAN path (the key the app uses) and UCI moves (for the explorer)
const wanted = new Map()
for (const file of readdirSync('data').filter((f) => f.endsWith('.pgn'))) {
  for (const pgn of readFileSync('data/' + file, 'utf8').split(/\n(?=\[Event )/).filter((g) => g.trim())) {
    const c = new Chess()
    c.loadPgn(pgn)
    const side = c.getHeaders().Side === 'Black' ? 'b' : 'w'
    const moves = c.history({ verbose: true })
    for (let i = 0; i < Math.min(moves.length, MAX_PLY); i++) {
      if (moves[i].color !== side) continue
      const path = moves.slice(0, i + 1)
      wanted.set(path.map((m) => m.san).join(' '), path.map((m) => m.from + m.to + (m.promotion ?? '')).join(','))
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const positions = {}
let total = 0
console.log(`${wanted.size} positions …`)
for (const [key, play] of wanted) {
  const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=${SPEEDS}&ratings=${RATINGS}&moves=0&topGames=0&recentGames=0&play=${play}`
  for (;;) {
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    if (res.status === 429) {
      console.log('rate limit – waiting a minute')
      await sleep(61_000)
      continue
    }
    if (!res.ok) {
      console.error(res.status, await res.text())
      process.exit(1)
    }
    const d = await res.json()
    positions[key] = { white: d.white, draws: d.draws, black: d.black }
    total += d.white + d.draws + d.black
    break
  }
  await sleep(1100)
}

const groups = RATINGS.split(',').map(Number).sort((a, b) => a - b)
const range = `${groups[0]}–${groups[groups.length - 1] + 199}`
const info = `Percentages: rated Lichess games (blitz, rapid, classical) of players rated ${range}, loaded ${new Date().toISOString().slice(0, 10)}.`
writeFileSync(OUT, JSON.stringify({ info, positions }, null, 1) + '\n')
console.log(`Saved ${Object.keys(positions).length} positions (${total.toLocaleString('en')} game results) to ${OUT}`)
