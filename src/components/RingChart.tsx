// A ring chart like "Mistakes by type" in Training (same colours, same ring, number in the middle, legend beside it).
// Lu, 15.11.: "probier mal, wie das als Kreisdiagramm aussieht, so wie beim Trainingsprogramm".

const RING_COLORS = ['#ef4a5a', '#8a5cf6', '#2ea7f0', '#ffc531', '#b9b3c9']

export function RingChart({ parts, center, sub, label }: { parts: [string, number][]; center: string | number; sub: string; label: string }) {
  const total = parts.reduce((s, [, n]) => s + n, 0)
  const r = 44
  const c = 2 * Math.PI * r
  const shown = parts.filter(([, n]) => n > 0)
  const offs = shown.map((_, i) => shown.slice(0, i).reduce((a, [, n]) => a + (n / (total || 1)) * c, 0))
  const gap = shown.length > 1 ? 2 : 0
  return (
    <div className="ring-chart">
      <svg viewBox="0 0 120 120" role="img" aria-label={label}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#eeeaf4" strokeWidth="20" />
        {shown.map(([t, n], i) => {
          const len = (n / total) * c
          return <circle key={t} cx="60" cy="60" r={r} fill="none" stroke={RING_COLORS[parts.findIndex(([x]) => x === t) % RING_COLORS.length]} strokeWidth="20" strokeDasharray={`${Math.max(len - gap, 0.5)} ${c - len + gap}`} strokeDashoffset={-offs[i]} transform="rotate(-90 60 60)" />
        })}
        <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="900" fill="#3a3450">{center}</text>
        <text x="60" y="73" textAnchor="middle" fontSize="9" fontWeight="800" fill="#8a849c">{sub}</text>
      </svg>
      <div className="ring-legend">
        {parts.map(([t, n], i) => (
          <div key={t}><i style={{ background: RING_COLORS[i % RING_COLORS.length] }} /><em>{t.split(' (')[0]}{t.includes(' (') && <small>{t.slice(t.indexOf(' (') + 2, -1)}</small>}</em><span>{total ? Math.round((100 * n) / total) : 0}%</span></div>
        ))}
      </div>
    </div>
  )
}

// Two rings in one (Lu, 16.11.: "beide Kreisdiagramme zusammenfassen – Außenring, Innenring"):
// outside what went wrong, inside when in the game. Same look as RingChart.
export interface RingPart {
  label: string
  n: number
  color: string
}
function arcs(parts: RingPart[], r: number, width: number) {
  const total = parts.reduce((s, p) => s + p.n, 0)
  const c = 2 * Math.PI * r
  const shown = parts.filter((p) => p.n > 0)
  const gap = shown.length > 1 ? 1.5 : 0
  let off = 0
  return shown.map((p) => {
    const len = (p.n / (total || 1)) * c
    const el = <circle key={p.label} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth={width} strokeDasharray={`${Math.max(len - gap, 0.5)} ${c - len + gap}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />
    off += len
    return el
  })
}
export function DoubleRing({ outer, inner, center, sub, label }: { outer: RingPart[]; inner: RingPart[]; center: string | number; sub: string; label: string }) {
  return (
    <svg className="double-ring" viewBox="0 0 140 140" role="img" aria-label={label}>
      <circle cx="70" cy="70" r="58" fill="none" stroke="#eeeaf4" strokeWidth="16" />
      <circle cx="70" cy="70" r="40" fill="none" stroke="#eeeaf4" strokeWidth="12" />
      {arcs(outer, 58, 16)}
      {arcs(inner, 40, 12)}
      <text x="70" y="69" textAnchor="middle" fontSize="20" fontWeight="900" fill="#3a3450">{center}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="9" fontWeight="800" fill="#8a849c">{sub}</text>
    </svg>
  )
}
