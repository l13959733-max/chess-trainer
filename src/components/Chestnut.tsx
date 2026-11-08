import { useEffect, useState, type CSSProperties } from 'react'
import { feedback as fx } from '../lib/feedback'

// The reward: a painted chestnut burr flies in, cracks open with a sound, and the chestnuts you
// earned tumble out while the number counts up. Golden when you played carefully (checked the
// threat, nothing hung). With "reduce motion" everything simply stands there.

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Spikes of one half of the burr (angles in degrees, 0 = up, clockwise)
function spikes(from: number, to: number): string {
  const out: string[] = []
  for (let a = from; a <= to; a += 16) {
    const r = (a * Math.PI) / 180
    const x1 = Math.sin(r) * 34
    const y1 = -Math.cos(r) * 34
    const x2 = Math.sin(r) * 47
    const y2 = -Math.cos(r) * 47
    out.push(`M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`)
  }
  return out.join('')
}
const LEFT_SPIKES = spikes(188, 352)
const RIGHT_SPIKES = spikes(8, 172)

export function Nut({ gold, size = 26 }: { gold?: boolean; size?: number }) {
  const id = gold ? 'nut-g' : 'nut-b'
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={gold ? '#fff3b8' : '#b06a3b'} />
          <stop offset=".55" stopColor={gold ? '#e2b53a' : '#7a3f1d'} />
          <stop offset="1" stopColor={gold ? '#9c7412' : '#4a230e'} />
        </radialGradient>
      </defs>
      <path d="M0,-14 C9,-14 14,-4 14,4 C14,11 8,14 0,14 C-8,14 -14,11 -14,4 C-14,-4 -9,-14 0,-14Z" fill={`url(#${id})`} stroke={gold ? '#7a5a0c' : '#3b1d0b'} strokeWidth="1" />
      <path d="M-12,7 C-6,12 6,12 12,7 C10,13 -10,13 -12,7Z" fill={gold ? '#f8e7a4' : '#d9b98c'} opacity=".9" />
      <path d="M0,-14 L0,-17" stroke={gold ? '#7a5a0c' : '#3b1d0b'} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="-5" cy="-6" rx="3.2" ry="5" fill="#fff" opacity=".35" transform="rotate(25 -5 -6)" />
    </svg>
  )
}

function Burr({ gold }: { gold?: boolean }) {
  const shell = gold ? '#d9ae35' : '#7c9a3a'
  const edge = gold ? '#8f7116' : '#4d6420'
  return (
    <svg className="nut-burr" viewBox="-60 -60 120 120" aria-hidden="true">
      <g className="burr-l">
        <path d={LEFT_SPIKES} stroke={edge} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M0,-36 A36,36 0 0,0 0,36 Z" fill={shell} stroke={edge} strokeWidth="2" />
        <path d="M-8,-30 A30,30 0 0,0 -8,30" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="3" />
      </g>
      <g className="burr-r">
        <path d={RIGHT_SPIKES} stroke={edge} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M0,-36 A36,36 0 0,1 0,36 Z" fill={shell} stroke={edge} strokeWidth="2" />
      </g>
    </svg>
  )
}

// Where the chestnuts land: a small heap below the burr
const HEAP = [
  { x: 0, y: 64, r: 20 },
  { x: -26, y: 70, r: -35 },
  { x: 26, y: 70, r: 40 },
  { x: -13, y: 50, r: 70 },
  { x: 13, y: 50, r: -60 },
  { x: -48, y: 74, r: 15 },
  { x: 48, y: 74, r: -20 },
  { x: 0, y: 36, r: 110 },
]

export function ChestnutReward({ amount, gold }: { amount: number; gold?: boolean }) {
  const [reduce] = useState(reduceMotion)
  const [open, setOpen] = useState(reduce)
  const [shown, setShown] = useState(reduce ? amount : 0)
  const nuts = Math.min(HEAP.length, Math.max(2, Math.ceil(amount / 7)))

  useEffect(() => {
    const timers: number[] = []
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
    if (reduce) {
      later(150, () => (gold ? fx.knack() : fx.crack()))
      return () => timers.forEach(clearTimeout)
    }
    later(620, () => {
      setOpen(true)
      if (gold) fx.knack()
      else fx.crack()
    })
    // the number counts up while the chestnuts land
    const steps = Math.min(amount, 20)
    for (let i = 1; i <= steps; i++) {
      later(760 + i * 45, () => {
        setShown(Math.round((amount * i) / steps))
        if (i % Math.max(1, Math.floor(steps / nuts)) === 0) fx.tick(i)
      })
    }
    return () => timers.forEach(clearTimeout)
  }, [amount, gold, nuts, reduce])

  return (
    <div className={`nut-reward ${gold ? 'gold' : ''} ${open ? 'open' : ''} ${reduce ? 'still' : ''}`} role="status" aria-label={`plus ${amount} chestnuts${gold ? ', a golden one' : ''}`}>
      <div className="nut-stage">
        <Burr gold={gold} />
        {open &&
          HEAP.slice(0, nuts).map((h, i) => (
            <span key={i} className="nut-drop" style={{ '--x': `${h.x}px`, '--y': `${h.y}px`, '--r': `${h.r}deg`, '--i': i } as CSSProperties}>
              <Nut gold={gold && i === 0} />
            </span>
          ))}
      </div>
      <div className="nut-count">+{shown} 🌰</div>
      {gold && <div className="nut-gold-why">Golden chestnut: you checked the threats first and left nothing hanging.</div>}
    </div>
  )
}
