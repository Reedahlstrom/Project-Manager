/**
 * Generates the PWA placeholder icons with no image dependencies.
 *
 * Writes a minimal PNG by hand (IHDR/IDAT/IEND, filter type 0) so the repo
 * doesn't need sharp or an image toolchain just to produce three squares.
 *
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')

const BG = [0x0a, 0x0b, 0x0d]
const ACCENT = [0x4d, 0x8d, 0xf7]

// --- PNG plumbing -----------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** pixels: Uint8Array of size*size*4 (RGBA) */
function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Prepend a zero filter byte to every scanline.
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- The mark ---------------------------------------------------------------

/**
 * Three stacked bars of decreasing width — a rhythm, which is what "cadence"
 * means and what the tool is for. Placeholder until there's a real mark.
 *
 * @param {number} size
 * @param {boolean} maskable  full-bleed background, mark kept inside the 80% safe zone
 */
function drawIcon(size, maskable) {
  const px = new Uint8Array(size * size * 4)

  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = 255
  }

  // Background. Non-maskable icons get rounded corners; maskable ones stay
  // square because the launcher applies its own mask.
  const cornerR = maskable ? 0 : size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cornerR > 0) {
        const cx = x < cornerR ? cornerR : x > size - cornerR ? size - cornerR : x
        const cy = y < cornerR ? cornerR : y > size - cornerR ? size - cornerR : y
        if (Math.hypot(x - cx, y - cy) > cornerR) continue // leave transparent
      }
      set(x, y, BG)
    }
  }

  // The bars. Scale down inside the safe zone for maskable.
  const s = maskable ? 0.62 : 0.78
  const barH = Math.round(size * 0.1 * s)
  const gap = Math.round(size * 0.075 * s)
  const widths = [0.56, 0.42, 0.28].map((w) => Math.round(size * w * s))
  const totalH = barH * 3 + gap * 2
  const startY = Math.round((size - totalH) / 2)
  const startX = Math.round((size - widths[0]) / 2)
  const r = barH / 2

  widths.forEach((w, idx) => {
    const y0 = startY + idx * (barH + gap)
    for (let y = y0; y < y0 + barH; y++) {
      for (let x = startX; x < startX + w; x++) {
        // Rounded bar ends.
        const cx = x < startX + r ? startX + r : x > startX + w - r ? startX + w - r : x
        const cy = y < y0 + r ? y0 + r : y > y0 + barH - r ? y0 + barH - r : y
        if (Math.hypot(x - cx, y - cy) > r) continue
        set(x, y, ACCENT)
      }
    }
  })

  return px
}

// --- Emit -------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
]

for (const [name, size, maskable] of targets) {
  writeFileSync(resolve(OUT_DIR, name), encodePng(size, drawIcon(size, maskable)))
  console.log(`wrote public/icons/${name} (${size}x${size}${maskable ? ', maskable' : ''})`)
}
