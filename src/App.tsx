import { useState } from 'react'
import { go, useHashRoute } from './hooks/useHashRoute'
import { useProgress } from './hooks/useProgress'
import { useRepertoire } from './hooks/useRepertoire'
import { isDue } from './lib/srs'
import { Drill } from './screens/Drill'
import { Home } from './screens/Home'
import { Import } from './screens/Import'
import { Learn } from './screens/Learn'
import { Settings } from './screens/Settings'
import './App.css'

function App() {
  const rep = useRepertoire()
  const progress = useProgress()
  const [page, id] = useHashRoute()
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
  else body = <Home rep={rep} progress={progress} />

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

export default App
