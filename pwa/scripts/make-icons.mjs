#!/usr/bin/env node
/**
 * Genera los iconos PNG de la PWA (192/512/maskable/apple-touch) con Node puro
 * (zlib + escritura manual del formato PNG). Dibuja un triángulo "play" blanco
 * centrado sobre el color de marca. Uso: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'public')
const BRAND = [26, 26, 46] // #1a1a2e
const WHITE = [243, 246, 250]

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function blend(base, over, alpha) {
  return [
    Math.round(base[0] + (over[0] - base[0]) * alpha),
    Math.round(base[1] + (over[1] - base[1]) * alpha),
    Math.round(base[2] + (over[2] - base[2]) * alpha)
  ]
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

function renderIcon(size, triangleScale) {
  const rgba = Buffer.alloc(size * size * 4)
  // triángulo "play" apuntando a la derecha, centrado y escalado
  const cx = size / 2
  const cy = size / 2
  const w = size * 0.4 * triangleScale
  const h = size * 0.4 * triangleScale
  const ax = cx - w * 0.55
  const ay = cy - h
  const bx = cx - w * 0.55
  const by = cy + h
  const ccx = cx + w * 0.55
  const ccy = cy
  const SS = 3 // supersampling 3x3
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (pointInTriangle(px, py, ax, ay, bx, by, ccx, ccy)) hits++
        }
      }
      const alpha = hits / (SS * SS)
      const [r, g, b] = alpha > 0 ? blend(BRAND, WHITE, alpha) : BRAND
      const idx = (y * size + x) * 4
      rgba[idx] = r
      rgba[idx + 1] = g
      rgba[idx + 2] = b
      rgba[idx + 3] = 255
    }
  }
  return encodePng(size, size, rgba)
}

const targets = [
  ['favicon.png', 48, 1],
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.62], // contenido dentro del área segura
  ['apple-touch-icon.png', 180, 1]
]

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, size, scale] of targets) {
  const png = renderIcon(size, scale)
  const file = resolve(OUT_DIR, name)
  writeFileSync(file, png)
  console.log(`✓ ${file} (${size}x${size}, ${png.length} bytes)`)
}
