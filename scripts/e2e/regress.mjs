import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const U=process.argv[2]
const b = await chromium.launch(); const errs=[]
const p = await (await b.newContext({ viewport:{width:393,height:873}, isMobile:true, hasTouch:true })).newPage(); p.on('pageerror',e=>errs.push(e.message))
await p.addInitScript(()=>{ localStorage.setItem('chess-trainer-name','Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({intro:true,here:'kannauj',beaten:[]})) })
const routes = [['path','.path-tabs'],['play','button'],['puzzles','.screen'],['threats','.screen'],['watch','.screen'],['settings','#fb-sound'],['daily','.screen'],['review','.screen'],['map','.screen'],['attacks','.attack-card'],['weaknesses','.screen'],['trophies','.screen'],['tent','.trn-path'],['camp','.king-stations'],['games','.trn-hd'],['connect','#trn-ccname'],['king/kannauj','.bp-cover, .bp-tech'],['','.hub-hero'],['journey','.rm-coin'],['painted','.explore-scroll svg'],['rush','.rush-board'],['road','.road-node'],['world','.king-world'],['threat-check','.king-lesson']]
for (const [r,sel] of routes) { await p.goto(U+'#/'+r); try { await p.waitForSelector(sel,{timeout:15000}); console.log('ok  ', r) } catch { console.log('FEHLT', r) } }
// look check in a fresh tab (13.11.: lazy pages once took the start page's styles with them): the start page and
// Training must have their own look before any game page was opened
{ const q = await (await b.newContext({ viewport:{width:393,height:873}, isMobile:true, hasTouch:true })).newPage()
  await q.addInitScript(()=>{ localStorage.setItem('chess-trainer-name','Lu'); localStorage.setItem('chess-trainer-king', JSON.stringify({intro:true,here:'kannauj',beaten:[]})) })
  for (const [r, sel, prop, want] of [['', '.hub', 'position', 'fixed'], ['tent', '.trn', 'position', 'fixed'], ['tent', '.hub-bar', 'display', 'grid']]) {
    await q.goto(U + '#/' + r); await q.waitForSelector(sel, { timeout: 15000 })
    const got = await q.evaluate(([s, pr]) => getComputedStyle(document.querySelector(s))[pr], [sel, prop])
    console.log(got === want ? 'ok   look' : 'FEHLT look', r || 'start', sel, prop, got)
    await q.context().clearCookies()
  }
}
// line from the old overview, back via Overview -> lands on the overview again
await p.goto(U+'#/path'); await p.waitForSelector('[data-line]'); const id = await p.locator('[data-line]').first().getAttribute('data-line')
await p.goto(U+'#/drill/'+id); await p.waitForSelector('.drill-status'); await p.click('.back'); await p.waitForTimeout(1200); console.log('Drill zurück ->', await p.evaluate(()=>location.hash))
console.log('JS-Fehler:', errs); await b.close()
