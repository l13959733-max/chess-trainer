// A ring chart like "Mistakes by type" in Training (same colours, same ring, number in the middle, legend beside it).
// Lu, 15.11.: "probier mal, wie das als Kreisdiagramm aussieht, so wie beim Trainingsprogramm".

export const RING_COLORS = ['#ef4a5a', '#8a5cf6', '#2ea7f0', '#ffc531', '#b9b3c9']

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
