import { useState } from 'react'
import { guideFor, nextReward } from '../lib/guide'
import type { Line } from '../lib/pgn'

// Shown as soon as a line opens: a fact about its opening, a new "Did you know?" each time,
// and the history folded underneath.
export function OpeningStory({ line }: { line: Line }) {
  const guide = guideFor(line.opening, line.side)
  const [extra] = useState(() => nextReward(line.opening, line.side))
  if (!guide || (!guide.fact && !extra && !guide.story)) return null
  return (
    <section className="opening-story">
      <div className="label">📖 {line.opening}</div>
      {guide.fact && <p><b>Fun fact:</b> {guide.fact}</p>}
      {extra && <p><b>Did you know?</b> {extra}</p>}
      {guide.story && (
        <details className="guide-story">
          <summary>History & idea</summary>
          {guide.story.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </details>
      )}
    </section>
  )
}
