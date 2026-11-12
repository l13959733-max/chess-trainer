import { useEffect, useRef, type CSSProperties } from 'react'
import { BottomBar } from '../components/BottomBar'
import { go } from '../hooks/useHashRoute'
import type { Chapter } from '../lib/cityBook'
import type { Station } from '../lib/king'
import type { Line } from '../lib/pgn'

// A city as a book chapter (Lu, 12.11.: "Stadt öffnen → erst die Geschichte im Buch-Design → von da ins Üben").
// Lu, 12.11. night: cover → the story runs first → then the introduction to the techniques with the table of contents.
// Coming back from an exercise, the chapter opens at the techniques (the story is already read).
// Every entry opens one exercise; when it is done you come back here (one level up, never across).

const IMG = import.meta.env.BASE_URL + 'king/'
function roman(n: number): string {
  const v: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [k, r] of v)
    while (n >= k) {
      out += r
      n -= k
    }
  return out
}

export interface BookStep {
  key: string
  title: string
  route: string
  done: boolean
}

function group(lines: Line[]): [string, Line[]][] {
  const m = new Map<string, Line[]>()
  for (const l of lines) {
    const k = l.opening ?? 'Lines'
    m.set(k, [...(m.get(k) ?? []), l])
  }
  return [...m]
}
const short = (title: string, opening: string) => {
  const p = opening + ': '
  const first = opening.split(' ')[0] + ': '
  const t = title.startsWith(p) ? title.slice(p.length) : title.startsWith(first) ? title.slice(first.length) : title
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function CityBook({
  s,
  ch,
  chapterNo,
  steps,
  white,
  black,
  blackFrom,
  known,
  extras,
  onStoryRead,
}: {
  s: Station
  ch: Chapter
  chapterNo: number
  steps: BookStep[]
  white: Line[]
  black: Line[]
  blackFrom?: string
  known: (id: string) => boolean
  extras: { id: string; title: string; done: boolean }[]
  onStoryRead: () => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLElement>(null)
  const chapRef = useRef<HTMLElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const storyDone = steps.find((x) => x.key === 'talk')?.done ?? false
  const next = steps.find((x) => !x.done && x.key !== 'talk')
  const games = steps.filter((x) => x.key !== 'talk' && x.key !== 'boss' && x.key !== 'choose' && !x.key.startsWith('line:'))
  const choose = steps.find((x) => x.key === 'choose')
  const boss = steps.find((x) => x.key === 'boss')!
  const lineRoute = (l: Line) => (known(l.id) ? 'drill/' : 'learn/') + l.id
  let n = 0
  const no = () => roman(++n)
  const scrollTo = (el: HTMLElement | null, smooth = true) => {
    const sc = scroller.current
    if (sc && el) sc.scrollTo({ top: el.offsetTop, behavior: smooth ? 'smooth' : 'auto' })
  }

  // back from an exercise: open at the techniques, the story is already read
  const first = useRef(storyDone)
  useEffect(() => {
    if (first.current) scrollTo(chapRef.current, false)
  }, [])
  // reaching the end of the story counts as the first step (it was "Meet the master" before)
  useEffect(() => {
    const el = endRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        onStoryRead()
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [onStoryRead])

  const cover = IMG + 'book/' + (ch.cover ?? `${s.id}.jpg`)
  const vars = { '--house': ch.region.color, '--accent': ch.region.accent } as CSSProperties
  const nextLabel = next ? `${steps.some((x) => x.done && x.key !== 'talk') ? 'Continue' : 'Start'}: ${next.title}` : 'Back to the world map'
  const goNext = () => (next ? go(next.route) : go('journey'))

  return (
    <div className="book" style={vars}>
      <div className="book-scroll" ref={scroller}>
        <section className="book-cover" aria-label="Cover">
          <div className="book-top">
            <button type="button" className="book-back" onClick={() => go('journey')} aria-label="Back to the world map">
              <svg width="24" height="16" viewBox="0 0 26 16" aria-hidden="true"><path d="M24 8H3M9 2L3 8l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="book-no">Chapter {chapterNo}</span>
          </div>
          <h1>{s.name}, {s.year}</h1>
          <p className="book-sub">{ch.subtitle}</p>
          <div className="book-art"><img src={cover} alt="" /></div>
        </section>

        <section className="book-tale" ref={storyRef} aria-label={`The story of ${s.name}`}>
          {ch.storyImg && <img className="book-tale-img" src={IMG + 'book/' + ch.storyImg} alt="" />}
          <div className="book-tale-in">
            <p className="book-from">The story</p>
            <div className="book-story">
              {ch.story.map((p, i) => <p key={i}>{p}</p>)}
              {ch.board?.map((p, i) => (
                <p key={'b' + i} className="aside"><b>On the board</b>{p}</p>
              ))}
            </div>
            <div ref={endRef} />
            <button type="button" className="book-on" onClick={() => scrollTo(chapRef.current)}>To the techniques ↓</button>
          </div>
        </section>

        <section className="book-chap" ref={chapRef} aria-label="Chapter">
          <p className="book-eyebrow">Chapter {chapterNo} · {ch.region.name}</p>
          <h2>{ch.headline}</h2>
          <p className="book-body">{s.intro}</p>
          <ul className="book-skills" aria-label="What you learn here">
            {s.skills.map((k) => <li key={k}>{k}</li>)}
          </ul>
          <button type="button" className="book-go" onClick={goNext}>{nextLabel}</button>

          <h3>Table of content</h3>
          <ol className="book-toc">
            <li className={storyDone ? 'is-done' : ''}>
              <button type="button" onClick={() => scrollTo(storyRef.current)}>
                <span className="n">{no()}</span>
                <span className="t">The story<small>{ch.subtitle}</small></span>
                <span className="s">{storyDone ? '✓' : 'Read'}</span>
              </button>
            </li>
            {games.map((g) => (
              <li key={g.key} className={g.done ? 'is-done' : ''}>
                <button type="button" onClick={() => go(g.route)}>
                  <span className="n">{no()}</span>
                  <span className="t">{g.title}</span>
                  <span className="s">{g.done ? '✓' : 'Play'}</span>
                </button>
              </li>
            ))}
          </ol>

          {white.length > 0 && (
            <>
              <h4 className="book-side"><span aria-hidden="true">♔</span> As White <small>you attack</small></h4>
              {group(white).map(([op, ls]) => (
                <div key={op} className="book-grp">
                  <h5>{op} <span>{ls.length}</span></h5>
                  <ol className="book-toc">
                    {ls.map((l) => (
                      <li key={l.id} className={known(l.id) ? 'is-done' : ''}>
                        <button type="button" onClick={() => go(lineRoute(l))}>
                          <span className="n">{no()}</span>
                          <span className="t">{short(l.title, op)}</span>
                          <span className="s">{known(l.id) ? '✓' : 'Learn'}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </>
          )}

          {black.length > 0 && (
            <>
              <h4 className="book-side black"><span aria-hidden="true">♚</span> As Black <small>you defend</small></h4>
              {blackFrom && <p className="book-note">{blackFrom}</p>}
              {group(black).map(([op, ls]) => (
                <div key={op} className="book-grp">
                  <h5>{op} <span>{ls.length}</span></h5>
                  <ol className="book-toc">
                    {ls.map((l) => (
                      <li key={l.id} className={known(l.id) ? 'is-done' : ''}>
                        <button type="button" onClick={() => go(lineRoute(l))}>
                          <span className="n">{no()}</span>
                          <span className="t">{short(l.title, op)}</span>
                          <span className="s">{known(l.id) ? '✓' : 'Learn'}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </>
          )}

          {choose && (
            <ol className="book-toc">
              <li className={choose.done ? 'is-done' : ''}>
                <button type="button" onClick={() => go(choose.route)}>
                  <span className="n">{no()}</span>
                  <span className="t">How do you react?<small>which move against which answer</small></span>
                  <span className="s">{choose.done ? '✓' : 'Play'}</span>
                </button>
              </li>
            </ol>
          )}
          <ol className="book-toc">
            <li className={`book-boss${boss.done ? ' is-done' : ''}`}>
              <button type="button" onClick={() => go(boss.route)}>
                <span className="n">{no()}</span>
                <span className="t">{s.boss.name}<small>“{s.boss.taunt}”</small></span>
                <span className="s">{boss.done ? '✓ Beaten' : 'Boss'}</span>
              </button>
            </li>
          </ol>

          {extras.length > 0 && (
            <div className="book-extras">
              <b>Extras · history for fun</b>
              {extras.map((g) => (
                <button type="button" key={g.id} onClick={() => go(`king/${s.id}/${g.id}`)}>
                  {g.title}
                  {g.done ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomBar active="map" />
    </div>
  )
}
