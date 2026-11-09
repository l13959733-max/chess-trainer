import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const S = 'e2e-shots', U = process.argv[2] || 'http://localhost:5199/chess-trainer/'
const SHOTS = process.argv[3] !== 'noshots'
import { mkdirSync, readFileSync } from 'fs'
import { Chess } from 'chess.js'
const PZ = JSON.parse(readFileSync('src/data/lichess-puzzles.json', 'utf8'))
const ANSWER = new Map()
for (const list of Object.values(PZ)) for (const pz of list) {
  const c = new Chess(pz.fen)
  pz.moves.forEach((u, i) => { if (i % 2 === 1) ANSWER.set(c.fen().split(' ')[0], u); c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) })
}
mkdirSync(S, { recursive: true })
const b = await chromium.launch(); const errs = []
const p = await (await b.newContext({ viewport: { width: 393, height: 873 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage()
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 160)))
p.on('requestfailed', r => errs.push('failed: ' + r.url()))
p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url()))
await p.addInitScript(() => { localStorage.setItem('chess-trainer-name', 'Lu'); if (!localStorage.getItem('chess-trainer-king')) localStorage.setItem('chess-trainer-king', JSON.stringify({ intro: true, here: 'kannauj', beaten: [] })) })
await p.goto(U + '#/world'); await p.waitForSelector('.king-world', { timeout: 20000 })
const base = new URL(U).pathname
// the real data, straight from the source the app uses
await p.evaluate(async (base) => { window.K = await import(base + 'src/lib/king.ts'); window.R = await import(base + 'src/lib/repertoire.ts') }, base)
const shot = async (n) => { if (SHOTS) { await p.waitForTimeout(350); await p.screenshot({ path: `${S}/${n}.png` }) } }
const log = (...a) => console.log(...a)

