import { useState } from 'react'
import { DuoBar } from '../components/DuoBar'
import { go } from '../hooks/useHashRoute'
import type { useProgress } from '../hooks/useProgress'
import type { Puzzle } from '../lib/db'
import { joinRoom, newRoomCode, othersDays, othersDrills, othersGames, othersOnline, useLive } from '../lib/live'
import { getName } from '../lib/profile'
import { dateKey } from '../lib/progress'
import { challengeLink, inviteLink, share, togetherStreak } from '../lib/together'
import { mineOf } from '../lib/trainingToday'

// #/together – learn chess with friends (Lu, 28.11.2026: "zusammen spielen und lernen – die App soll sich so spreaden,
// dass Freunde sie einander schicken"). PROTOTYPE in the preview: invite a friend (one link), see your friends – online,
// what they practise, whether they practised today – keep a streak together, challenge them with your own mistakes.
// The live part (watch each other, play for each other, practise a line together) stays at #/watch.
type Prog = ReturnType<typeof useProgress>


export function Together({ progress, puzzles, player }: { progress: Prog; puzzles: Puzzle[]; player: string }) {
  const live = useLive()
  const [note, setNote] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const today = dateKey(new Date(now))
  const myDates = [...progress.days.values()].filter((d) => d.lines + d.puzzles + (d.games ?? 0) + d.xp > 0).map((d) => d.date)
  const name = getName() ?? 'Your friend'

  // everyone in the group, by device: name, online, what they do, their days
  const people = new Map<string, { name: string; online: boolean; doing?: string; dates: string[] }>()
  for (const d of othersDays(live)) people.set(d.owner, { name: d.name, online: false, dates: d.dates })
  for (const p of othersOnline(live)) people.set(p.owner, { ...(people.get(p.owner) ?? { dates: [] }), name: p.name, online: true })
  for (const s of othersGames(live)) { const x = people.get(s.owner); if (x) x.doing = 'playing a game against Hoppy-Bot' }
  for (const d of othersDrills(live)) { const x = people.get(d.owner); if (x) x.doing = `practising ${d.title}` }
  const friends = [...people.entries()]

  const mistakes = mineOf(puzzles, player).sort((a, b) => b.endTime - a.endTime).slice(0, 3)
  async function invite() {
    const code = live.room ?? newRoomCode()
    if (!live.room) joinRoom(code)
    const r = await share(`Learn chess with me on Hoppy 🐴 – we keep a streak together and challenge each other. Join here:`, inviteLink(code))
    setNote(r === 'copied' ? 'Link copied – paste it into WhatsApp or a message.' : r === 'shared' ? 'Sent! As soon as your friend opens it, you see each other here.' : null)
  }
  async function challenge(p: Puzzle) {
    const url = challengeLink({ fen: p.fen, best: [p.best], played: p.played, from: name })
    const r = await share(`🤝 Can you find the better move? I played ${p.played} here…`, url)
    setNote(r === 'copied' ? 'Challenge link copied.' : r === 'shared' ? 'Challenge sent!' : null)
  }

  return (
    <div className="pn pn-page">
      <div className="pn-screen">
        <header className="pn-head">
          <button type="button" className="pn-back" onClick={() => window.history.back()} aria-label="Back">←</button>
          <h1>Together</h1>
          <span className="pn-pill">🔥 {progress.streak}</span>
        </header>
        <div className="pn-scroll">
          {!live.room ? (
            <div className="tg-hero">
              <span aria-hidden="true">👫</span>
              <b>Learn chess with a friend</b>
              <ul>
                <li>See when your friend practises – and what</li>
                <li>Keep a streak together: 🔥 the days you BOTH practised</li>
                <li>Challenge each other with the mistakes from your games</li>
                <li>Watch each other’s games live and help</li>
              </ul>
              <button type="button" className="tg-go" onClick={invite}>Invite a friend</button>
            </div>
          ) : (
            <>
              {friends.length === 0 ? (
                <div className="tg-wait">
                  <b>Waiting for your friend …</b>
                  <span>As soon as your friend opens the link, you see each other here.</span>
                  <button type="button" className="tg-go" onClick={invite}>Send the link again</button>
                </div>
              ) : (
                friends.map(([id, f]) => {
                  const streak = togetherStreak(myDates, f.dates, today)
                  const theyToday = f.dates.includes(today), meToday = myDates.includes(today)
                  return (
                    <div key={id} className="tg-friend">
                      <div className="tg-top">
                        <span className="tg-av">{f.name.slice(0, 1).toUpperCase()}<i className={f.online ? 'on' : ''} /></span>
                        <span className="tg-name"><b>{f.name}</b><small>{f.online ? f.doing ?? 'online now' : 'not online'}</small></span>
                        <span className="tg-streak"><b>🔥 {streak}</b><small>together</small></span>
                      </div>
                      <div className="tg-today">
                        <span className={meToday ? 'ok' : ''}>You {meToday ? '✓' : '…'}</span>
                        <span className={theyToday ? 'ok' : ''}>{f.name} {theyToday ? '✓' : '…'}</span>
                        <small>{meToday && theyToday ? 'Both practised today – the streak grows!' : meToday ? `Waiting for ${f.name} today` : 'Do your 5 minutes to keep it'}</small>
                      </div>
                      <div className="tg-act">
                        <button type="button" onClick={() => go('watch')}>👀 Watch & play</button>
                        {mistakes[0] && <button type="button" onClick={() => challenge(mistakes[0])}>🤝 Challenge</button>}
                      </div>
                    </div>
                  )
                })
              )}
              <button type="button" className="tg-more" onClick={invite}>＋ Invite another friend</button>
            </>
          )}
          {note && <p className="tg-note" role="status">{note}</p>}

          {mistakes.length > 0 && (
            <section className="tg-ch">
              <h2>Challenge a friend</h2>
              <p>Send one of your own mistakes – can they find the better move? Works without the app, right in the browser.</p>
              {mistakes.map((p) => (
                <button key={p.id} type="button" onClick={() => challenge(p)}>
                  <span><b>vs {p.opponent}</b><small>you played {p.played} · {new Date(p.endTime * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></span>
                  <i>SEND ↗</i>
                </button>
              ))}
            </section>
          )}
          <button type="button" className="tg-more" onClick={() => go('watch')}>👀 Live: watch and play for each other</button>
        </div>
      </div>
      <DuoBar active="home" />
    </div>
  )
}
