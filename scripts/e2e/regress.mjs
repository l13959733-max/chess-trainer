import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const U=process.argv[2]
const b = await chromium.launch(); const errs=[]
const p = await (await b.newContext({ viewport:{width:393,height:873}, isMobile:true, hasTouch:true })).newPage(); p.on('pageerror',e=>errs.push(e.message))
await p.addInitScript(()=>{ localStorage.setItem('chess-trainer-name','Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({intro:true,here:'kannauj',beaten:[]})) })
const routes = [['path','.path-tabs'],['play','button'],['puzzles','.screen'],['threats','.screen'],['watch','.screen'],['settings','#fb-sound'],['daily','.screen'],['review','.screen'],['map','.screen'],['attacks','.attack-card'],['weaknesses','.screen'],['trophies','.screen'],['tent','.king-stations'],['king/kannauj','.king-banner'],['','.king-world'],['road','.road-node'],['world','.king-world'],['threat-check','.king-lesson']]
for (const [r,sel] of routes) { await p.goto(U+'#/'+r); try { await p.waitForSelector(sel,{timeout:15000}); console.log('ok  ', r) } catch { console.log('FEHLT', r) } }
// line from the old overview, back via Overview -> lands on the overview again
await p.goto(U+'#/path'); await p.waitForSelector('[data-line]'); const id = await p.locator('[data-line]').first().getAttribute('data-line')
await p.goto(U+'#/drill/'+id); await p.waitForSelector('.drill-status'); await p.click('.back'); await p.waitForTimeout(1200); console.log('Drill zurück ->', await p.evaluate(()=>location.hash))
console.log('JS-Fehler:', errs); await b.close()
