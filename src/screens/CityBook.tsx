import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { BottomBar } from '../components/BottomBar'
import { go } from '../hooks/useHashRoute'
import type { Chapter } from '../lib/cityBook'
import type { Station } from '../lib/king'
import { shortName } from '../lib/lineNames'
import type { Line } from '../lib/pgn'

// A city as a book chapter, in PAGES like an app – no scrolling (Lu, 12.11. night: „auf Apps ist es geiler, wenn alles
// immer auf einer Seite ist“). Cover → the story, one page per part, tap through → the techniques page with tiles →
// one tile opens its variations on a page of their own. Back always goes one page up. Back from an exercise, the
// chapter opens on the page you left.

const IMG = import.meta.env.BASE_URL + 'king/'

export interface BookStep {
  key: string
  title: string
  route: string
  done: boolean
}
type Page = { kind: 'cover' } | { kind: 'story'; i: number } | { kind: 'tech' } | { kind: 'list'; group: 'steps' | 'white' | 'black' }

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
const pageKey = (id: string) => 'hoppy-book-page-' + id
function savedPage(id: string): Page | null {
  try {
    const v = sessionStorage.getItem(pageKey(id))
    return v ? (JSON.parse(v) as Page) : null
  } catch {
    return null
  }
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
  const storyDone = steps.find((x) => x.key === 'talk')?.done ?? false
  // the story pages: every part of the story, then the "On the board" hints
  const parts = [...ch.story.map((text) => ({ text, board: false })), ...(ch.board ?? []).map((text) => ({ text, board: true }))]
  const [page, setPage] = useState<Page>(() => savedPage(s.id) ?? (storyDone ? { kind: 'tech' } : { kind: 'cover' }))
  useEffect(() => {
    try {
      sessionStorage.setItem(pageKey(s.id), JSON.stringify(page))
    } catch {
      // not remembered
    }
    if (page.kind === 'tech' || (page.kind === 'story' && page.i === parts.length - 1)) onStoryRead()
  }, [page, s.id, parts.length, onStoryRead])

  const next = steps.find((x) => !x.done && x.key !== 'talk')
  const practice = steps.filter((x) => x.key !== 'talk' && x.key !== 'boss' && !x.key.startsWith('line:'))
  const boss = steps.find((x) => x.key === 'boss')!
  const lineRoute = (l: Line) => (known(l.id) ? 'drill/' : 'learn/') + l.id
  const cover = IMG + 'book/' + (ch.cover ?? `${s.id}.jpg`)
  const storyImg = ch.storyImg ? IMG + 'book/' + ch.storyImg : cover
  const vars = { '--house': ch.region.color, '--accent': ch.region.accent } as CSSProperties
  const count = (ls: Line[]) => `${ls.filter((l) => known(l.id)).length}/${ls.length}`
  const share = (ls: Line[]) => (ls.length ? (100 * ls.filter((l) => known(l.id)).length) / ls.length : 0)
  // Lu, 13.11. (prototype "Hoppy Mix"): every tile says what is inside, and the tile the big button opens is marked
  const lineSide = (key: string) => (black.some((l) => 'line:' + l.id === key) ? 'black' : 'white')
  const upNext = !storyDone ? 'story' : !next ? '' : next.key === 'boss' ? 'boss' : next.key.startsWith('line:') ? lineSide(next.key) : 'practice'
  const tag = (k: string) => (upNext === k ? <i className="bp-next">Up next</i> : null)

  function back() {
    if (page.kind === 'cover' || page.kind === 'tech') return go('journey')
    if (page.kind === 'story') return setPage(page.i === 0 ? { kind: 'cover' } : { kind: 'story', i: page.i - 1 })
    setPage({ kind: 'tech' })
  }
  function forward() {
    if (page.kind === 'cover') setPage({ kind: 'story', i: 0 })
    else if (page.kind === 'story') setPage(page.i + 1 < parts.length ? { kind: 'story', i: page.i + 1 } : { kind: 'tech' })
  }
  // Lu, 13.11.: no Next button – swipe. The page follows the finger and snaps to the next one (cover and story).
  const touch = useRef<{ x: number; y: number } | null>(null)
  const pageEl = useRef<HTMLDivElement>(null)
  const swipeable = page.kind === 'story' || page.kind === 'cover'
  const slide = (dx: number, animate: boolean) => {
    const el = pageEl.current?.querySelector<HTMLElement>('.bp')
    if (!el) return
    el.style.transition = animate ? 'transform .22s ease, opacity .22s ease' : 'none'
    el.style.transform = dx ? `translateX(${dx}px)` : ''
    el.style.opacity = dx ? String(Math.max(0.35, 1 - Math.abs(dx) / 500)) : ''
  }
  const onTouchStart = (e: TouchEvent) => {
    if (swipeable) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchMove = (e: TouchEvent) => {
    if (!touch.current) return
    const dx = e.touches[0].clientX - touch.current.x
    if (Math.abs(dx) > Math.abs(e.touches[0].clientY - touch.current.y)) slide(page.kind === 'cover' ? Math.min(dx, 0) : dx, false)
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    touch.current = null
    if (dx < -60) {
      slide(-window.innerWidth, true)
      window.setTimeout(forward, 180)
    } else if (dx > 60 && page.kind === 'story') {
      slide(window.innerWidth, true)
      window.setTimeout(back, 180)
    } else slide(0, true)
  }

  const top = (label: string, light = false) => (
    <div className={`book-top${light ? ' light' : ''}`}>
      <button type="button" className="book-back" onClick={back} aria-label="Back">
        <svg width="24" height="16" viewBox="0 0 26 16" aria-hidden="true"><path d="M24 8H3M9 2L3 8l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <span className="book-no">{label}</span>
    </div>
  )

  let body
  if (page.kind === 'cover') {
    body = (
      <section className="bp bp-cover" aria-label="Cover">
        {top(`Chapter ${chapterNo}`)}
        <h1>{s.name}, {s.year}</h1>
        <p className="book-sub">{ch.subtitle}</p>
        <div className="book-art"><img src={cover} alt="" /></div>
        <button type="button" className="book-go" onClick={forward}>{storyDone ? 'Read the story again' : 'Begin the story'} →</button>
      </section>
    )
  } else if (page.kind === 'story') {
    const part = parts[page.i]
    const last = page.i === parts.length - 1
    body = (
      <section className="bp bp-story" aria-label={`The story of ${s.name}, page ${page.i + 1} of ${parts.length}`}>
        <div className="bp-img">
          <img src={storyImg} alt="" />
          {top(`${page.i + 1} / ${parts.length}`, true)}
        </div>
        <div className="bp-text" onClick={forward}>
          <p className="bp-kick">{part.board ? 'On the board' : 'The story'}</p>
          <p key={page.i} className={`bp-para${part.board ? ' board' : ''}${page.i === 0 ? ' first' : ''}`}>{part.text}</p>
        </div>
        <div className="bp-dots" aria-hidden="true">
          {parts.map((_, k) => <i key={k} className={k === page.i ? 'on' : k < page.i ? 'seen' : ''} />)}
        </div>
        {/* Lu, 13.11.: the Next button stays for now – swiping works too */}
        <button type="button" className="book-go light" onClick={forward}>{last ? 'To the techniques →' : 'Next →'}</button>
      </section>
    )
  } else if (page.kind === 'tech') {
    body = (
      <section className="bp bp-tech" aria-label="Techniques">
        {top(`Chapter ${chapterNo} · ${ch.region.name}`)}
        <h2>{ch.headline}</h2>
        <p className="book-body">{s.intro}</p>
        <button type="button" className="book-go" onClick={() => (next ? go(next.route) : go('journey'))}>
          {next ? `${steps.some((x) => x.done && x.key !== 'talk') ? 'Continue' : 'Start'}: ${next.title}` : 'Back to the world map'}
        </button>
        <div className="bp-tiles">
          <button type="button" className={`bp-tile${storyDone ? ' is-done' : ''}${upNext === 'story' ? ' up' : ''}`} onClick={() => setPage({ kind: 'story', i: 0 })}>
            {tag('story')}
            <b>The story</b>
            <span className="bp-what">{parts.length} pages · {s.name}, {s.year}</span>
            <small>{storyDone ? '✓ read' : 'not read yet'}</small>
          </button>
          {practice.length > 0 && (
            <button type="button" className={`bp-tile${practice.every((x) => x.done) ? ' is-done' : ''}${upNext === 'practice' ? ' up' : ''}`} onClick={() => setPage({ kind: 'list', group: 'steps' })}>
              {tag('practice')}
              <b>Practice</b>
              <span className="bp-what">{practice.map((x) => x.title).join(' · ')}</span>
              <small>{practice.every((x) => x.done) ? '✓ ' : ''}{practice.filter((x) => x.done).length}/{practice.length} done</small>
            </button>
          )}
          {white.length > 0 && (
            <button type="button" className={`bp-tile${upNext === 'white' ? ' up' : ''}`} onClick={() => setPage({ kind: 'list', group: 'white' })}>
              {tag('white')}
              <b><span aria-hidden="true">♔ </span>As White</b>
              <span className="bp-what">{group(white).map(([op]) => op).join(' · ')} · {white.length} lines</span>
              <span className="bp-meter" aria-hidden="true"><i style={{ width: `${share(white)}%` }} /></span>
              <small>{count(white)} learned</small>
            </button>
          )}
          {black.length > 0 && (
            <button type="button" className={`bp-tile${upNext === 'black' ? ' up' : ''}`} onClick={() => setPage({ kind: 'list', group: 'black' })}>
              {tag('black')}
              <b><span aria-hidden="true">♚ </span>As Black</b>
              <span className="bp-what">{group(black).map(([op]) => op).join(' · ')} · {black.length} lines</span>
              <span className="bp-meter" aria-hidden="true"><i style={{ width: `${share(black)}%` }} /></span>
              <small>{count(black)} learned</small>
            </button>
          )}
          <button type="button" className={`bp-tile boss${boss.done ? ' is-done' : ''}${upNext === 'boss' ? ' up' : ''}`} onClick={() => go(boss.route)}>
            {tag('boss')}
            <b>{s.boss.name}</b>
            <span className="bp-what">“{s.boss.taunt}”</span>
            <small>{boss.done ? '✓ Beaten' : 'Boss'}</small>
          </button>
        </div>
        {extras.length > 0 && (
          <div className="bp-extras">
            {extras.map((g) => (
              <button type="button" key={g.id} onClick={() => go(`king/${s.id}/${g.id}`)}>
                {g.title}
                {g.done ? ' ✓' : ''}
              </button>
            ))}
          </div>
        )}
      </section>
    )
  } else {
    const ls = page.group === 'white' ? white : page.group === 'black' ? black : []
    body = (
      <section className="bp bp-list" aria-label={page.group === 'steps' ? 'Practice' : page.group === 'white' ? 'As White' : 'As Black'}>
        {top(ch.headline)}
        <h2>{page.group === 'steps' ? 'Practice' : page.group === 'white' ? '♔ As White' : '♚ As Black'}</h2>
        {page.group === 'black' && blackFrom && <p className="book-note">{blackFrom}</p>}
        <div className="bp-listbody">
          {page.group === 'steps' ? (
            <div className="bp-grid">
              {practice.map((x) => (
                <button type="button" key={x.key} className={x.done ? 'is-done' : ''} onClick={() => go(x.route)}>
                  {x.title}
                  <small>{x.done ? '✓' : 'Play'}</small>
                </button>
              ))}
            </div>
          ) : (
            group(ls).map(([op, lines]) => (
              <div key={op} className="bp-group">
                <h5>
                  {op} <span>{count(lines)}</span>
                </h5>
                <div className="bp-grid">
                  {lines.map((l) => {
                    const name = shortName(l, op)
                    return (
                      <button type="button" key={l.id} className={`bp-line${known(l.id) ? ' is-done' : ''}`} onClick={() => go(lineRoute(l))}>
                        <span className="bp-name">{name ?? short(l.title, op)}</span>
                        <span className="bp-moves">{name ? short(l.title, op) : ''}<em>{known(l.id) ? '✓' : 'Learn'}</em></span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    )
  }

  return (
    <div ref={pageEl} className={`book book-paged page-${page.kind}`} style={vars} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {body}
      <BottomBar active="map" />
    </div>
  )
}
