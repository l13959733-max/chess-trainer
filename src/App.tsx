import { useEffect, useState } from 'react'
import { go, useHashRoute } from './hooks/useHashRoute'
import { useAnalyzer } from './hooks/useAnalyzer'
import { useProgress } from './hooks/useProgress'
import { usePuzzles } from './hooks/usePuzzles'
import { useRepertoire } from './hooks/useRepertoire'
import { isDue } from './lib/srs'
import { stop as stopVoice, unlockAudio } from './lib/voice'
import { Drill } from './screens/Drill'
import { Home } from './screens/Home'
import { Import } from './screens/Import'
import { Learn } from './screens/Learn'
import { PuzzleView } from './screens/PuzzleScreen'
import { Settings } from './screens/Settings'
import './App.css'

function App() {
  const rep = useRepertoire()
  const progress = useProgress()
  const analyzer = useAnalyzer()
  const puzzles = usePuzzles(analyzer.analyzed)
  const [page, id] = useHashRoute()

  // Reading stops when the screen changes; the first tap unlocks audio for automatic reading (iOS)
  useEffect(() => stopVoice, [page, id])
  useEffect(() => {
    const once = () => unlockAudio()
    window.addEventListener('pointerdown', once, { once: true })
    return () => window.removeEventListener('pointerdown', once)
  }, [])
  const line = id ? rep.lines.find((l) => l.id === id) : undefined

  let body: React.ReactNode
  if (!rep.ready) body = <p className="loading">Loading repertoire …</p>
  else if (page === 'learn' && line) body = <Learn line={line} onComplete={progress.recordLearn} />
  else if (page === 'drill' && line)
    body = (
      <Drill
        key={line.id}
        line={line}
        onDone={async (m) => ({ srs: await rep.recordDrill(line.id, m), reward: await progress.recordDrill(m) })}
        after={(restart) => (
          <>
            <button type="button" onClick={restart}>Again</button>
            <button type="button" className="primary" onClick={() => go('')}>Overview</button>
          </>
        )}
      />
    )
  else if (page === 'review') body = <Review rep={rep} progress={progress} />
  else if (page === 'import') body = <Import rep={rep} />
  else if (page === 'settings') body = <Settings />
  else if (page === 'voice') body = <Settings incoming={id ? decodeURIComponent(id) : undefined} />
  else if (page === 'puzzles') body = <PuzzleSession puzzles={puzzles} progress={progress} />
  else body = <Home rep={rep} progress={progress} puzzles={puzzles} analyzer={analyzer} />

  return (
    <main className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => go('')}>Chess Trainer</button>
        <button type="button" className="settings-link" onClick={() => go('settings')}>Settings</button>
      </header>
      {body}
    </main>
  )
}

// Drill all due lines one after another. The list is fixed when the session starts.
function Review({ rep, progress }: { rep: ReturnType<typeof useRepertoire>; progress: ReturnType<typeof useProgress> }) {
  const [queue] = useState(() => rep.lines.filter((l) => isDue(rep.srs.get(l.id), Date.now())).map((l) => l.id))
  const [index, setIndex] = useState(0)
  const line = rep.lines.find((l) => l.id === queue[index])

  if (!line) {
    return (
      <div className="screen">
        <div className="done">
          <div className="done-title">{queue.length ? 'All due lines reviewed' : 'Nothing due'}</div>
          <div className="done-actions">
            <button type="button" className="primary" onClick={() => go('')}>Overview</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Drill
      key={line.id}
      line={line}
      progress={`${index + 1} of ${queue.length}`}
      onDone={async (m) => ({ srs: await rep.recordDrill(line.id, m), reward: await progress.recordDrill(m) })}
      after={(restart) => (
        <>
          <button type="button" onClick={restart}>Again</button>
          <button type="button" className="primary" onClick={() => setIndex(index + 1)}>
            {index + 1 < queue.length ? 'Next line' : 'Finish'}
          </button>
        </>
      )}
    />
  )
}

// Due puzzles first, then up to 10 new ones (newest games first). The list is fixed when the session starts.
const NEW_PER_SESSION = 10

function PuzzleSession({ puzzles, progress }: { puzzles: ReturnType<typeof usePuzzles>; progress: ReturnType<typeof useProgress> }) {
  const [queue] = useState(() => [...puzzles.due, ...puzzles.fresh.slice(0, NEW_PER_SESSION)].map((p) => p.id))
  const [index, setIndex] = useState(0)
  const puzzle = puzzles.puzzles.find((p) => p.id === queue[index])

  if (!puzzle) {
    return (
      <div className="screen">
        <div className="done">
          <div className="done-title">{queue.length ? 'All puzzles done for now' : 'No puzzles yet'}</div>
          {!queue.length && <p>Analyse your chess.com games on the overview first.</p>}
          <div className="done-actions">
            <button type="button" className="primary" onClick={() => go('')}>Overview</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PuzzleView
      key={puzzle.id}
      puzzle={puzzle}
      progress={`${index + 1} of ${queue.length}`}
      onSolved={async (m) => ({ srs: await puzzles.record(puzzle.id, m), reward: await progress.recordPuzzle(m) })}
      onNext={() => setIndex(index + 1)}
      isLast={index + 1 >= queue.length}
    />
  )
}

export default App
