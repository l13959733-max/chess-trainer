// Erzeugt die PWA-Icons (PNG) ohne externe Abhängigkeiten: dunkler Grund, 2x2-Schachbrett.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0x14, 0x17, 0x1c], LIGHT = [0xe8, 0xe4, 0xd8], DARK = [0x6f, 0x9a, 0x5e]

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

// pad = Anteil Rand (maskable Icons brauchen eine Sicherheitszone)
function icon(size, pad) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const lo = Math.round(size * pad), hi = size - lo, mid = size / 2
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let c = BG
      if (x >= lo && x < hi && y >= lo && y < hi) c = (x < mid) === (y < mid) ? LIGHT : DARK
      raw.set(c, y * (size * 3 + 1) + 1 + x * 3)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/pwa-192.png', icon(192, 0.19))
writeFileSync('public/pwa-512.png', icon(512, 0.19))
writeFileSync('public/pwa-maskable-512.png', icon(512, 0.25))
writeFileSync('public/apple-touch-icon.png', icon(180, 0.19))
