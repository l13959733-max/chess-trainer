import { useEffect, useState, type ReactNode } from 'react'

// Lu, 12.11.: the story runs like on the old Game Boy – the text types itself letter by letter in a box,
// tap: show the whole line, tap again: the next line. After the last line: onDone.
export interface StoryLine {
  who: string // the name on the box
  face?: ReactNode // small picture next to the text
  text: string
}

const SPEED = 28 // ms per letter

function useTypewriter(text: string): [string, boolean, () => void] {
  const still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [st, setSt] = useState({ text, n: still ? text.length : 0 })
  // a new line starts typing from the beginning (set during render, no extra effect)
  if (st.text !== text) setSt({ text, n: still ? text.length : 0 })
  const n = st.text === text ? st.n : 0
  useEffect(() => {
    if (n >= text.length) return
    const t = window.setTimeout(() => setSt((x) => (x.text === text ? { text, n: x.n + 1 } : x)), SPEED)
    return () => window.clearTimeout(t)
  }, [n, text])
  return [text.slice(0, n), n >= text.length, () => setSt({ text, n: text.length })]
}

export function StoryBox({ lines, onDone, onLine, doneLabel, compact = false }: { lines: StoryLine[]; onDone?: () => void; onLine?: (i: number) => void; doneLabel?: string; compact?: boolean }) {
  const [i, setI] = useState(0)
  const line = lines[Math.min(i, lines.length - 1)]
  const [shown, full, finish] = useTypewriter(line?.text ?? '')
  const last = i >= lines.length - 1
  if (!line) return null
  function tap() {
    if (!full) return finish()
    if (!last) {
      setI(i + 1)
      onLine?.(i + 1)
    } else onDone?.()
  }
  return (
    <button type="button" className={`gb-box${compact ? ' compact' : ''}`} onClick={tap} aria-live="polite">
      {line.face && <span className="gb-face">{line.face}</span>}
      <span className="gb-body">
        <b className="gb-who">{line.who}</b>
        {/* the full line sits invisible underneath, so the box never jumps while the text types */}
        <span className="gb-text">
          <span className="gb-ghost" aria-hidden="true">{line.text}</span>
          <span className="gb-typed">{shown}</span>
        </span>
      </span>
      {full && (last ? (onDone ? <span className="gb-next done">{doneLabel ?? '▶'}</span> : null) : <span className="gb-next" aria-hidden="true">▼</span>)}
      {lines.length > 1 && <span className="gb-count" aria-hidden="true">{i + 1}/{lines.length}</span>}
    </button>
  )
}
