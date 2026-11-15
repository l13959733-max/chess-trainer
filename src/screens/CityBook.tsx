import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { BottomBar } from '../components/BottomBar'
import { ChapterPath, type ChapterLevel } from '../components/ChapterPath'
import { go } from '../hooks/useHashRoute'
import type { Chapter } from '../lib/cityBook'
import { openingNames, type Station } from '../lib/king'
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
  // Lu, 13.11.: a city always opens on its cover (openCity forgets the page); only coming back from a game keeps the page
  const [page, setPage] = useState<Page>(() => savedPage(s.id) ?? { kind: 'cover' })
  // Lu, 13.11./15.11.: in every city the story comes first and then you go straight to playing: the last story page
  // opens the next step (the lesson, a game, a line); the chapter waits on its techniques page.
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

  function back() {
    if (page.kind === 'cover' || page.kind === 'tech') return go('journey')
    if (page.kind === 'story') return setPage(page.i === 0 ? { kind: 'cover' } : { kind: 'story', i: page.i - 1 })
    setPage({ kind: 'tech' })
  }
  function forward() {
    if (page.kind === 'cover') setPage({ kind: 'story', i: 0 })
    else if (page.kind === 'story') {
      if (page.i + 1 < parts.length) return setPage({ kind: 'story', i: page.i + 1 })
      if (next) {
        try {
          sessionStorage.setItem(pageKey(s.id), JSON.stringify({ kind: 'tech' }))
        } catch {
          // not remembered
        }
        return go(next.route)
      }
      setPage({ kind: 'tech' })
    }
  }
  // Lu, 14.11.: the story opens with its picture and stays one page. All text parts lie side by side like cards;
  // the text follows the finger and the next part glides in with it – no reload, no empty moment.
  // The cover follows the finger too; the story then comes in at once.
  const touch = useRef<{ x: number; y: number; dir: 'x' | 'y' | null } | null>(null)
  const pageEl = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const swipeable = page.kind === 'story' || page.kind === 'cover'
  const storyIdx = page.kind === 'story' ? page.i : 0
  // the text track sits on the current part (CSS animates the change)
  useLayoutEffect(() => {
    if (track.current) track.current.style.transform = `translateX(${-storyIdx * 100}%)`
  }, [storyIdx])
  const drag = (dx: number) => {
    if (page.kind === 'story' && track.current) {
      // at the ends the text moves only half as far (it is still the way out of the story)
      const edge = (storyIdx === 0 && dx > 0) || (storyIdx === parts.length - 1 && dx < 0)
      track.current.style.transition = 'none'
      track.current.style.transform = `translateX(calc(${-storyIdx * 100}% + ${edge ? dx / 2 : dx}px))`
    } else if (page.kind === 'cover') {
      const el = pageEl.current?.querySelector<HTMLElement>('.bp-cover')
      if (!el) return
      el.style.transition = 'none'
      el.style.transform = `translateX(${Math.min(dx, 0)}px)`
    }
  }
  const settle = () => {
    if (track.current) {
      track.current.style.transition = ''
      track.current.style.transform = `translateX(${-storyIdx * 100}%)`
    }
    const el = pageEl.current?.querySelector<HTMLElement>('.bp-cover')
    if (el) {
      el.style.transition = 'transform .25s ease'
      el.style.transform = ''
    }
  }
  const onTouchStart = (e: TouchEvent) => {
    if (swipeable) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null }
  }
  const onTouchMove = (e: TouchEvent) => {
    const t = touch.current
    if (!t) return
    const dx = e.touches[0].clientX - t.x
    const dy = e.touches[0].clientY - t.y
    if (!t.dir && Math.abs(dx) + Math.abs(dy) > 8) t.dir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (t.dir === 'x') drag(dx)
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t || t.dir !== 'x') return
    const dx = e.changedTouches[0].clientX - t.x
    if (track.current) track.current.style.transition = ''
    if (dx < -50) forward()
    else if (dx > 50 && page.kind === 'story') back()
    else settle()
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
        <div className="book-art" onClick={forward}><img src={cover} alt="" /></div>
        {/* Lu, 15.11.: one button, "Next", and it opens the story – so everyone sees the story instead of skipping it.
            Under it only a line that shows how far you are (not a button: people did not see it was one). */}
        <button type="button" className="book-go" onClick={forward}>Next →</button>
        {storyDone && (
          <p className="book-toc" aria-label="Your progress in this chapter">
            <span>Story ✓</span>
            {practice.length > 0 && <span>Practice {practice.filter((x) => x.done).length}/{practice.length}</span>}
            {white.length > 0 && <span>{black.length ? 'White' : 'Lines'} {count(white)}</span>}
            {black.length > 0 && <span>{white.length ? 'Black' : 'Lines'} {count(black)}</span>}
            <span>Boss{boss.done ? ' ✓' : ''}</span>
          </p>
        )}
      </section>
    )
  } else if (page.kind === 'story') {
    const last = page.i === parts.length - 1
    body = (
      <section className="bp bp-story" aria-label={`The story of ${s.name}, page ${page.i + 1} of ${parts.length}`}>
        <div className="bp-img">
          <img src={storyImg} alt="" />
          {top(`${page.i + 1} / ${parts.length}`, true)}
        </div>
        <div className="bp-text-wrap" onClick={forward}>
          <div className="bp-track" ref={track} style={{ transform: `translateX(${-page.i * 100}%)` }}>
            {parts.map((part, k) => (
              <div className="bp-text" key={k} aria-hidden={k !== page.i}>
                <p className="bp-kick">{part.board ? 'On the board' : 'The story'}</p>
                <p className={`bp-para${part.board ? ' board' : ''}${k === 0 ? ' first' : ''}`}>{part.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bp-dots" aria-hidden="true">
          {parts.map((_, k) => <i key={k} className={k === page.i ? 'on' : k < page.i ? 'seen' : ''} />)}
        </div>
        {/* Lu, 15.11.: click through the story too (swiping still works); after the last page comes the next step */}
        <button type="button" className="book-go light" onClick={forward}>{last && next ? <>Next <span className="book-go-what">· {next.key === 'boss' ? s.boss.name : next.title}</span></> : 'Next →'}</button>
      </section>
    )
  } else if (page.kind === 'tech') {
    // Lu, 15.11.: the chapter as a level path like today's path in Training – the story, every exercise and every line
    // by its name, the boss at the end. The big picture card on top opens the first one not done yet.
    const names = openingNames(s, ch.black)
    const lineLevel = (l: Line, side: 'white' | 'black'): ChapterLevel => {
      const op = l.opening ?? 'Lines'
      const moves = short(l.title, op)
      // the variation's name; "Italian Game: …" loses the prefix when the chapter already says it
      let name = shortName(l, op) ?? moves
      const cut = name.indexOf(': ')
      if (cut > 0 && (name.slice(0, cut) === op || names.includes(name.slice(0, cut)))) name = name.slice(cut + 2)
      const glyph = side === 'white' ? '♔' : '♚'
      return { key: 'line:' + l.id, title: name, sub: `${glyph} ${op}${moves !== name ? ' · ' + moves : ''}`, label: `${side === 'white' ? 'As White' : 'As Black'} · ${op}`, done: known(l.id), say: known(l.id) ? 'Play it again from memory.' : 'Learn this line move by move.', open: () => go(lineRoute(l)) }
    }
    const levels: ChapterLevel[] = [
      { key: 'story', title: 'The story', sub: `${s.name}, ${s.year}`, label: 'The story', icon: '📖', done: storyDone, say: `${parts.length} pages – how it all began.`, open: () => setPage({ kind: 'story', i: 0 }) },
    ]
    let linesOut = false
    const allLines = () => {
      if (linesOut) return
      linesOut = true
      levels.push(...white.map((l) => lineLevel(l, 'white')), ...black.map((l) => lineLevel(l, 'black')))
    }
    for (const x of steps) {
      if (x.key === 'talk') continue
      if (x.key.startsWith('line:')) {
        allLines()
        continue
      }
      if (x.key === 'choose' || x.key === 'boss') allLines()
      levels.push(
        x.key === 'boss'
          ? { key: 'boss', title: s.boss.name, sub: 'Boss', label: 'Boss', icon: '👑', boss: true, done: x.done, say: `“${s.boss.taunt}”`, open: () => go(x.route) }
          : { key: x.key, title: x.title, label: 'Practice', done: x.done, say: 'A short practice for this chapter.', open: () => go(x.route) },
      )
    }
    allLines()
    const now = levels.find((l) => !l.done)
    const started = levels.some((l) => l.done && l.key !== 'story')
    body = (
      <section className="bp bp-tech" aria-label="Techniques">
        {top(`Chapter ${chapterNo} · ${ch.region.name}`)}
        <div className="bp-scroll">
          <h2>{ch.headline}</h2>
          {names.length > 0 && <p className="bp-openings">{names.join(' · ')}</p>}
          <p className="book-body">{s.intro}</p>
          {/* one big picture card says what comes next (like the Training page) */}
          <button type="button" className="bp-hero" onClick={() => (now ? now.open() : go('journey'))}>
            <img src={cover} alt="" />
            <span className="bp-hero-in">
              <span className="bp-hero-txt">
                <small>{now ? `Up next · ${now.label}` : 'Chapter done'}</small>
                <span className="bp-hero-h">{now ? (now.key === 'story' ? `${s.name}, ${s.year}` : now.title) : 'Back to the world map'}</span>
              </span>
              <span className="bp-hero-go" aria-hidden="true">{!now ? 'Map' : now.key === 'story' ? 'Read' : started ? 'Continue' : 'Start'} ›</span>
            </span>
          </button>
          <h3 className="bp-sec">
            This chapter <span>{levels.filter((l) => l.done).length}/{levels.length}</span>
          </h3>
          <ChapterPath levels={levels} doneSay="Chapter done! On to the next city." />
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
        </div>
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
      {/* a fresh page each time (14.11.: the swipe left the next page pushed out of view – the story looked empty).
          The story stays one page: the picture stays, the text parts glide on a track. */}
      <Fragment key={page.kind === 'story' ? 'story' : JSON.stringify(page)}>{body}</Fragment>
      <BottomBar active={null} />
    </div>
  )
}
