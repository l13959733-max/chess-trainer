// Builds public/voice/: every sentence the app reads, in Lu's cloned voice (m4a), plus manifest.json.
// Lu decided to publish these clips with the app (29.10.2026) so everyone who opens it hears his voice.
// Needs the voice changer running on the Mac (./klon-oberflaeche or Chess-Voice.command).
// Usage: node scripts/build-voice.mjs   (only missing sentences are generated)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const SERVER = process.env.VOICE_SERVER ?? 'http://127.0.0.1:8090'
const VOICE = process.env.VOICE_NAME ?? 'stimme1'
const DIR = 'public/voice'

// Load the app's own modules, so the sentences match exactly what the app reads
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { builtinLines } = await vite.ssrLoadModule('/src/lib/repertoire.ts')
const { voiceTexts, TRY_IT } = await vite.ssrLoadModule('/src/lib/speech.ts')
await vite.close()
const texts = [...voiceTexts(builtinLines), TRY_IT]

mkdirSync(DIR, { recursive: true })
const manifestPath = `${DIR}/manifest.json`
const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { clips: {} }
const clips = {}
let made = 0
for (const [i, text] of texts.entries()) {
  const file = createHash('sha1').update(`${VOICE}|${text}`).digest('hex').slice(0, 16) + '.m4a'
  if (!existsSync(`${DIR}/${file}`)) {
    const res = await fetch(`${SERVER}/speak?fmt=share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'en', voice: VOICE }),
    })
    if (!res.ok) throw new Error(`voice changer answered ${res.status} for: ${text}`)
    writeFileSync(`${DIR}/${file}`, Buffer.from(await res.arrayBuffer()))
    made++
  }
  clips[text] = file
  process.stdout.write(`\r${i + 1}/${texts.length}`)
}
writeFileSync(manifestPath, JSON.stringify({ voice: VOICE, clips }, null, 1) + '\n')
const dropped = Object.keys(old.clips ?? {}).filter((t) => !clips[t]).length
console.log(`\n${texts.length} sentences, ${made} new, ${dropped} no longer used`)
