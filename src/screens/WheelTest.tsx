import { useState } from 'react'
import { AnimatedList } from '../components/AnimatedList'
import { BubbleMenu } from '../components/BubbleMenu'
import { OptionWheel } from '../components/OptionWheel'
import { go } from '../hooks/useHashRoute'
import '../training.css'

// #/wheel – a test page to feel three ways of choosing where to go (Lu, 25.11.2026: "nur zum Ausprobieren"):
// the option wheel, the animated list and the bubble menu (all from React Bits). Same places in all three; tapping
// one opens it. Nothing else in the app uses them yet.
const PLACES: { name: string; to: string; say: string; icon: string; color: string }[] = [
  { name: 'Today', to: 'today', say: 'Your day: the week, the threat check, today’s path and every trainer.', icon: '🔥', color: '#4fc414' },
  { name: 'Journey', to: 'journey', say: 'The world map – Hoppy’s story, city by city.', icon: '🧭', color: '#2ea7f0' },
  { name: 'Progress', to: 'progress', say: 'How you got better: rating, safe moves, mistakes.', icon: '📊', color: '#8a5cf6' },
  { name: 'Today’s path', to: 'tent', say: 'Today’s levels, one after another.', icon: '⭐', color: '#e0a200' },
  { name: 'Square Rush', to: 'rush', say: 'Learn the squares – 60 seconds.', icon: '💥', color: '#ef4a5a' },
  { name: 'Puzzle Rush', to: 'puzzle-rush', say: '3 minutes, 3 lives.', icon: '⏱', color: '#2ea7f0' },
  { name: 'Opening Rush', to: 'opening-rush', say: 'Your openings on time.', icon: '⚡', color: '#4fc414' },
  { name: 'All openings', to: 'path', say: 'Every line you know, chapter by chapter.', icon: '🪙', color: '#e0a200' },
  { name: 'Hoppy-Bot', to: 'play', say: 'A game against Hoppy at your level.', icon: '🐴', color: '#8a5cf6' },
  { name: 'Armoury', to: 'armoury', say: 'Tactics to endgame – bronze, silver, gold.', icon: '🛡', color: '#2ea7f0' },
  { name: 'Weaknesses', to: 'weaknesses', say: 'Your own mistakes, sorted and trained.', icon: '🧩', color: '#ef4a5a' },
  { name: 'Diary', to: 'diary', say: 'What you learned in every city.', icon: '📔', color: '#e0a200' },
  { name: 'Settings', to: 'settings', say: 'Sound, look, your chess.com account.', icon: '⚙️', color: '#8a849c' },
]
type Kind = 'wheel' | 'list' | 'bubbles'
type Shape = 'left' | 'right' | 'flat'

export function WheelTest() {
  const [kind, setKind] = useState<Kind>('wheel')
  const [i, setI] = useState(0)
  const [shape, setShape] = useState<Shape>('left')
  const p = PLACES[i]
  return (
    <div className="trn wht">
      <div className="wht-in">
        <header className="trn-head">
          <button type="button" className="trn-back" onClick={() => go('today')} aria-label="Back to Daily">←</button>
          <div className="grow">
            <h1>Try the menus</h1>
            <p>Three ways to get around – which feels best?</p>
          </div>
        </header>
        <div className="wht-seg" role="group" aria-label="Menu">
          {(['wheel', 'list', 'bubbles'] as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === 'wheel' ? 'Wheel' : k === 'list' ? 'List' : 'Bubbles'}
            </button>
          ))}
        </div>

        {kind === 'wheel' && (
          <>
            <div className="wht-seg wht-sub" role="group" aria-label="Shape">
              {(['left', 'right', 'flat'] as Shape[]).map((s) => (
                <button key={s} type="button" aria-pressed={shape === s} onClick={() => setShape(s)}>
                  {s === 'left' ? 'Curve left' : s === 'right' ? 'Curve right' : 'Straight'}
                </button>
              ))}
            </div>
            <div className={`wht-wheel wht-${shape}`}>
              <i className="wht-mark" aria-hidden="true" />
              <OptionWheel
                key={shape}
                items={PLACES.map((x) => x.name)}
                defaultSelected={i}
                side={shape === 'right' ? 'right' : 'left'}
                curve={shape === 'flat' ? 0 : 1}
                tilt={shape === 'flat' ? 0 : 7}
                onChange={(n) => setI(n)}
                onPick={(n) => go(PLACES[n].to)}
                label="Places in Hoppy"
              />
            </div>
            <div className="wht-card">
              <p>{p.say}</p>
              <button type="button" className="wht-go" onClick={() => go(p.to)}>Open {p.name}</button>
            </div>
          </>
        )}

        {kind === 'list' && (
          <div className="wht-list">
            <AnimatedList
              items={PLACES.map((x) => ({ id: x.to, icon: x.icon, title: x.name, description: x.say }))}
              onItemSelect={(_, n) => go(PLACES[n].to)}
              initialSelectedIndex={0}
              theme="hoppy"
              width="100%"
              maxHeight="100%"
              gap={8}
              radius={16}
            />
          </div>
        )}

        {kind === 'bubbles' && (
          <div className="wht-bubbles">
            <BubbleMenu
              logo={<><span aria-hidden="true">🐴</span> Hoppy</>}
              items={PLACES.slice(0, 7).map((x) => ({ label: x.name, ariaLabel: x.name, onClick: () => go(x.to), hoverStyles: { bgColor: x.color, textColor: '#fff' } }))}
              menuAriaLabel="Open the menu"
              menuBg="#ffffff"
              menuContentColor="#3a3450"
            />
            <p className="wht-hint">Tap the round button top right ↗</p>
          </div>
        )}
      </div>
    </div>
  )
}
