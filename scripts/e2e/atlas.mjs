import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const S = 'e2e-shots/'
const b = await chromium.launch(); const errs = []
const p = await (await b.newContext({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true })).newPage()
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { localStorage.setItem('chess-trainer-name', 'Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'kannauj', beaten: ['kannauj'], coins: 0, got: [] })) })
await p.goto('http://localhost:5199/#/tent'); await p.waitForSelector('text=Opening atlas')
await p.click('text=Opening atlas'); await p.waitForSelector('.atlas-entry')
await p.click('.atlas-entry:has-text("French Defense") .quest-row'); await p.waitForTimeout(300)
await p.screenshot({ path: S + 'atlas.png', fullPage: true })
console.log('entries', await p.locator('.atlas-entry').count(), '| soon', await p.locator('.atlas-entry.soon').count())
await p.click('.atlas-more button:has-text("Advance")'); await p.waitForTimeout(800)
console.log('opened', await p.evaluate(() => location.hash))
// back from the line lands in the atlas again
await p.evaluate(() => { location.hash = '#/' }); await p.waitForTimeout(800)
console.log('back to', await p.evaluate(() => location.hash))
console.log('errors', errs); await b.close()
