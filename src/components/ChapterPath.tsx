// The chapter of a city as a level path, like today's path in Training (Lu, 15.11.: "so will ich das auch in den
// Stadtkapiteln weiterführen" – every exercise and every line with its name, so you find it at a glance).
// Unlike Training nothing is locked: in a city you may start anywhere. Done = green with a tick (the chapter only
// knows done / not done, so no stars here); the next open one is marked and Hoppy says what it is.
import { useLayoutEffect, useRef, useState } from 'react'

export interface ChapterLevel {
  key: string
  title: string
  sub?: string // e.g. "♔ Catalan" under a line's name
  done: boolean
  icon?: string // story and boss show an icon instead of the number
  boss?: boolean
  label: string // what the big card on the chapter page calls it ("Up next · …")
  say: string // what Hoppy says when this is the next one
  open: () => void
}

const HOPPY = import.meta.env.BASE_URL + 'king/hoppy.jpg'

export function ChapterPath({ levels, doneSay }: { levels: ChapterLevel[]; doneSay: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(346)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // same road as in Training
  const STEP = 92
  const TOP = 50
  const pts = levels.map((_, i) => ({ x: w / 2 + Math.sin(i * 1.05 + 0.3) * Math.min(95, w * 0.26), y: TOP + i * STEP }))
  const h = pts.length ? pts[pts.length - 1].y + 60 : 0
  let d = pts.length ? `M ${pts[0].x} ${pts[0].y - 40}` : ''
  pts.forEach((p, i) => {
    if (i === 0) d += ` L ${p.x} ${p.y}`
    else {
      const q = pts[i - 1]
      const my = (q.y + p.y) / 2
      d += ` C ${q.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`
    }
  })
  const at = levels.findIndex((l) => !l.done)
  const ci = at >= 0 ? at : levels.length - 1
  const cur = pts[ci]
  const right = cur ? cur.x <= w / 2 : true
  return (
    <div className="cpath" ref={box} style={{ height: h }}>
      <svg className="cpath-road" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--cp-line)" strokeWidth="20" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>
      {levels.map((l, i) => {
        const p = pts[i]
        const side = p.x > w / 2 ? 'l' : 'r'
        const room = side === 'r' ? w - p.x - 46 : p.x - 46
        return (
          <button
            key={l.key}
            type="button"
            className={`cp-lvl${l.done ? ' done' : ''}${i === at ? ' now' : ''}${l.boss ? ' boss' : ''}`}
            style={{ left: p.x, top: p.y }}
            onClick={l.open}
            aria-label={`${i + 1}. ${l.title}${l.sub ? ` (${l.sub})` : ''}${l.done ? ', done' : ''}`}
          >
            <span className="cp-coin">{l.icon ?? i + 1}</span>
            {l.done && <span className="cp-tick" aria-hidden="true">✓</span>}
            {i !== ci && (
              <span className={`cp-tag ${side}`} style={{ maxWidth: Math.max(90, room) }}>
                <b>{l.title}</b>
                {l.sub && <small>{l.sub}</small>}
              </span>
            )}
          </button>
        )
      })}
      {cur && (
        <div
          className={`cp-call${right ? '' : ' l'}`}
          style={right ? { top: cur.y, left: cur.x + 50, maxWidth: w - cur.x - 52 } : { top: cur.y, right: w - cur.x + 50, maxWidth: cur.x - 52 }}
        >
          <img src={HOPPY} alt="Hoppy" />
          <div>
            <b>
              {ci + 1}. {levels[ci].title}
            </b>
            {levels[ci].sub && <small>{levels[ci].sub}</small>}
            {at >= 0 ? levels[ci].say : doneSay}
          </div>
        </div>
      )}
    </div>
  )
}
