import { useEffect, useState } from 'react'

// the new record counts up from the old best (instant with reduced motion)
export function CountUp({ from, to }: { from: number; to: number }) {
  const [n, setN] = useState(from)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const t = window.setTimeout(() => setN(to), 0)
      return () => window.clearTimeout(t)
    }
    let id = 0
    const t0 = performance.now() + 250
    const run = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 1100))
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) id = requestAnimationFrame(run)
    }
    id = requestAnimationFrame(run)
    return () => cancelAnimationFrame(id)
  }, [from, to])
  return <b className="rush-count" aria-label={`${to} points`}>{n}</b>
}
