// =====================================================
// Locuciones automáticas de hora y clima para el AutoDJ
// Genera el audio con ElevenLabs y lo deja en disco para que el scheduler
// lo empuje a la cola de anuncios de Liquidsoap.
// =====================================================

import { createHash, randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'
import { pool } from './db.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { decrypt, isEncrypted } from './encryption.js'

const ANNOUNCE_DIR = join(config.library.path)

function period() {
  return new Date().toISOString().slice(0, 7)
}

function weatherPhrase(code) {
  if (code == null) return 'condiciones variables'
  if (code === 0) return 'cielo despejado'
  if (code === 1) return 'cielo mayormente despejado'
  if (code === 2) return 'cielo parcialmente nublado'
  if (code === 3) return 'cielo nublado'
  if (code === 45 || code === 48) return 'niebla'
  if (code >= 51 && code <= 57) return 'llovizna'
  if (code >= 61 && code <= 67) return 'lluvia'
  if (code >= 71 && code <= 77) return 'nieve'
  if (code >= 80 && code <= 82) return 'chubascos'
  if (code === 85 || code === 86) return 'chubascos de nieve'
  if (code >= 95) return 'tormenta'
  return 'condiciones variables'
}

function timeText(timeZone) {
  let zone = timeZone || 'UTC'
  let parts
  try {
    parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
  } catch {
    zone = 'UTC'
    parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
  }
  const rawHour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const hour = rawHour === 24 ? 0 : rawHour
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return minute === 0
    ? `Son las ${hour} horas en punto.`
    : `Son las ${hour} horas con ${minute} minutos.`
}

async function weatherText(clientId) {
  const [rows] = await pool.query(
    `SELECT city, country, latitude, longitude FROM basic_data WHERE clientId = ? LIMIT 1`,
    [clientId]
  )
  const basic = rows[0]
  if (!basic?.city || basic.latitude == null || basic.longitude == null) return null
  const unit = basic.country === 'US' ? 'fahrenheit' : 'celsius'
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(basic.latitude))
  url.searchParams.set('longitude', String(basic.longitude))
  url.searchParams.set('current_weather', 'true')
  url.searchParams.set('temperature_unit', unit)
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const data = await res.json()
  const current = data?.current_weather
  if (!current || typeof current.temperature !== 'number') return null
  const unitLabel = unit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius'
  return `En ${basic.city}, la temperatura actual es de ${Math.round(current.temperature)} grados ${unitLabel}, con ${weatherPhrase(current.weathercode)}.`
}

async function loadTtsConfig() {
  const [rows] = await pool.query(
    `SELECT elevenLabsApiKeyEnc, elevenLabsVoiceId, elevenLabsModel, elevenLabsEnabled
     FROM app_config LIMIT 1`
  )
  const row = rows[0]
  if (!row || !row.elevenLabsEnabled || !row.elevenLabsApiKeyEnc || !row.elevenLabsVoiceId) return null
  let apiKey = row.elevenLabsApiKeyEnc
  if (isEncrypted(apiKey)) {
    try { apiKey = decrypt(apiKey) } catch { return null }
  }
  return {
    apiKey,
    voiceId: row.elevenLabsVoiceId,
    model: row.elevenLabsModel || 'eleven_v4_turbo',
  }
}

async function loadClientContext(clientId) {
  const [rows] = await pool.query(
    `SELECT c.timezone, p.aiLiveEnabled, p.aiMonthlyCharacters
     FROM clients c LEFT JOIN plans p ON p.id = c.planId
     WHERE c.id = ? LIMIT 1`,
    [clientId]
  )
  return rows[0] || null
}

async function cachePath(clientId, text, voiceId, model) {
  const hash = createHash('sha256').update(`${model}\n${voiceId}\n${text}`).digest('hex')
  const dir = join(ANNOUNCE_DIR, clientId, 'announcements')
  await fs.mkdir(dir, { recursive: true })
  return join(dir, `${hash}.mp3`)
}

async function consume(clientId, characters) {
  const p = period()
  await pool.query(
    `INSERT INTO ai_tts_usage (id, clientId, period, characters, requests, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE characters = characters + VALUES(characters), requests = requests + 1, updatedAt = NOW()`,
    [randomUUID(), clientId, p, characters]
  )
}

export async function generateAnnouncement(clientId, type) {
  const client = await loadClientContext(clientId)
  if (!client?.aiLiveEnabled || !client?.aiMonthlyCharacters) return null
  const tts = await loadTtsConfig()
  if (!tts) return null

  let text = null
  if (type === 'time') text = timeText(client.timezone)
  if (type === 'weather') text = await weatherText(clientId)
  if (!text) return null

  const file = await cachePath(clientId, text, tts.voiceId, tts.model)
  try {
    await fs.access(file)
    return { path: file, cached: true, characters: 0 }
  } catch {}

  const [usageRows] = await pool.query(
    `SELECT characters FROM ai_tts_usage WHERE clientId = ? AND period = ? LIMIT 1`,
    [clientId, period()]
  )
  const used = Number(usageRows[0]?.characters || 0)
  if (used + text.length > client.aiMonthlyCharacters) {
    logger.warn({ clientId, type }, 'Cuota IA agotada para locución automática')
    return null
  }

  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(tts.voiceId)}`)
  url.searchParams.set('output_format', 'mp3_44100_128')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': tts.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: tts.model }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    let message = `ElevenLabs ${res.status}`
    try {
      const data = await res.json()
      message = data?.detail?.message || data?.detail || message
    } catch {}
    logger.warn({ clientId, type, message }, 'No se pudo generar locución automática')
    return null
  }

  const audio = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(file, audio)
  await consume(clientId, text.length)
  return { path: file, cached: false, characters: text.length }
}
