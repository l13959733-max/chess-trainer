// Copies the single-threaded lite Stockfish (WASM) into public/ so it is served as a static file.
// Single-threaded needs no special server headers, so it runs on GitHub Pages.
import { copyFileSync, mkdirSync } from 'node:fs'

const src = 'node_modules/stockfish/bin/'
mkdirSync('public/stockfish', { recursive: true })
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) copyFileSync(src + f, 'public/stockfish/' + f)
copyFileSync('node_modules/stockfish/Copying.txt', 'public/stockfish/COPYING.txt')
