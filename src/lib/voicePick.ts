// Picks the nicest female system voice in the app's language (the app's read-aloud voice). Browsers list voices in an
// arbitrary order, and on Apple devices that list includes novelty voices (Albert, Bubbles, Zarvox …).
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy/i
const PREFERRED_ES = ['mónica', 'monica', 'marisol', 'paulina', 'google español', 'microsoft elvira', 'microsoft helena']
const PREFERRED = ['ava', 'samantha', 'allison', 'susan', 'zoe', 'serena', 'karen', 'google us english', 'google uk english female', 'microsoft aria', 'microsoft jenny']

export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
}

export function rankVoice(v: VoiceLike, language: 'en' | 'es' = 'en'): number {
  if (!new RegExp(`^${language}[-_]`, 'i').test(v.lang) && v.lang.toLowerCase() !== language) return -1
  if (NOVELTY.test(v.name)) return -1
  let score = 1
  if (/premium/i.test(v.name)) score += 40
  else if (/enhanced|neural|natural/i.test(v.name)) score += 30
  const i = (language === 'es' ? PREFERRED_ES : PREFERRED).findIndex((p) => v.name.toLowerCase().includes(p))
  if (i >= 0) score += 20 - i
  if (language === 'es') {
    if (/^es[-_]es/i.test(v.lang)) score += 3 // Spain, as spoken on Tenerife
  } else if (/^en[-_]us/i.test(v.lang)) score += 3
  else if (/^en[-_]gb/i.test(v.lang)) score += 2
  return score
}

export function pickVoice<T extends VoiceLike>(voices: T[], language: 'en' | 'es' = 'en'): T | undefined {
  let best: T | undefined
  let bestScore = 0
  for (const v of voices) {
    const s = rankVoice(v, language)
    if (s > bestScore) {
      best = v
      bestScore = s
    }
  }
  return best
}
