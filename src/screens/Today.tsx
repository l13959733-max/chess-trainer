import { useMemo, useState } from 'react'
import { BottomBar } from '../components/BottomBar'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { Puzzles } from '../hooks/usePuzzles'
import type { useRepertoire } from '../hooks/useRepertoire'
import { dateKey } from '../lib/progress'
import { isDue } from '../lib/srs'
import { dayNumber, loadResults } from '../lib/threatcheck'
import { pathProgress, pickOfDay } from '../lib/trainingToday'
import { dailyBoard } from '../lib/dailyBoard'
import { hasOwnPlayer } from '../lib/chesscom'
import { loadKing } from '../lib/king'
import { clampScore } from '../lib/blunders'
import '../training.css'

// Daily (Lu, 15.11.: tap "Daily" on the start page → today's training, "ohne den Nutzer zu erschlagen, optisch Spaß"):
// your week as seven flames, then only what is for today – the threat check, today's path, what is due, a quick game.
// Everything else stays one tap away in Training.
// 25.11.2026 (Lu: "die alte Daily-Seite fand ich sehr cool – das ganze Training in das Daily-Design, Training als
// Unterpunkt"): Daily is the training home and a tab of the bottom bar. Today's path (#/tent) opens from the ring,
// every other trainer is below under "All training", the places of the world under "More".

type Prog = ReturnType<typeof useProgress>

function rushBest(key = 'hoppy-rush-best'): number {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '0') || 0
  } catch {
    return 0
  }
}

