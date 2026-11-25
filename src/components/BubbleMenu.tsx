import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './BubbleMenu.css'

// Bubble menu – a logo pill and a round menu button; the button pops every place in as a big coloured pill.
// Taken over from React Bits (reactbits.dev, "BubbleMenu", JS + CSS variant) on Lu's wish (25.11.2026), turned into
// TypeScript. Change: no gsap – the pop-in uses the browser's own Web Animations with an overshoot curve close to
// gsap's back.out(1.5), so the app gets no new package. Items take `onClick` (hash routes) instead of only links.

export interface BubbleItem {
  label: string
  href?: string
  onClick?: () => void
  ariaLabel?: string
  rotation?: number
  hoverStyles?: { bgColor?: string; textColor?: string }
}

const BACK_OUT = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

export function BubbleMenu({
  logo,
  onMenuClick,
  className,
  style,
  menuAriaLabel = 'Toggle menu',
  menuBg = '#fff',
  menuContentColor = '#3a3450',
  useFixedPosition = false,
  items,
  animationDuration = 0.5,
  staggerDelay = 0.08,
}: {
  logo?: ReactNode
  onMenuClick?: (open: boolean) => void
  className?: string
  style?: CSSProperties
  menuAriaLabel?: string
  menuBg?: string
  menuContentColor?: string
  useFixedPosition?: boolean
  items: BubbleItem[]
  animationDuration?: number
  staggerDelay?: number
}) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const bubbles = useRef<(HTMLElement | null)[]>([])
  const labels = useRef<(HTMLElement | null)[]>([])
  const pos = useFixedPosition ? 'fixed' : 'absolute'

  function toggle() {
    const next = !open
    if (next) setShown(true)
    setOpen(next)
    onMenuClick?.(next)
  }

  useEffect(() => {
    const bs = bubbles.current.filter(Boolean) as HTMLElement[]
    const ls = labels.current.filter(Boolean) as HTMLElement[]
    if (!bs.length) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = animationDuration * 1000
    if (open) {
      bs.forEach((b, i) => {
        const delay = reduced ? 0 : Math.max(0, i * staggerDelay * 1000 + (Math.random() - 0.5) * 100)
        b.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: reduced ? 1 : ms, delay, easing: BACK_OUT, fill: 'both' })
        ls[i]?.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: reduced ? 1 : ms, delay: delay + ms * 0.1, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' })
      })
    } else if (shown) {
      ls.forEach((l) => l.animate([{ opacity: 1 }, { transform: 'translateY(24px)', opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'both' }))
      const outs = bs.map((b) => b.animate([{ transform: 'scale(1)' }, { transform: 'scale(0)' }], { duration: 200, easing: 'ease-in', fill: 'both' }))
      Promise.all(outs.map((a) => a.finished)).then(() => setShown(false)).catch(() => setShown(false))
    }
  }, [open, shown, animationDuration, staggerDelay])

  return (
    <>
      <nav className={['bubble-menu', pos, className].filter(Boolean).join(' ')} style={style} aria-label="Main navigation">
        <div className="bubble logo-bubble" style={{ background: menuBg }}>
          <span className="logo-content">{logo}</span>
        </div>
        <button type="button" className={`bubble toggle-bubble menu-btn${open ? ' open' : ''}`} onClick={toggle} aria-label={menuAriaLabel} aria-expanded={open} style={{ background: menuBg }}>
          <span className="menu-line" style={{ background: menuContentColor }} />
          <span className="menu-line short" style={{ background: menuContentColor }} />
        </button>
      </nav>
      {shown && (
        <div className={`bubble-menu-items ${pos}`} aria-hidden={!open}>
          <ul className="pill-list" role="menu" aria-label="Menu links">
            {items.map((item, idx) => (
              <li key={idx} role="none" className="pill-col">
                <a
                  role="menuitem"
                  href={item.href ?? '#'}
                  aria-label={item.ariaLabel || item.label}
                  className="pill-link"
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault()
                      item.onClick()
                    }
                  }}
                  style={{
                    '--item-rot': `${item.rotation ?? 0}deg`,
                    '--pill-bg': menuBg,
                    '--pill-color': menuContentColor,
                    '--hover-bg': item.hoverStyles?.bgColor || '#f7f5fc',
                    '--hover-color': item.hoverStyles?.textColor || menuContentColor,
                  } as CSSProperties}
                  ref={(el) => {
                    bubbles.current[idx] = el
                  }}
                >
                  <span className="pill-label" ref={(el) => { labels.current[idx] = el }}>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
