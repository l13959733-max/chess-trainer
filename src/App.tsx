import { useEffect, useState } from 'react'
import { go, useHashRoute } from './hooks/useHashRoute'
import { useAnalyzer } from './hooks/useAnalyzer'
import { useProgress } from './hooks/useProgress'
import { usePuzzles } from './hooks/usePuzzles'
import { useRepertoire } from './hooks/useRepertoire'
import { getPlayer } from './lib/chesscom'
import type { Puzzle } from './lib/db'
import { isDbBlocked } from './lib/db'
import { isDue } from './lib/srs'
import { isUnlocked, stop as stopVoice, unlockAudio } from './lib/voice'
import { Drill } from './screens/Drill'
import { Home } from './screens/Home'
import { Import } from './screens/Import'
import { Learn } from './screens/Learn'
import { Play } from './screens/Play'
import { PuzzleView } from './screens/PuzzleScreen'
import { Settings } from './screens/Settings'
import { ThreatView } from './screens/Threat'
import { Weaknesses } from './screens/Weaknesses'
import type { Category } from './lib/weakness'
import { CATEGORY } from './lib/weakness'
import './App.css'

function App() {
  const rep = useRepertoire()
  const progress = useProgress()
  const analyzer = useAnalyzer()
  const [player, setPlayerState] = useState(getPlayer)
  // Bumped when a game against Hoppy-Bot added puzzles
  const [botFound, setBotFound] = useState(0)
  const puzzles = usePuzzles(analyzer.analyzed + botFound, player)
  const [page, id, arg] = useHashRoute()

  // Reading stops when the screen changes; the first tap unlocks audio for automatic reading (iOS)
  useEffect(() => stopVoice, [page, id, arg])
  useEffect(() => {
    // iOS: only the end of a tap counts, so listen to those and keep trying until sound is allowed
    const events = ['touchend', 'pointerup', 'click', 'keydown'] as const
    const tryUnlock = () => {
      unlockAudio()
      if (isUnlocked()) events.forEach((e) => window.removeEventListener(e, tryUnlock))
    }
    events.forEach((e) => window.addEventListener(e, tryUnlock))
    return () => events.forEach((e) => window.removeEventListener(e, tryUnlock))
  }, [])
  const line = id ? rep.lines.find((l) => l.id === id) : undefined

  let body: React.ReactNode
  if (!rep.ready) body = <Loading />
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
            <button type="button" onClick={() => go('play/line/' + line.id)}>Play on</button>
            <button type="button" className="primary" onClick={() => go('')}>Overview</button>
          </>
        )}
      />
    )
  else if (page === 'review') body = <Review rep={rep} progress={progress} />
  else if (page === 'import') body = <Import rep={rep} />
  else if (page === 'settings') body = <Settings lines={rep.lines} player={player} onPlayer={setPlayerState} />
  else if (page === 'voice') body = <Settings lines={rep.lines} player={player} onPlayer={setPlayerState} incoming={id ? decodeURIComponent(id) : undefined} />
  else if (page === 'player') body = <Settings lines={rep.lines} player={player} onPlayer={setPlayerState} incomingPlayer={id ? decodeURIComponent(id) : undefined} />
  else if (page === 'play') {
    const playLine = id === 'line' ? rep.lines.find((l) => l.id === arg) : undefined
    const playPuzzle = id === 'puzzle' ? puzzles.puzzles.find((p) => p.id === decodeURIComponent(arg ?? '')) : undefined
    const mode = playLine ? { kind: 'line' as const, line: playLine } : playPuzzle ? { kind: 'puzzle' as const, puzzle: playPuzzle } : { kind: 'new' as const }
    body = <Play key={`${id ?? ''}/${arg ?? ''}`} mode={mode} lines={rep.lines} player={player} onGame={progress.recordGame} onPuzzlesFound={() => setBotFound((n) => n + 1)} />
  } else if (page === 'puzzles') body = <PuzzleSession key={id ?? 'all'} puzzles={puzzles} progress={progress} category={id && id in CATEGORY ? (id as Category) : undefined} />
  else if (page === 'threats') body = <ThreatSession key={id ?? 'all'} puzzles={puzzles} progress={progress} category={id && id in CATEGORY ? (id as Category) : undefined} />
  else if (page === 'weaknesses') body = <Weaknesses puzzles={puzzles} player={player} />
  else body = <Home rep={rep} progress={progress} puzzles={puzzles} analyzer={analyzer} player={player} />

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

