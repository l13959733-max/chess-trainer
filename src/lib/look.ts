// App look: 'playful' (default, kid-friendly, chunky buttons, mascot) or 'calm' (for adults:
// quiet colours, system font, flat buttons, no mascot on the plain screens).
// BAUPLAN point 17, prototype. Stored per device; the world map keeps its painted style in both.
export type Look = 'playful' | 'calm'
const KEY = 'chess-trainer-look'

export function getLook(): Look {
  try {
    return localStorage.getItem(KEY) === 'calm' ? 'calm' : 'playful'
  } catch {
    return 'playful'
  }
}

export function applyLook(look: Look = getLook()) {
  document.documentElement.classList.toggle('look-calm', look === 'calm')
}

export function setLook(look: Look) {
  try {
    localStorage.setItem(KEY, look)
  } catch {
    /* private mode: still applies for this visit */
  }
  applyLook(look)
}
