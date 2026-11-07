import type { Master } from '../lib/king'

// Drawings for King of Chess: Hoppy (same shapes as the Mascot), Prince Liam and the masters.
export const HOPPY_INNER =
  '<path d="M38 30 L30 18 L44 24 L44 10 L54 22 L60 8 L66 22 L76 10 L76 24 L90 18 L82 30 Z" fill="#5b36c9"/><path d="M36 36 L30 12 L52 28 Z" fill="#8a5cf6"/><path d="M84 36 L90 12 L68 28 Z" fill="#8a5cf6"/><ellipse cx="60" cy="58" rx="32" ry="34" fill="#8a5cf6"/><ellipse cx="60" cy="80" rx="22" ry="16" fill="#c9b3ff"/><circle cx="47" cy="52" r="10" fill="#fff"/><circle cx="73" cy="52" r="10" fill="#fff"/><circle cx="49" cy="53" r="5.5" fill="#2b2140"/><circle cx="75" cy="53" r="5.5" fill="#2b2140"/><path d="M50 88 Q60 95 70 88" stroke="#5b36c9" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="30" y="100" width="60" height="14" rx="7" fill="#5b36c9"/>'
export const LIAM_INNER =
  '<path d="M30 118 Q32 84 60 84 Q88 84 90 118 Z" fill="#8a5cf6"/><path d="M48 84 L60 100 L72 84 Z" fill="#ffc531"/><circle cx="60" cy="58" r="24" fill="#c68e5f"/><path d="M34 54 Q36 30 60 30 Q84 30 86 54 Q74 42 60 43 Q46 42 34 54 Z" fill="#2b2140"/><path d="M38 34 L46 42 L60 18 L74 42 L82 34 L80 46 L40 46 Z" fill="#ffc531" stroke="#e0a200" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="30" r="3.5" fill="#ef4a5a"/><circle cx="51" cy="60" r="3.2" fill="#2b2140"/><circle cx="69" cy="60" r="3.2" fill="#2b2140"/><path d="M52 71 Q60 77 68 71" stroke="#2b2140" stroke-width="2.8" fill="none" stroke-linecap="round"/>'
export const SHIP_INNER =
  '<path d="M-22,0 Q0,12 22,0 L18,-6 L-18,-6 Z" fill="#a0522d" stroke="#5d2e12" stroke-width="2"/><rect x="-1" y="-30" width="2.5" height="25" fill="#5d2e12"/><path d="M1,-30 L20,-14 L1,-12 Z" fill="#fff" stroke="#8a5cf6" stroke-width="2"/>'
// Liam riding Hoppy, centred on its feet
export const RIDER_INNER = `<ellipse cx="0" cy="40" rx="16" ry="4" fill="#000" opacity=".2"/><g transform="translate(-22,-4) scale(0.36)">${HOPPY_INNER}</g><g transform="translate(-16,-38) scale(0.27)">${LIAM_INNER}</g>`
export const TENT_INNER =
  '<path d="M-26,0 L0,-34 L26,0 Z" fill="#ef4a5a" stroke="#a2283a" stroke-width="2.5" stroke-linejoin="round"/><path d="M-26,0 L0,-34 L-8,0 Z" fill="#c92a2a"/><path d="M-6,0 L0,-14 L6,0 Z" fill="#2b2140"/><path d="M0,-34 L0,-46" stroke="#5d2e12" stroke-width="2"/><path d="M0,-46 L12,-42 L0,-38 Z" fill="#ffc531"/>'

export function Liam({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 120" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LIAM_INNER }} />
}

export function HoppyFace({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 120" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HOPPY_INNER }} />
}

// Friendly cartoon portrait – no likeness of the real person intended
export function Portrait({ m, className = '' }: { m: Master; className?: string }) {
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