async function answerQuiz(prefix) {
  for (let k = 0; k < 12; k++) {
    if (await p.locator('.done-title').count()) return
    const q = await p.locator('.king-question').innerText()
    const ans = await p.evaluate((q) => {
      const all = [...K.GRAIN, ...K.LEWIS, ...K.TURK, ...K.STATIONS.flatMap(s => s.boss.quiz ?? []), ...K.SAFE.slice().reverse()]
      const hit = all.find(x => q.includes(x.q))
      if (hit) return hit.answer
      const a = K.ARMY.find(a => q.includes(`What is the ${a.name} today?`))
      return a?.is
    }, q)
    if (!ans) throw new Error('no answer for ' + q)
    if (k === 0) await shot(prefix)
    await p.locator('.king-options button', { hasText: ans }).filter({ hasText: new RegExp('^' + ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click()
    await p.click('.king-fb.ok button')
  }
}

async function boardMove(id) {
  return p.evaluate((id) => {
    const pieces = Object.fromEntries([...document.querySelectorAll('[data-square]')].map(s => [s.dataset.square, s.querySelector('[data-piece]')?.dataset.piece]))
    const rows = []
    for (let r = 8; r >= 1; r--) {
      let row = '', e = 0
      for (const f of 'abcdefgh') {
        const pc = pieces[f + r]
        if (!pc) { e++; continue }
        if (e) { row += e; e = 0 }
        row += pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase()
      }
      if (e) row += e
      rows.push(row)
    }
    const place = rows.join('/')
    const rounds = [...K.FORKS, ...K.MATES, ...K.ROOK_MATES, ...K.QUEEN_TACTICS, ...K.LORD_FOG, ...K.GUARD, ...K.GUARD_BOSS, ...K.ROME_THREATS]
    const r = rounds.find(x => x.fen.split(' ')[0] === place)
    const st = K.stationById(id)?.lines
    if (r && (!['lines'].includes(K.stationById(id)?.boss.kind) || r.threat)) return [r.from, r.to]
    // the Grand Tour asks your Italian and your London (white lines), other stations their own chapter
    const want = (l) => id === 'chennai' ? l.side === 'w' && ['Italian Game', 'London System'].includes(l.opening) : st && l.side === st.side && [st.opening].flat().includes(l.opening)
    const ls = [...R.builtinLines].sort((a, b) => want(b) - want(a))
    for (const l of ls) for (const m of l.moves) if (m.color === l.side && m.fenBefore.split(' ')[0] === place) return [m.from, m.to]
    return null
  }, id)
}
const sq = async (s) => { await p.locator(`[data-square="${s}"]`).click({ force: true }); await p.waitForTimeout(120) }
async function playRounds(prefix, id) {
  for (let k = 0; k < 10; k++) {
    if (await p.locator('.done-title').count()) return
    await p.waitForSelector('[data-square]')
    const mv = await boardMove(id)
    if (!mv) throw new Error('no move found on board')
    if (k === 0) await shot(prefix)
    await sq(mv[0]); await sq(mv[1])
    await p.waitForSelector('.king-fb.ok', { timeout: 4000 })
    if (k === 0) await shot(prefix + '-hit')
    await p.click('.king-fb.ok button')
  }
}

async function solvePuzzles(prefix) {
  let n = 0
  for (let k = 0; k < 80; k++) {
    if (await p.locator('.done-title').count()) return
    if (await p.locator('.king-fb.ok button').count()) { await p.click('.king-fb.ok button'); await p.waitForTimeout(300); continue }
    await p.waitForTimeout(500)
    const pl = await p.evaluate(() => {
      const pieces = Object.fromEntries([...document.querySelectorAll('[data-square]')].map(s => [s.dataset.square, s.querySelector('[data-piece]')?.dataset.piece]))
      const rows = []; for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const pc = pieces[f + r]; if (!pc) { e++; continue } if (e) { row += e; e = 0 } row += pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase() } if (e) row += e; rows.push(row) }
      return rows.join('/')
    })
    const u = ANSWER.get(pl)
    if (!u) continue
    if (n++ === 0) await shot(prefix)
    await sq(u.slice(0, 2)); await sq(u.slice(2, 4)); await p.waitForTimeout(700)
  }
  throw new Error('puzzles not finished')
}

async function station(id) {
  await p.goto(U + '#/king/' + id); await p.waitForSelector('.king-banner', { timeout: 15000 })
  const s = await p.evaluate((id) => { const s = K.stationById(id); return { name: s.name, games: s.games.map(g => g.id), boss: s.boss.kind, bossName: s.boss.name } }, id)
  await shot(id + '-0-page')
  // the master talks
  await p.click('.king-master button:has-text("Talk")')
  await shot(id + '-1-talk-start')
  for (let k = 0; k < 12 && !(await p.locator('.king-talk ~ div button:has-text("Continue")').count()); k++) await p.click('.king-talk ~ div button')
  await shot(id + '-1-talk')
  await p.click('.king-talk ~ div button:has-text("Continue")'); await p.waitForTimeout(600)
  for (const g of s.games) {
    await p.goto(U + `#/king/${id}/${g}`); await p.waitForSelector('.king-screen')
    if (['grain', 'lewis', 'turk'].includes(g)) await answerQuiz(`${id}-2-${g}`)
    else if (['fork', 'guard', 'traps'].includes(g)) await playRounds(`${id}-2-${g}`, id)
    else if (['forkhunt', 'forkthreat', 'mate1', 'mate2'].includes(g)) await solvePuzzles(`${id}-2-${g}`)
    else if (g === 'safe') await answerQuiz(`${id}-2-${g}`)
    else if (g === 'react') {
      for (let k = 0; k < 12 && !(await p.locator('.done-title').count()); k++) {
        const ok = await p.evaluate((q) => K.ROME_REACT.find(c => q.includes(c.q))?.options.find(o => o.ok)?.san, await p.locator('.king-question').innerText())
        await p.locator('.king-options button', { hasText: ok }).first().click(); await p.click('.king-fb.ok button')
      }
    }
    else if (g === 'army') { await shot(`${id}-2-army`) }
    else if (g === 'riddle') {
      await shot(`${id}-2-riddle`)
      for (let k = 0; k < 2; k++) { await p.click('.king-options button:has-text("' + (k ? 'e5' : 'e7') + '")'); await p.click('button:has-text("Next")') }
    } else if (g === 'squares') {
      await shot(`${id}-2-squares`)
      for (let k = 0; k < 6; k++) {
        const t = await p.locator('.king-coord').innerText()
        await p.locator('.king-tap').nth((8 - Number(t[1])) * 8 + (t.charCodeAt(0) - 97)).click()
        if (k === 0) await shot(`${id}-2-squares-hit`)
        if (!(await p.locator('.king-fb.ok').count())) throw new Error('square wrong ' + t)
        await p.click('.king-fb button')
      }
    } else if (g === 'queen') { await shot(`${id}-2-queen`); await p.click('button:has-text("Awaken the queen")'); await shot(`${id}-2-queen-awake`) }
    else if (g === 'cross') {
      for (let k = 0; k < 3; k++) {
        const ok = await p.evaluate((q) => K.CROSSROADS.find(c => q.includes(c.q))?.options.find(o => o.ok)?.san, await p.locator('.king-question').innerText())
        if (k === 0) await shot(`${id}-2-cross`)
        await p.click(`.king-options button:has-text("${ok}")`); await p.click('.king-fb.ok button')
      }
    } else if (g === 'krk') {
      await shot(`${id}-2-krk`)
      // the machine has to answer every move
      for (const [f, t] of [['a1', 'a4'], ['e1', 'e2']]) {
        const before = await p.locator('[data-piece="bK"]').evaluate(e => e.closest('[data-square]').dataset.square)
        await sq(f); await sq(t); await p.waitForTimeout(900)
        const after = await p.locator('[data-piece="bK"]').evaluate(e => e.closest('[data-square]').dataset.square)
        log('  machine king', before, '->', after)
      }
      await shot(`${id}-2-krk-play`)
    } else if (g === 'shuffle') {
      await shot(`${id}-2-shuffle`)
      const f1 = await p.evaluate(() => [...document.querySelectorAll('[data-square$="1"] [data-piece]')].map(e => e.dataset.piece).join(''))
      await p.click('button:has-text("Shuffle")'); await p.waitForTimeout(300)
      const f2 = await p.evaluate(() => [...document.querySelectorAll('[data-square$="1"] [data-piece]')].map(e => e.dataset.piece).join(''))
      log('  960:', f1, '->', f2)
    }
    if (await p.locator('.done-title').count()) { log('  quest', g, '→', await p.locator('.done-title').innerText()); await shot(`${id}-3-${g}-done`) }
    else log('  quest', g, 'opened')
  }
  // the boss
  await p.goto(U + `#/king/${id}/boss`); await p.waitForSelector('.king-screen')
  const kind = s.boss
  if (['army', 'quiz'].includes(kind)) await answerQuiz(`${id}-4-boss`)
  else if (kind === 'puzzles') await solvePuzzles(`${id}-4-boss`)
  else if (kind === 'riddle') { await shot(`${id}-4-boss`); for (let k = 0; k < 2; k++) { await p.click('.king-options button:has-text("' + (k ? 'e5' : 'e7') + '")'); await p.click('button:has-text("Next")') } }
  else if (kind === 'cross') {
    for (let k = 0; k < 4; k++) {
      const ok = await p.evaluate((q) => K.CROSSROADS.find(c => q.includes(c.q))?.options.find(o => o.ok)?.san, await p.locator('.king-question').innerText())
      if (k === 0) await shot(`${id}-4-boss`)
      await p.click(`.king-options button:has-text("${ok}")`); await p.click('.king-fb.ok button')
    }
  } else if (kind === 'krk') {
    await shot(`${id}-4-boss`)
    log('  KRK boss: not played to mate by the script (random machine) – marking via storage')
    await p.evaluate((id) => { const k = JSON.parse(localStorage.getItem('chess-trainer-king')); k.beaten.push(id); localStorage.setItem('chess-trainer-king', JSON.stringify(k)) }, id)
    return
  } else await playRounds(`${id}-4-boss`, id)
  const t = await p.locator('.done-title').innerText()
  await shot(`${id}-5-victory`)
  log(`${s.name}: boss ${s.bossName} → ${t}`)
}

const ids = await p.evaluate(() => K.route())
const only = process.argv[4]?.split(',')
for (const id of ids) {
  if (only && !only.includes(id)) continue
  if (id === 'chennai') continue
  try { await station(id) } catch (e) { log('FAIL', id, e.message.split('\n')[0]); await p.screenshot({ path: `${S}/FAIL-${id}.png` }) }
}
// the map with everything beaten → Chennai opens
await p.goto(U + '#/world'); await p.waitForSelector('.king-world'); await p.evaluate(async (base) => { window.K = await import(base + 'src/lib/king.ts'); window.R = await import(base + 'src/lib/repertoire.ts') }, base); await shot('map-all')
log('HUD:', await p.locator('.king-bubble').innerText())
if (!only) {
  try { await station('chennai') } catch (e) { log('FAIL chennai', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/FAIL-chennai.png` }) }
  await p.goto(U + '#/world'); await p.waitForSelector('.king-world'); await shot('map-crowned'); log('HUD:', await p.locator('.king-bubble').innerText())
}
log('page width', await p.evaluate(() => document.documentElement.scrollWidth))
log('errors:', [...new Set(errs)])
await b.close()
