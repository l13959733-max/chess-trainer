// "Hoppy", the app's knight mascot. Three moods: happy (default), oops (after a mistake), cheer (success).
export type Mood = 'happy' | 'oops' | 'cheer'

export function Mascot({ mood = 'happy', className = '' }: { mood?: Mood; className?: string }) {
  return (
    <svg className={`mascot mood-${mood} ${className}`} viewBox="0 0 120 120" aria-hidden="true">
      {/* mane */}
      <path d="M38 30 L30 18 L44 24 L44 10 L54 22 L60 8 L66 22 L76 10 L76 24 L90 18 L82 30 Z" fill="#5b36c9" />
      {/* ears */}
      <path d="M36 36 L30 12 L52 28 Z" fill="#8a5cf6" />
      <path d="M84 36 L90 12 L68 28 Z" fill="#8a5cf6" />
      <path d="M38 31 L35 19 L46 28 Z" fill="#ffb3d0" />
      <path d="M82 31 L85 19 L74 28 Z" fill="#ffb3d0" />
      {/* neck */}
      <rect x="42" y="84" width="36" height="22" rx="6" fill="#7a4ee8" />
      {/* head */}
      <ellipse cx="60" cy="58" rx="32" ry="34" fill="#8a5cf6" />
      {/* snout */}
      <ellipse cx="60" cy="80" rx="22" ry="16" fill="#c9b3ff" />
      <ellipse cx="52" cy="79" rx="3" ry="4" fill="#5b36c9" />
      <ellipse cx="68" cy="79" rx="3" ry="4" fill="#5b36c9" />
      {/* eyes */}
      <circle cx="47" cy="52" r="10" fill="#fff" />
      <circle cx="73" cy="52" r="10" fill="#fff" />
      <circle cx={mood === 'oops' ? 46 : 49} cy={mood === 'oops' ? 55 : 53} r="5.5" fill="#2b2140" />
      <circle cx={mood === 'oops' ? 72 : 75} cy={mood === 'oops' ? 55 : 53} r="5.5" fill="#2b2140" />
      <circle cx={mood === 'oops' ? 48 : 51} cy={mood === 'oops' ? 53 : 51} r="2" fill="#fff" />
      <circle cx={mood === 'oops' ? 74 : 77} cy={mood === 'oops' ? 53 : 51} r="2" fill="#fff" />
      {mood === 'oops' && (
        <>
          <path d="M37 40 Q45 36 53 41" stroke="#5b36c9" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M67 41 Q75 36 83 40" stroke="#5b36c9" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* mouth */}
      {mood === 'happy' && <path d="M50 88 Q60 95 70 88" stroke="#5b36c9" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {mood === 'oops' && <path d="M52 91 Q60 86 68 91" stroke="#5b36c9" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {mood === 'cheer' && <path d="M48 86 Q60 100 72 86 Z" fill="#5b36c9" />}
      {/* cheeks */}
      <circle cx="34" cy="68" r="5" fill="#ff8fb8" opacity="0.6" />
      <circle cx="86" cy="68" r="5" fill="#ff8fb8" opacity="0.6" />
      {/* base, like a chess piece */}
      <rect x="30" y="100" width="60" height="14" rx="7" fill="#5b36c9" />
    </svg>
  )
}
