// After a quest: tap "Continue" like Lu does (not goto) and check the app keeps answering.
// Second argument: chromium (default) or webkit (iPhone engine, `npx playwright install webkit`)
import { createRequire } from 'module'
const req = createRequire(import.meta.url)
const pw = req('playwright')
const ENGINE = process.argv[3] || 'chromium'
import { mkdirSync, readFileSync } from 'fs'
const { Chess } = req('chess.js')
const S = 'e2e-shots', U = process.argv[2] || 'http://localhost:5199/'
mkdirSync(S, { recursive: true })
const PZ = JSON.parse(readFileSync('src/data/lichess-puzzles.json', 'utf8'))
const ANSWER = new Map()
for (const list of Object.values(PZ)) for (const pz of list) {
  const c = new Chess(pz.fen)
  pz.moves.forEach((u, i) => { if (i % 2 === 1) ANSWER.set(c.fen().split(' ')[0], u); c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) })
}
const b = await pw[ENGINE].launch(); const errs = []
const p = await (await b.newContext(ENGINE === 'webkit' ? { ...pw.devices['iPhone 15'] } : { viewport: { width: 393, height: 873 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage()
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 200)))
let hashes = 0
await p.exposeFunction('__hash', () => hashes++)
await p.addInitScript(() => {
  localStorage.setItem('chess-trainer-name', 'Lu')
  localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'samarkand', beaten: ['kannauj'], got: [], coins: 0 }))
  window.addEventListener('hashchange', () => window.__hash())
})
await p.goto(U + '#/king/samarkand/forkhunt'); await p.waitForSelector('[data-square]', { timeout: 20000 })
const sq = async (s) => { await p.locator(`[data-square="${s}"]`).click({ force: true }); await p.waitForTimeout(120) }
for (let k = 0; k < 80; k++) {
  if (await p.locator('.done-title').count()) break
  if (await p.locator('.king-fb.ok button').count()) { await p.click('.king-fb.ok button'); await p.waitForTimeout(300); continue }
  await p.waitForTimeout(500)
  const pl = await p.evaluate(() => {
    const pieces = Object.fromEntries([...document.querySelectorAll('[data-square]')].map(s => [s.dataset.square, s.querySelector('[data-piece]')?.dataset.piece]))
    const rows = []; for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const pc = pieces[f + r]; if (!pc) { e++; continue } if (e) { row += e; e = 0 } row += pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase() } if (e) row += e; rows.push(row) }
    return rows.join('/')
  })
  const u = ANSWER.get(pl); if (u) { await sq(u.slice(0, 2)); await sq(u.slice(2, 4)); await p.waitForTimeout(700) }
}
console.log('done:', await p.locator('.done-title').innerText())
await p.screenshot({ path: `${S}/${ENGINE}-continue-1-done.png` })
hashes = 0
await p.click('button:has-text("Continue")')
const t0 = Date.now()
await p.waitForTimeout(3000)
console.log('after Continue:', p.url(), '· hash changes in 3 s:', hashes)
const alive = await Promise.race([p.evaluate(() => document.body.innerText.slice(0, 200)), new Promise(r => setTimeout(() => r('NO ANSWER (main thread blocked)'), 5000))])
console.log('page:', JSON.stringify(alive), Date.now() - t0, 'ms')
await p.screenshot({ path: `${S}/${ENGINE}-continue-2-after.png` }).catch(e => console.log('screenshot failed', e.message))

// The boss while your chess.com games are analysed in the background: the app redraws on every
// analysed move, and the boss must keep its task (before the fix it dealt a new one each time)
await p.goto(U + '#/king/samarkand/boss'); await p.waitForSelector('[data-square]')
await p.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/lib/analyzer.ts'))
  const A = await import(url) // the app's own module instance (Vite adds ?t=…)
  const pgn = '[White "l0o2"]\n[Black "x"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6 *'
  const game = (k) => ({ uuid: 'redraw-' + k, url: '', pgn, end_time: 1, time_class: 'rapid', rules: 'chess', rated: true, white: { username: 'l0o2', result: 'win', rating: 600 }, black: { username: 'x', result: 'lose', rating: 600 } })
  A.analyzeOnly([0, 1, 2, 3, 4, 5].map(game))
})
const seen = []
for (let k = 0; k < 15; k++) { seen.push(await p.evaluate(() => [...document.querySelectorAll('[data-square]')].map((s) => s.querySelector('[data-piece]')?.dataset.piece ?? '.').join(''))); await p.waitForTimeout(300) }
const boards = new Set(seen).size
console.log('boss boards in 4.5 s while analysing:', boards, boards <= 2 ? 'OK' : 'FAIL – the task keeps changing')
for (let k = 0; k < 80; k++) {
  if (await p.locator('.done-title').count()) break
  if (await p.locator('.king-fb.ok button').count()) { await p.click('.king-fb.ok button'); await p.waitForTimeout(300); continue }
  await p.waitForTimeout(500)
  const pl = await p.evaluate(() => {
    const pieces = Object.fromEntries([...document.querySelectorAll('[data-square]')].map(s => [s.dataset.square, s.querySelector('[data-piece]')?.dataset.piece]))
    const rows = []; for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const pc = pieces[f + r]; if (!pc) { e++; continue } if (e) { row += e; e = 0 } row += pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase() } if (e) row += e; rows.push(row) }
    return rows.join('/')
  })
  const u = ANSWER.get(pl); if (u) { await sq(u.slice(0, 2)); await sq(u.slice(2, 4)); await p.waitForTimeout(700) }
}
console.log('boss:', await p.locator('.done-title').innerText().catch(() => 'NOT FINISHED'))
await p.screenshot({ path: `${S}/${ENGINE}-continue-3-boss.png` })
console.log('errors:', errs.slice(0, 5))
await b.close()
