import { useState } from 'react'
import { BottomBar } from '../components/BottomBar'
import { Mascot } from '../components/Mascot'
import { go } from '../hooks/useHashRoute'
import { STATIONS } from '../lib/king'
import { LESSONS, loadDiary, when, type DiaryEntry } from '../lib/lessons'

// Hoppy's diary (Lu, 15.11.: tap the diary on the start page): what Hoppy wrote down after every lesson, as notes in
// a travel book – grouped by city with the city's coin, newest first, "Practice again" leads back into the lesson.

const IMG = import.meta.env.BASE_URL + 'king/'

export function Diary() {
  const [now] = useState(() => Date.now())
  const [diary] = useState(loadDiary)
  // group by city, keeping the newest first
  const groups: { city: string; id?: string; entries: DiaryEntry[] }[] = []
  for (const e of [...diary].sort((a, b) => b.at - a.at)) {
    let g = groups.find((x) => x.city === e.city)
    if (!g) {
      const lesson = LESSONS[e.id as keyof typeof LESSONS]
      g = { city: e.city, id: lesson?.station ?? STATIONS.find((s) => s.name === e.city)?.id, entries: [] }
      groups.push(g)
    }
    g.entries.push(e)
  }
  return (
    <div className="dia">
      <div className="dia-scroll">
        <div className="dia-in">
          <header className="dia-head">
            <small>Hoppy’s</small>
            <h1>Diary</h1>
            <p>What we learned on the road</p>
          </header>

          {!diary.length && (
            <div className="dia-empty">
              <Mascot mood="happy" />
              <p>“A king is not born. He is made – <span>move by move.</span>”</p>
              <small>– Grandmaster Lu</small>
              <p className="dia-hint">After each lesson Hoppy writes down what we learned.</p>
            </div>
          )}

          {groups.map((g) => (
            <section key={g.city} className="dia-city">
              <h2>
                {g.id && <img src={`${IMG}stamp-${g.id}.jpg`} alt="" />}
                {g.city}
              </h2>
              {g.entries.map((e, i) => {
                const lesson = LESSONS[e.id as keyof typeof LESSONS]
                return (
                  <article key={e.id} className={`dia-note${i % 2 ? ' r' : ''}`}>
                    <small>{when(e.at, now)}</small>
                    <p>{e.text}</p>
                    {lesson && <button type="button" onClick={() => go(`king/${lesson.station}/${lesson.id}`)}>Practice again ›</button>}
                  </article>
                )
              })}
            </section>
          ))}

          {diary.length > 0 && <p className="dia-count">{diary.length} {diary.length === 1 ? 'page' : 'pages'} written · {groups.length} {groups.length === 1 ? 'city' : 'cities'}</p>}
        </div>
      </div>
      <BottomBar active={null} />
    </div>
  )
}
