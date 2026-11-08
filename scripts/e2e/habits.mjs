import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const U = process.argv[2] || 'http://localhost:5199/'
const S = 'e2e-shots/'
const b = await chromium.launch(); const errs = []
const p = await (await b.newContext({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true })).newPage()
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { localStorage.setItem('chess-trainer-name', 'Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'kannauj', beaten: ['kannauj'], coins: 0, got: [], baseline: { at: 1, player: 'l0o2', games: 20, rating: 602, mistakes: 3.9, threats: 1.4 } })) })
await p.goto(U + '#/tent'); await p.waitForSelector('text=Your habits')
await p.click('text=Your habits')
await p.waitForSelector('.king-question', { timeout: 60000 })
await p.waitForTimeout(500)
await p.screenshot({ path: S + 'habits.png' })
const qs = []
for (let k = 0; k < 10 && !(await p.locator('.done-title').count()); k++) {
  const q = await p.locator('.king-question').innerText()
  qs.push(q)
  // first the habit (wrong), then each option until right
  const opts = await p.locator('.king-options button').all()
  for (const o of opts) {
    await o.click()
    if (await p.locator('.king-fb.ok').count()) break
  }
  if (k === 0) await p.screenshot({ path: S + 'habits-ok.png' })
  await p.click('.king-fb.ok button')
}
console.log(qs.join('\n'))
console.log('end:', await p.locator('.done-title').innerText())
console.log('errors', errs); await b.close()