export function Today({ rep, progress, puzzles }: { rep: ReturnType<typeof useRepertoire>; progress: Prog; puzzles: Puzzles }) {
  const [now] = useState(() => Date.now())
  const day = dayNumber()
  const board = useMemo(() => dailyBoard(day), [day])
  const result = loadResults()[day]
  const [path] = useState(pathProgress)
  const [best] = useState(() => rushBest())
  const [pBest] = useState(() => rushBest('hoppy-prush-best'))
  const linesDue = rep.lines.filter((l) => isDue(rep.srs.get(l.id), now)).length
  const mistakes = puzzles.due.length + puzzles.fresh.length
  const own = hasOwnPlayer()
  const winning = useMemo(() => puzzles.puzzles.filter((p) => clampScore(p.scoreBefore) >= 300), [puzzles.puzzles])

  // Monday … Sunday of this week: active days burn
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i)
    const a = progress.days.get(dateKey(d))
    const active = !!a && a.lines + a.puzzles + (a.games ?? 0) + a.xp > 0
    return { label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), xp: a?.xp ?? 0, active, today: dateKey(d) === dateKey(new Date(now)), future: d.getTime() > now }
  })
  const weekXp = week.reduce((s, d) => s + d.xp, 0)
  const ring = path && path.total ? path.done / path.total : 0
  const C = 2 * Math.PI * 30

  return (
    <div className="trn dly">
      <div className="trn-scroll">
        <div className="trn-in">
          <header className="trn-head">
            <div className="grow">
              <h1>Daily</h1>
              <p>Day {day} · just for today</p>
            </div>
            <span className="trn-pill fire" title="Days in a row">🔥 {progress.streak}</span>
          </header>

          <div className="trn-card dly-week" aria-label={`This week: ${week.filter((d) => d.active).length} active days, ${weekXp} XP`}>
            <div className="dly-days">
              {week.map((d, i) => (
                <span key={i} className={`dly-day${d.active ? ' on' : ''}${d.today ? ' today' : ''}${d.future ? ' future' : ''}`}>
                  <i aria-hidden="true">{d.active ? '🔥' : ''}</i>
                  <small>{d.label}</small>
                </span>
              ))}
            </div>
            <div className="dly-weekxp"><b>{weekXp.toLocaleString('en')}</b> XP this week</div>
          </div>

          <button type="button" className="dly-threat" onClick={() => go('threat-check')}>
            <span className="dly-mini" aria-hidden="true">
              {board.cells.map((c) => <i key={c.key} className={`${c.dark ? 'd' : 'l'}${c.glyph ? (c.white ? ' w' : ' b') : ''}`}>{c.glyph}</i>)}
            </span>
            <span className="dly-threat-tx">
              <small>🎯 Daily Threat Check</small>
              <b>{result ? (result.ok ? 'Solved today!' : 'Missed today') : `What does ${board.them} threaten?`}</b>
              <span className={`dly-btn${result ? ' ghost' : ''}`}>{result ? 'Share →' : 'Solve'}</span>
            </span>
          </button>

          <button type="button" className="dly-path" onClick={() => go('tent')}>
            <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--green-t)" strokeWidth="10" />
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--green)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} transform="rotate(-90 36 36)" />
              <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="900" fill="var(--text)">{path ? `${path.done}/${path.total}` : '0'}</text>
            </svg>
            <span className="dly-path-tx">
              <small>Today’s path</small>
              <b>{!path ? 'Ready when you are' : path.done >= path.total ? 'All done – well played!' : `${path.total - path.done} levels left`}</b>
              {path && path.maxStars > 0 && <span className="dly-stars">★ {path.stars} / {path.maxStars}</span>}
            </span>
            <span className="dly-btn">{!path || path.done === 0 ? 'Start' : path.done >= path.total ? 'Again' : 'Go'}</span>
          </button>

          <div className="trn-sec"><h2>Due today</h2></div>
          <div className="dly-due">
            <button type="button" className="jr-tile t-green" onClick={() => go('review')}>
              <span className="e">🗺</span><b>{linesDue}</b><small>{linesDue === 1 ? 'line' : 'lines'} to repeat</small>
            </button>
            <button type="button" className="jr-tile t-red" onClick={() => go('puzzles')}>
              <span className="e">🩹</span><b>{mistakes}</b><small>{mistakes === 1 ? 'mistake' : 'mistakes'} from your games</small>
            </button>
          </div>

          {/* Lu, 25.11.: no sub menus – every trainer sits right here, in the tiles of the Daily page */}
          <div className="trn-sec"><h2>Play & tactics</h2></div>
          <div className="dly-quick">
            <button type="button" onClick={() => go('rush')}><span className="e">💥</span><b>Square Rush</b><small>{best ? `Best ${best}` : '60 seconds'}</small></button>
            <button type="button" onClick={() => go('puzzle-rush')}><span className="e">⏱</span><b>Puzzle Rush</b><small>{pBest ? `Best ${pBest}` : '3 minutes'}</small></button>
            <button type="button" onClick={() => go('play')}><span className="e">🐴</span><b>Hoppy-Bot</b><small>A game</small></button>
            <button type="button" onClick={() => go('warmup')}><span className="e">🔥</span><b>Warm-up</b><small>2 min</small></button>
            <button type="button" onClick={() => go('armoury')}><span className="e">🛡</span><b>Armoury</b><small>Tactics to endgame</small></button>
            <button type="button" onClick={() => go('threats')}><span className="e">🗼</span><b>Watchtower</b><small>Check the threat</small></button>
          </div>

          <div className="trn-sec"><h2>Your openings</h2></div>
          <div className="dly-quick">
            <button type="button" onClick={() => go('opening-rush')}><span className="e">⚡</span><b>Opening Rush</b><small>On time</small></button>
            <button type="button" onClick={() => go('black-course')}><span className="e">♚</span><b>Black training</b><small>1...d5</small></button>
            <button type="button" onClick={() => go('black')}><span className="e">🎛</span><b>Black system</b><small>Pick one</small></button>
            <button type="button" onClick={() => go('path')}><span className="e">🪙</span><b>All openings</b><small>Every line</small></button>
            <button type="button" onClick={() => go('map')}><span className="e">🗺</span><b>What when?</b><small>Their replies</small></button>
            <button type="button" onClick={() => go('atlas')}><span className="e">🧭</span><b>Atlas</b><small>New weapons</small></button>
            <button type="button" onClick={() => go('attacks')}><span className="e">🪤</span><b>Attacks</b><small>And traps</small></button>
            <button type="button" onClick={() => go('habits')}><span className="e">🔁</span><b>Your habits</b><small>Leaving book</small></button>
            <button type="button" onClick={() => go('daily')}><span className="e">🃏</span><b>Cards</b><small>All due, mixed</small></button>
          </div>

          <div className="trn-sec"><h2>Your games</h2></div>
          <div className="dly-quick">
            <button type="button" onClick={() => go(own ? 'games' : 'connect')}><span className="e">♟</span><b>chess.com</b><small>{own ? 'Your games' : 'Connect'}</small></button>
            <button type="button" onClick={() => go('weaknesses')}><span className="e">🧩</span><b>Weaknesses</b><small>Train them</small></button>
            <button type="button" disabled={!winning.length} onClick={() => go('play/puzzle/' + encodeURIComponent(pickOfDay(winning)!.id))}><span className="e">💰</span><b>Treasure</b><small>{winning.length ? 'Win it again' : 'From your games'}</small></button>
          </div>

          <div className="trn-sec"><h2>More</h2></div>
          <div className="dly-quick">
            <button type="button" onClick={() => go('quests')}><span className="e">📖</span><b>Quest book</b><small>Your quests</small></button>
            <button type="button" onClick={() => go(loadKing().beaten.includes('kannauj') ? 'portal' : 'check')}><span className="e">🌀</span><b>Real world</b><small>chess.com</small></button>
            <button type="button" onClick={() => go('painted')}><span className="e">🎨</span><b>Painted map</b><small>The world</small></button>
            <button type="button" onClick={() => go('mirror')}><span className="e">🪞</span><b>Mirror</b><small>Act 2 · Black</small></button>
            <button type="button" onClick={() => go('watch')}><span className="e">👫</span><b>Together</b><small>Watch & help</small></button>
            <button type="button" onClick={() => go('settings')}><span className="e">⚙️</span><b>Settings</b><small>Sound, look</small></button>
          </div>
        </div>
      </div>
      <BottomBar active="daily" />
    </div>
  )
}
