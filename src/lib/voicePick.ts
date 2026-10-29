// Picks the nicest English system voice for the phone fallback. Browsers list voices in an
// arbitrary order, and on Apple devices that list includes novelty voices (Albert, Bubbles, Zarvox …).
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy/i
const PREFERRED = ['ava', 'samantha', 'allison', 'susan', 'zoe', 'serena', 'karen', 'daniel', 'google us english', 'google uk english female', 'microsoft aria', 'microsoft jenny']

export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
}

export function rankVoice(v: VoiceLike): number {
  if (!/^en[-_]/i.test(v.lang) && v.lang.toLowerCase() !== 'en') return -1
  if (NOVELTY.test(v.name)) return -1
  let score = 1
  if (/premium/i.test(v.name)) score += 40
  else if (/enhanced|neural|natural/i.test(v.name)) score += 30
  const i = PREFERRED.findIndex((p) => v.name.toLowerCase().includes(p))
  if (i >= 0) score += 20 - i
  if (/^en[-_]us/i.test(v.lang)) score += 3
  else if (/^en[-_]gb/i.test(v.lang)) score += 2
  return score
}

export function pickVoice<T extends VoiceLike>(voices: T[]): T | undefined {
  let best: T | undefined
  let bestScore = 0
  for (const v of voices) {
    const s = rankVoice(v)
    if (s > bestScore) {
      best = v
      bestScore = s
    }
  }
  return best
}
