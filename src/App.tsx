import { useState } from 'react'
import { go, useHashRoute } from './hooks/useHashRoute'
import { useRepertoire } from './hooks/useRepertoire'
import { isDue } from './lib/srs'
import { Drill } from './screens/Drill'
import { Home } from './screens/Home'
import { Import } from './screens/Import'
import { Learn } from './screens/Learn'
import './App.css'

function App() {
  const rep = useRepertoire()
  const [page, id] = useHashRoute()
  const line = id ? rep.lines.find((l) => l.id === id) : undefined

  let body: React.ReactNode
  if (!rep.ready) body = <p className="loading">Loading repertoire …</p>
  else if (page === 'learn' && line) body = <Learn line={line} />
  else if (page === 'drill' && line)
    body = (
      <Drill
        key={line.id}
        line={line}
        onDone={(m) => rep.recordDrill(line.id, m)}
        after={(restart) => (
          <>
            <button type="button" onClick={restart}>Again</button>
            <button type="button" className="primary" onClick={() => go('')}>Overview</button>
          </>
        )}
      />
    )
  else if (page === 'review') body = <Review rep={rep} />
  else if (page === 'import') body = <Import rep={rep} />
  else body = <Home rep={rep} />

  return (
    <main className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => go('')}>Chess Trainer</button>
        <span className="user">l0o2</span>
      </header>
      {body}
    </main>
  )
}

// Drill all due lines one after another. The list is fixed when the session starts.
function Review({ rep }: { rep: ReturnType<typeof useRepertoire> }) {
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
      onDone={(m) => rep.recordDrill(line.id, m)}
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
