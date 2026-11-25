import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { feedback } from '../lib/feedback'
import './OptionWheel.css'

// Option wheel – a list you turn with the finger, the middle option is the chosen one.
// Taken over from React Bits (reactbits.dev, "OptionWheel", JS + CSS variant) on Lu's wish (25.11.2026) and turned into
// TypeScript. Changes: no sound file – the tick is Hoppy's own synthesised click (lib/feedback, respects the sound
// setting); `onPick` fires when you tap the option that is already in the middle (to open it).

export interface OptionWheelProps {
  items: string[]
  defaultSelected?: number
  onChange?: (index: number, item: string) => void
  onPick?: (index: number, item: string) => void
  textColor?: string
  activeColor?: string
  side?: 'left' | 'right'
  fontSize?: number // rem
  spacing?: number
  curve?: number
  tilt?: number // degrees between neighbours
  blur?: number
  fade?: number
  minOpacity?: number
  smoothing?: number // ms
  inset?: number // px
  loop?: boolean
  draggable?: boolean
  sound?: boolean
  className?: string
  label?: string
}

export function OptionWheel({
  items,
  defaultSelected = 0,
  onChange,
  onPick,
  textColor = '#b9b3c9',
  activeColor = '#3a3450',
  side = 'left',
  fontSize = 2.2,
  spacing = 1.4,
  curve = 1,
  tilt = 6,
  blur = 1.5,
  fade = 0.22,
  minOpacity = 0.05,
  smoothing = 200,
  inset = 32,
  loop = false,
  draggable = true,
  sound = true,
  className = '',
  label = 'Option wheel',
}: OptionWheelProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const posRef = useRef(defaultSelected)
  const targetRef = useRef(defaultSelected)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const onChangeRef = useRef(onChange)
  const selectedRef = useRef(defaultSelected)
  const wheelTimerRef = useRef<number | null>(null)
  const dragRef = useRef<{ y: number; start: number; id: number } | null>(null)
  const dragMovedRef = useRef(false)
  const lastTickRef = useRef(0)
  const [selectedIndex, setSelectedIndex] = useState(defaultSelected)
  const [isDragging, setIsDragging] = useState(false)

  const remPx = typeof window !== 'undefined' ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 16
  const cfgRef = useRef({ count: 0, items, rowH: 1, curve, tilt, blur, fade, minOpacity, side, loop, smoothing, draggable, sound })
  useEffect(() => {
    onChangeRef.current = onChange
    cfgRef.current = { count: items.length, items, rowH: Math.max(fontSize * spacing * remPx, 1), curve, tilt, blur, fade, minOpacity, side, loop, smoothing, draggable, sound }
  })

  // one rAF loop: ease the position toward the target (frame-rate independent), then lay every option on the curve
  const runFrame = useCallback(function frame(now: number) {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05)
    lastRef.current = now
    const cfg = cfgRef.current
    const k = 1 - Math.exp(-dt / (Math.max(cfg.smoothing, 1) / 1000))
    const target = targetRef.current
    let next = posRef.current + (target - posRef.current) * k
    const settled = Math.abs(target - next) < 0.001
    if (settled) next = target
    posRef.current = next

    const n = cfg.count
    const mirror = cfg.side === 'right' ? -1 : 1
    const tiltRad = (cfg.tilt * Math.PI) / 180
    const R = tiltRad > 0.0005 ? cfg.rowH / tiltRad : 0
    for (let i = 0; i < n; i++) {
      const el = itemRefs.current[i]
      if (!el) continue
      let d = i - next
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n
        if (d > n / 2) d -= n
      }
      const dist = Math.abs(d)
      let x = 0
      let y = d * cfg.rowH
      let rot = 0
      if (R > 0) {
        const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad))
        y = R * Math.sin(ang)
        x = -mirror * R * (1 - Math.cos(ang)) * cfg.curve
        rot = (mirror * ang * 180) / Math.PI
      }
      el.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rot.toFixed(3)}deg)`
      el.style.opacity = String(Math.max(cfg.minOpacity, 1 - dist * cfg.fade))
      el.style.filter = cfg.blur > 0 ? `blur(${(dist * cfg.blur).toFixed(2)}px)` : 'none'
      el.style.setProperty('--ow-p', Math.max(0, 1 - Math.min(dist, 1)).toFixed(4))
    }
    rafRef.current = settled ? null : requestAnimationFrame(frame)
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(runFrame)
  }, [runFrame])

  // Hoppy's click on every new option, throttled so fast turning does not rattle
  const playTick = useCallback((i: number) => {
    if (!cfgRef.current.sound) return
    const now = performance.now()
    if (now - lastTickRef.current < 70) return
    lastTickRef.current = now
    feedback.tick(i)
  }, [])

  const applyTarget = useCallback(
    (value: number, snap: boolean) => {
      const cfg = cfgRef.current
      let v = value
      if (!cfg.loop) v = Math.min(Math.max(v, 0), Math.max(cfg.count - 1, 0))
      if (snap) v = Math.round(v)
      targetRef.current = v
      const idx = ((Math.round(v) % cfg.count) + cfg.count) % cfg.count
      if (idx !== selectedRef.current) {
        selectedRef.current = idx
        setSelectedIndex(idx)
        onChangeRef.current?.(idx, cfg.items[idx])
        playTick(idx)
      }
      startLoop()
    },
    [startLoop, playTick],
  )

  // mouse wheel / touchpad, registered by hand so it can be non-passive
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY
      const step = Math.max(-1, Math.min(1, delta / cfgRef.current.rowH))
      applyTarget(targetRef.current + step, false)
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = window.setTimeout(() => applyTarget(targetRef.current, true), 140)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    }
  }, [applyTarget])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!cfgRef.current.draggable) return
    dragRef.current = { y: e.clientY, start: targetRef.current, id: e.pointerId }
    dragMovedRef.current = false
    setIsDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dy = e.clientY - drag.y
    if (!dragMovedRef.current && Math.abs(dy) > 4) {
      dragMovedRef.current = true
      rootRef.current?.setPointerCapture(drag.id) // only once a real drag starts, so taps still reach the options
    }
    if (dragMovedRef.current) applyTarget(drag.start - dy / cfgRef.current.rowH, false)
  }
  const onPointerEnd = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setIsDragging(false)
    if (dragMovedRef.current) applyTarget(targetRef.current, true)
  }
  const onItemClick = (index: number) => {
    if (dragMovedRef.current) return
    if (index === selectedRef.current && Math.abs(targetRef.current - Math.round(targetRef.current)) < 0.01) {
      onPick?.(index, items[index]) // tapping the chosen one opens it
      return
    }
    const cfg = cfgRef.current
    const cur = targetRef.current
    let d = index - (((cur % cfg.count) + cfg.count) % cfg.count)
    if (cfg.loop && cfg.count > 1) {
      if (d > cfg.count / 2) d -= cfg.count
      else if (d < -cfg.count / 2) d += cfg.count
    }
    applyTarget(cur + d, true)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    let delta: number | null = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1
    else if (e.key === 'Enter') {
      onPick?.(selectedRef.current, items[selectedRef.current])
      return
    }
    if (delta == null) return
    e.preventDefault()
    applyTarget(Math.round(targetRef.current) + delta, true)
  }

  useEffect(() => {
    applyTarget(targetRef.current, false)
  }, [items, fontSize, spacing, curve, tilt, blur, fade, minOpacity, side, loop, smoothing, applyTarget])

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    },
    [],
  )

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`ow-${selectedIndex}`}
      className={`option-wheel${side === 'right' ? ' option-wheel--right' : ''}${isDragging ? ' option-wheel--dragging' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--ow-text-color': textColor, '--ow-active-color': activeColor, '--ow-font-size': `${fontSize}rem`, '--ow-inset': `${inset}px` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      {items.map((text, index) => (
        <div
          key={`${text}-${index}`}
          id={`ow-${index}`}
          ref={(el) => {
            itemRefs.current[index] = el
          }}
          role="option"
          aria-selected={selectedIndex === index}
          className={`option-wheel__item${selectedIndex === index ? ' option-wheel__item--selected' : ''}`}
          onClick={() => onItemClick(index)}
        >
          {text}
        </div>
      ))}
    </div>
  )
}
