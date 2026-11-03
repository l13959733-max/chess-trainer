import es from '../locales/es'

// Languages: English (the source text in the code) and Spanish. Each phone picks one; changing it
// reloads the app, so every text is simply looked up once when it is shown.
export type Lang = 'en' | 'es'

const LANG_KEY = 'chess-trainer-lang'

function stored(): Lang | null {
  try {
    const s = localStorage.getItem(LANG_KEY)
    return s === 'en' || s === 'es' ? s : null
  } catch {
    return null
  }
}

// Without a choice: the phone's language
export const lang: Lang = stored() ?? (typeof navigator !== 'undefined' && /^es\b/i.test(navigator.language) ? 'es' : 'en')

export function setLang(next: Lang) {
  try {
    localStorage.setItem(LANG_KEY, next)
  } catch {
    // private mode: the phone's language again next time
  }
  if (next !== lang) window.location.reload()
}

// The text in this phone's language. {name} placeholders are filled from `vars`.
export function t(text: string, vars?: Record<string, string | number>): string {
  const s = (lang === 'es' && es[text]) || text
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s
}

// Piece names with the right article: in Spanish "el caballo" but "la torre"
const PIECES: Record<string, { en: string; es: string; f?: true }> = {
  p: { en: 'pawn', es: 'peón' },
  n: { en: 'knight', es: 'caballo' },
  b: { en: 'bishop', es: 'alfil' },
  r: { en: 'rook', es: 'torre', f: true },
  q: { en: 'queen', es: 'dama', f: true },
  k: { en: 'king', es: 'rey' },
}
export function piece(type: string, form: 'bare' | 'the' | 'a' = 'bare'): string {
  const p = PIECES[type]
  if (lang === 'en') return form === 'the' ? 'the ' + p.en : form === 'a' ? 'a ' + p.en : p.en
  return form === 'the' ? (p.f ? 'la ' : 'el ') + p.es : form === 'a' ? (p.f ? 'una ' : 'un ') + p.es : p.es
}
// Spanish adjective ending for a piece: "atacado" / "atacada"
export function ending(type: string): string {
  return PIECES[type].f ? 'a' : 'o'
}
// A side as the subject of a sentence: "Black" / "las negras"
export function sideName(color: 'w' | 'b', start = false): string {
  const s = lang === 'en' ? (color === 'w' ? 'White' : 'Black') : color === 'w' ? 'las blancas' : 'las negras'
  return start ? s[0].toUpperCase() + s.slice(1) : s
}

// Move notation as taught in Spain: R(ey), D(ama), T(orre), A(lfil), C(aballo)
const PIECES_ES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' }
export function notation(move: string): string {
  return lang === 'es' ? move.replace(/[KQRBN]/g, (c) => PIECES_ES[c]) : move
}
