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
          <MirrorMap beaten={k.beaten} next={next?.id} />
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

// The painted world map, mirrored: the six shadows where their cities lie in the mirror, joined by your road
function MirrorMap({ beaten, next }: { beaten: string[]; next?: string }) {
  const road = MIRROR.map((s) => `${s.x},${s.y}`).join(' ')
  return (
    <svg className="mirror-map" viewBox="268 55 830 470" role="img" aria-label="The mirrored world map with the six shadows">
      <defs>
        <clipPath id="mirror-clip"><circle r="30" /></clipPath>
      </defs>
      <image href={IMG + 'mirror-world.jpg'} x="0" y="0" width="1800" height="764" preserveAspectRatio="none" />
      <polyline points={road} fill="none" stroke="#e9dcff" strokeWidth="4" strokeDasharray="10 9" opacity=".8" />
      {MIRROR.map((s) => {
        const done = beaten.includes(s.id)
        const open = isOpen(s, beaten)
        return (
          <g key={s.id} transform={`translate(${s.x},${s.y})`} className={`mirror-stop ${open ? '' : 'locked'}`} role="button" tabIndex={open ? 0 : -1} aria-label={`${s.name}${done ? ', beaten' : open ? '' : ', still in the fog'}`} onClick={() => open && go(`king/${s.id}`)} onKeyDown={(e) => e.key === 'Enter' && open && go(`king/${s.id}`)}>
            {s.id === next && <circle r="40" fill="#c9a8ff" opacity=".45" className="king-pulse" />}
            <circle r="33" fill={done ? '#c9a227' : '#2b2140'} />
            <image href={IMG + s.scene} x="-30" y="-30" width="60" height="60" clipPath="url(#mirror-clip)" preserveAspectRatio="xMidYMid slice" opacity={open ? 1 : 0.35} />
            {!open && <text y="9" textAnchor="middle" fontSize="24" aria-hidden="true">🔒</text>}
            {done && <text x="24" y="-20" textAnchor="middle" fontSize="18" aria-hidden="true">✓</text>}
            <text className="king-label mirror-label" y="52" textAnchor="middle">{s.name.replace('The ', '')}</text>
          </g>
        )
      })}
    </svg>
  )
}