// With a category: only that kind of mistake – and when none is due, practise the oldest ones anyway.
function sessionQueue(puzzles: ReturnType<typeof usePuzzles>, prefix: 'p:' | 't:', keep: (p: Puzzle) => boolean): string[] {
  const now = Date.now()
  const pool = puzzles.puzzles.filter(keep)
  const due = pool.filter((p) => { const s = puzzles.srs.get(prefix + p.id); return s && isDue(s, now) })
  const fresh = pool.filter((p) => !puzzles.srs.get(prefix + p.id))
  const queue = [...due, ...fresh.slice(0, NEW_PER_SESSION)]
  if (!queue.length) {
    const rest = pool.map((p) => ({ p, at: puzzles.srs.get(prefix + p.id)?.due ?? 0 })).sort((a, b) => a.at - b.at)
    queue.push(...rest.slice(0, NEW_PER_SESSION).map((x) => x.p))
  }
  return queue.map((p) => p.id)
}

function PuzzleSession({ puzzles, progress, category }: { puzzles: ReturnType<typeof usePuzzles>; progress: ReturnType<typeof useProgress>; category?: Category }) {
  const [queue] = useState(() =>
    category ? sessionQueue(puzzles, 'p:', (p) => p.category === category) : [...puzzles.due, ...puzzles.fresh.slice(0, NEW_PER_SESSION)].map((p) => p.id),
  )
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

// "What's the threat?" positions: mistakes where the opponent could punish, with the stored answer
function ThreatSession({ puzzles, progress, category }: { puzzles: ReturnType<typeof usePuzzles>; progress: ReturnType<typeof useProgress>; category?: Category }) {
  const [queue] = useState(() =>
    sessionQueue(puzzles, 't:', (p) => !!p.refutation && !!p.category && CATEGORY[p.category].family === 'opponent' && (!category || p.category === category)),
  )
  const [index, setIndex] = useState(0)
  const puzzle = puzzles.puzzles.find((p) => p.id === queue[index])

  if (!puzzle) {
    return (
      <div className="screen">
        <div className="done">
          <div className="done-title">{queue.length ? 'Well done – that was the whole round' : 'Nothing here yet'}</div>
          {!queue.length && <p>These positions come from your analysed games. Older ones are still being sorted – try again in a few minutes.</p>}
          <div className="done-actions">
            <button type="button" onClick={() => go('')}>Overview</button>
            <button type="button" className="primary" onClick={() => go('weaknesses')}>My weaknesses</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ThreatView
      key={puzzle.id}
      puzzle={puzzle}
      progress={`${index + 1} of ${queue.length}`}
      onSolved={async (m) => ({ srs: await puzzles.record(puzzle.id, m, 't:'), reward: await progress.recordPuzzle(m) })}
      onNext={() => setIndex(index + 1)}
      isLast={index + 1 >= queue.length}
    />
  )
}

// Normally gone in a blink. If it takes longer, say why and what helps.
function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className="screen">
      <p className="loading">Loading repertoire …</p>
      {slow && (
        <div className="explain wrong">
          <div className="move">This takes too long</div>
          <p>
            {isDbBlocked()
              ? 'Another Chess Trainer tab or window is still open with an older version. Close all other Chess Trainer tabs, then reload this one.'
              : 'Close all other Chess Trainer tabs, then reload this page.'}
          </p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}
    </div>
  )
}

export default App
