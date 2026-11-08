import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const S = 'e2e-shots/'
const b = await chromium.launch(); const errs = []
const ctx = await b.newContext({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5199/#/settings')
await p.evaluate(() => { localStorage.setItem('chess-trainer-name', 'Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'rome', beaten: ['kannauj','samarkand','rome'], coins: 300, got: ['kannauj/talk'], baseline: { at: 1, player: 'l0o2', games: 20, rating: 602, mistakes: 3.9, threats: 1.4 }, reports: 1, quests: { guard: 5 } })) })
await p.reload(); await p.waitForSelector('text=Start a fresh game')
await p.click('text=Start a fresh game'); await p.waitForTimeout(200)
await p.screenshot({ path: S + 'fresh.png' })
await p.click('text=Yes, start a fresh game')
await p.waitForSelector('.king-intro', { timeout: 15000 })
const k = await p.evaluate(() => JSON.parse(localStorage.getItem('chess-trainer-king')))
console.log('after reset:', JSON.stringify(k))
console.log('errors', errs); await b.close()
