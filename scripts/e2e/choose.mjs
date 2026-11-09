import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const U = 'http://localhost:5199/'
const S = 'e2e-shots/'
const b = await chromium.launch(); const errs = []
const p = await (await b.newContext({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true })).newPage()
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { localStorage.setItem('chess-trainer-name', 'Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'kannauj', beaten: ['kannauj','samarkand','rome','baghdad','persia','north','valencia','palace','vienna','paris','london','forest','reykjavik','newyork','rio','orbit','edinburgh','mirror-gate'], coins: 0, got: [] })) })
await p.goto(U); await p.waitForSelector('.king-world')
await p.evaluate(async () => { window.K = await import('/src/lib/king.ts'); window.R = await import('/src/lib/repertoire.ts') })
for (const id of ['valencia', 'london', 'rio', 'mirror-gate', 'mirror-fortress']) {
  await p.goto(U + `#/king/${id}`); await p.waitForSelector('.king-banner')
  const step = await p.locator('text=How do you react?').count()
  await p.goto(U + `#/king/${id}/choose`); await p.waitForSelector('.king-question')
  let k = 0, wrongSeen = false
  for (; k < 10 && !(await p.locator('.done-title').count()); k++) {
    const q = await p.locator('.king-question').innerText()
    const r = await p.evaluate(([id, q]) => K.bookCrossroads(K.stationLines(K.stationById(id), R.builtinLines), 6).find((c) => q.includes(c.q)), [id, q])
    if (k === 0 && id === 'mirror-gate') await p.screenshot({ path: S + 'choose.png' })
    const bad = r.options.find((o) => !o.ok), good = r.options.find((o) => o.ok)
    if (k === 0) { await p.locator('.king-options button', { hasText: bad.san }).first().click(); wrongSeen = (await p.locator('.king-fb.no').innerText()).includes('Not your plan') }
    await p.locator('.king-options button', { hasText: good.san }).first().click()
    if (k === 0 && id === 'mirror-gate') await p.screenshot({ path: S + 'choose-ok.png' })
    await p.click('.king-fb.ok button')
  }
  console.log(id, '| step on station page:', step, '| rounds:', k, '| wrong msg ok:', wrongSeen, '|', await p.locator('.done-title').innerText())
}
console.log('errors', errs); await b.close()
