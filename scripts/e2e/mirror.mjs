import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const U = process.argv[2] || 'http://localhost:5199/'
const S = 'e2e-shots/'
const b = await chromium.launch(); const errs = []
const p = await (await b.newContext({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true })).newPage()
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { localStorage.setItem('chess-trainer-name', 'Lu'); if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'rome', beaten: ['kannauj', 'samarkand', 'rome'], coins: 200, got: [] })) } })
await p.goto(U); await p.waitForSelector('.king-world')
console.log('mirror on map:', await p.locator('.king-mirror').count())
await p.locator('.king-mirror').dispatchEvent('click')
await p.waitForSelector('.mirror-card'); await p.waitForTimeout(600)
await p.screenshot({ path: S + 'mirror-page.png', fullPage: true })
await p.evaluate(async () => { window.K = await import('/src/lib/king.ts'); window.R = await import('/src/lib/repertoire.ts') })
const sq = async (s) => { await p.locator(`[data-square="${s}"]`).click({ force: true }); await p.waitForTimeout(120) }
for (const id of ['mirror-gate', 'mirror-fortress', 'mirror-caro', 'mirror-paris', 'mirror-slav', 'mirror-kid', 'mirror-najdorf', 'mirror-dragon']) {
  await p.goto(U + '#/king/' + id); await p.waitForSelector('.king-banner')
  if (id === 'mirror-gate') { await p.waitForTimeout(1500); await p.screenshot({ path: S + 'mirror-station.png' }) }
  await p.goto(U + `#/king/${id}/boss`); await p.waitForSelector('.king-screen')
  for (let k = 0; k < 12; k++) {
    if (await p.locator('.done-title').count()) break
    await p.waitForSelector('[data-square]')
    const mv = await p.evaluate((id) => {
      const pieces = Object.fromEntries([...document.querySelectorAll('[data-square]')].map((s) => [s.dataset.square, s.querySelector('[data-piece]')?.dataset.piece]))
      const rows = []
      for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const pc = pieces[f + r]; if (!pc) { e++; continue } if (e) { row += e; e = 0 } row += pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase() } if (e) row += e; rows.push(row) }
      const place = rows.join('/')
      const lines = K.stationLines(K.stationById(id), R.builtinLines)
      for (const l of lines) for (const m of l.moves) if (m.color === 'b' && m.fenBefore.split(' ')[0] === place) return [m.from, m.to]
      return null
    }, id)
    if (!mv) throw new Error(id + ': no move found')
    if (k === 0 && id === 'mirror-gate') await p.screenshot({ path: S + 'mirror-boss.png' })
    await sq(mv[0]); await sq(mv[1])
    await p.waitForSelector('.king-fb.ok', { timeout: 4000 }); await p.click('.king-fb.ok button')
  }
  console.log(id, '→', await p.locator('.done-title').innerText(), '| next:', await p.locator('.done-actions .primary').innerText())
}
console.log('errors', errs); await b.close()
