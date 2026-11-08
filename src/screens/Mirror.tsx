import { Avatar } from '../components/KingArt'
import { go } from '../hooks/useHashRoute'
import { MIRROR, isOpen, loadKing, mirrorOpen } from '../lib/king'
import '../king.css'

const IMG = import.meta.env.BASE_URL + 'king/'

// Act 2: the Mirror World. Places you know, reversed – now you play Black against the Shadow King's generals.
export function Mirror() {
  const k = loadKing()
  const next = MIRROR.find((s) => !k.beaten.includes(s.id))
  return (
    <div className="screen king-screen mirror-screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to the world map">←</button>
        <div>
          <div className="eyebrow">Act 2 · you play Black</div>
          <h2>The Mirror World</h2>
        </div>
      </div>
      <div className="king-say-row">
        <img className="king-avatar mirror-lu" src={IMG + 'lu.jpg'} alt="Grandmaster Lu" />
        <p className="king-say">
          {mirrorOpen(k.beaten)
            ? 'In the mirror everything is reversed, Liam. The Shadow King moves first – you answer with Black. Beat his six shadows, one after another.'
            : 'The mirror is still dark. Beat Count Giuoco in Rome first – then you know how to react with White.'}
        </p>
      </div>
      {mirrorOpen(k.beaten) && (
        <>
          {MIRROR.map((s) => {
            const done = k.beaten.includes(s.id)
            const open = isOpen(s, k.beaten)
            return (
              <button key={s.id} type="button" className={`mirror-card ${done ? 'complete' : ''} ${s === next ? 'next' : ''} ${open ? '' : 'locked'}`} onClick={() => go(`king/${s.id}`)} disabled={!open}>
                <img src={IMG + s.scene} alt="" />
                <span>
                  <small>{done ? `✓ ${s.boss.name} beaten` : s === next ? '▶ Next' : '🔒 In the fog – beat the shadow before'}</small>
                  <b>{s.name}</b>
                  {s.intro}
                </span>
              </button>
            )
          })}
          {next ? (
            <button type="button" className="primary wide" onClick={() => go(`king/${next.id}/next`)}>Continue: {next.name}</button>
          ) : (
            <div className="king-fb ok knack">
              <b>All six shadows are beaten</b>
              <p>You have three answers to 1.e4 and three to 1.d4. Find more in the opening atlas.</p>
            </div>
          )}
        </>
      )}
      <div className="king-say-row">
        <Avatar who="hoppy" className="king-avatar" />
        <p className="king-say">Hoppy snorts at his own reflection. He does not like mirrors.</p>
      </div>
    </div>
  )
}
