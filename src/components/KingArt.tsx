import { liamPortrait, loadKing, type Master } from '../lib/king'

// Pictures for King of Chess: the ship for sea travel and the painted portraits.
export const SHIP_INNER =
  '<path d="M-22,0 Q0,12 22,0 L18,-6 L-18,-6 Z" fill="#a0522d" stroke="#5d2e12" stroke-width="2"/><rect x="-1" y="-30" width="2.5" height="25" fill="#5d2e12"/><path d="M1,-30 L20,-14 L1,-12 Z" fill="#f4e4c1" stroke="#8b6b3d" stroke-width="2"/>'

const IMG = import.meta.env.BASE_URL + 'king/'

// Painted portraits for the dialogues
export function Avatar({ who, className = '' }: { who: 'liam' | 'hoppy'; className?: string }) {
  return <img className={`king-pimg ${className}`} src={IMG + (who === 'liam' ? liamPortrait(loadKing().beaten) : who + '.jpg')} alt="" />
}

// Painted portrait (or a drawn one as fallback) – no likeness of the real person intended
export function Portrait({ m, className = '' }: { m: Master; className?: string }) {
  if (m.img) return <img className={`king-pimg ${className}`} src={IMG + m.img} alt="" />
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#fff3c4" />
      <ellipse cx="32" cy="58" rx="20" ry="12" fill={m.coat} />
      <circle cx="32" cy="30" r="15" fill={m.skin} />
      <path d="M17 27 Q18 12 32 13 Q46 12 47 27 Q40 19 32 20 Q24 19 17 27 Z" fill={m.hair} />
      <circle cx="27" cy="31" r="2" fill="#2b2140" />
      <circle cx="37" cy="31" r="2" fill="#2b2140" />
      {m.beard && <path d="M20 34 Q32 54 44 34 Q40 44 32 45 Q24 44 20 34 Z" fill={m.hair} />}
      {m.mustache && <path d="M25 38 Q32 34 39 38 Q32 37 25 38 Z" fill={m.hair} />}
      <path d="M28 41 Q32 44 36 41" stroke="#2b2140" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {m.hat && (
        <>
          <rect x="20" y="9" width="24" height="6" rx="2" fill="#2b2140" />
          <rect x="24" y="1" width="16" height="10" rx="2" fill="#2b2140" />
        </>
      )}
    </svg>
  )
}
