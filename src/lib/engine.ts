// Stockfish 19 lite (single-threaded WASM) in a Web Worker, spoken to over UCI.
import type { PositionEval, Score } from './blunders'

type Job = { fen: string; depth: number; fresh: boolean; resolve: (e: PositionEval) => void; reject: (e: Error) => void }

let worker: Worker | null = null
let ready: Promise<void> | null = null
const queue: Job[] = []
let busy = false

function start(): Promise<void> {
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`)
    const onBoot = (e: MessageEvent<string>) => {
      if (e.data === 'readyok') {
        worker!.removeEventListener('message', onBoot)
        resolve()
      }
    }
    worker.addEventListener('message', onBoot)
    worker.onerror = (e) => reject(new Error('Stockfish could not start: ' + e.message))
    worker.postMessage('uci')
    worker.postMessage('isready')
  })
  return ready
}

function parseScore(line: string): Score | null {
  const m = line.match(/ score (cp|mate) (-?\d+)/)
  if (!m) return null
  return m[1] === 'cp' ? { cp: +m[2] } : { mate: +m[2] }
}

async function next() {
  if (busy || !queue.length) return
  busy = true
  const job = queue.shift()!
  try {
    await start()
    const w = worker!
    const result = await new Promise<PositionEval>((resolve) => {
      let score: Score = { cp: 0 }
      let pv: string[] = []
      const onMsg = (e: MessageEvent<string>) => {
        const line = e.data
        if (line.startsWith('info depth') && !line.includes(' lowerbound') && !line.includes(' upperbound')) {
          const s = parseScore(line)
          if (s) score = s
          const p = line.match(/ pv (.+)$/)
          if (p) pv = p[1].trim().split(/\s+/)
        } else if (line.startsWith('bestmove')) {
          w.removeEventListener('message', onMsg)
          const best = line.split(' ')[1]
          resolve({ score, best: best && best !== '(none)' ? best : undefined, pv })
        }
      }
      w.addEventListener('message', onMsg)
      // A cleared hash makes the result depend only on position and depth, so comparisons are repeatable
      if (job.fresh) w.postMessage('ucinewgame')
      w.postMessage('position fen ' + job.fen)
      w.postMessage('go depth ' + job.depth)
    })
    job.resolve(result)
  } catch (e) {
    job.reject(e instanceof Error ? e : new Error(String(e)))
  } finally {
    busy = false
    next()
  }
}

// Evaluate one position. Requests run one after another; `urgent` ones (puzzles) jump the queue
// and start from a cleared hash.
export function evaluate(fen: string, depth = 14, urgent = false): Promise<PositionEval> {
  return new Promise((resolve, reject) => {
    const job = { fen, depth, fresh: urgent, resolve, reject }
    if (urgent) queue.unshift(job)
    else queue.push(job)
    next()
  })
}

export function newGame() {
  worker?.postMessage('ucinewgame')
}
