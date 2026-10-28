// =====================================================
// Locuciones automáticas de hora y clima para el AutoDJ
// Usa el proveedor configurado (Fish Audio o ElevenLabs), con la voz
// elegida por el cliente, y deja el audio en disco para el scheduler.
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

function timeText(timeZone, at = new Date()) {
  let zone = timeZone || 'UTC'
  let parts
  try {
    parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(at)
  } catch {
    zone = 'UTC'
    parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(at)
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

function parseFishVoices(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v) => v && typeof v.id === 'string' && typeof v.name === 'string' &&
        typeof v.referenceId === 'string' && (v.gender === 'male' || v.gender === 'female'))
      .map((v) => ({
        id: v.id.trim(),
        name: v.name.trim(),
        gender: v.gender,
        referenceId: v.referenceId.trim(),
      }))
      .filter((v) => v.id && v.name && v.referenceId)
      .slice(0, 6)
  } catch {
    return []
  }
}

function secret(value) {
  if (!value) return ''
  if (!isEncrypted(value)) return value
  try {
    return decrypt(value)
  } catch {
    return ''
  }
}

async function loadTtsConfig() {
  const [rows] = await pool.query(
    `SELECT ttsProvider,
            fishAudioApiKeyEnc, fishAudioModel, fishAudioReferenceId,
            fishAudioVoices, fishAudioDirection,
            elevenLabsApiKeyEnc, elevenLabsVoiceId, elevenLabsModel, elevenLabsEnabled
     FROM app_config LIMIT 1`
  )
  const row = rows[0]
  if (!row) return { provider: null, fish: null, eleven: null }

  const fishKey = secret(row.fishAudioApiKeyEnc)
  const elevenKey = secret(row.elevenLabsApiKeyEnc)
  return {
    provider: row.ttsProvider === 'fish' ? 'fish' : 'elevenlabs',
    fish: fishKey
      ? {
          apiKey: fishKey,
          model: row.fishAudioModel || 's2.1-pro',
          referenceId: row.fishAudioReferenceId || '',
          voices: parseFishVoices(row.fishAudioVoices),
          direction: row.fishAudioDirection || '',
        }
      : null,
    eleven: row.elevenLabsEnabled && elevenKey && row.elevenLabsVoiceId
      ? {
          apiKey: elevenKey,
          voiceId: row.elevenLabsVoiceId,
          model: row.elevenLabsModel || 'eleven_v4_turbo',
        }
      : null,
  }
}

async function loadClientContext(clientId) {
  const [rows] = await pool.query(
    `SELECT c.timezone, p.aiLiveEnabled, p.aiMonthlyCharacters,
            rs.aiVoiceId, rs.aiVoiceStyle, rs.fishVoiceId
     FROM clients c
     LEFT JOIN plans p ON p.id = c.planId
     LEFT JOIN radio_streams rs ON rs.clientId = c.id
     WHERE c.id = ? LIMIT 1`,
    [clientId]
  )
  return rows[0] || null
}

async function cachePath(clientId, text, cacheKey) {
  const hash = createHash('sha256').update(`${cacheKey}\n${text}`).digest('hex')
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

async function requestFishAudio(text, { apiKey, model, referenceId }) {
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      model,
    },
    body: JSON.stringify({
      text,
      format: 'mp3',
      mp3_bitrate: 192,
      sample_rate: 44100,
      normalize: true,
      language: 'es-CL',
      chunk_length: 300,
      min_chunk_length: 50,
      latency: 'normal',
      max_new_tokens: 1024,
      repetition_penalty: 1.15,
      condition_on_previous_chunks: true,
      early_stop_threshold: 1,
      temperature: 0.85,
      top_p: 0.85,
      features: ['quality-guard'],
      prosody: { speed: 1, volume: 0, normalize_loudness: true },
      reference_id: referenceId,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    let message = `Fish Audio ${res.status}`
    try {
      const data = await res.json()
      message = data?.message || data?.reason || message
    } catch {}
    throw new Error(message)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function requestElevenLabs(text, { apiKey, voiceId, model }, style) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`)
  url.searchParams.set('output_format', 'mp3_44100_128')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    let message = `ElevenLabs ${res.status}`
    try {
      const data = await res.json()
      message = data?.detail?.message || data?.detail || message
    } catch {}
    throw new Error(message)
  }
  return Buffer.from(await res.arrayBuffer())
}

function defaultDirection(type) {
  return type === 'time' ? '[voz clara y cálida]' : '[voz tranquila y luminosa]'
}

export async function generateAnnouncement(clientId, type, { at = new Date() } = {}) {
  const client = await loadClientContext(clientId)
  if (!client?.aiLiveEnabled || !client?.aiMonthlyCharacters) return null
  const tts = await loadTtsConfig()

  let text = null
  if (type === 'time') text = timeText(client.timezone, at)
  if (type === 'weather') text = await weatherText(clientId)
  if (!text) return null

  const style = Math.max(0, Math.min(100, Number(client.aiVoiceStyle) || 0)) / 100
  const order = tts.provider === 'fish' ? ['fish', 'elevenlabs'] : ['elevenlabs', 'fish']
  let lastError = null
  let quotaChecked = false

  for (const provider of order) {
    try {
      let prepared
      if (provider === 'fish') {
        if (!tts.fish) continue
        const voice = tts.fish.voices.find((item) => item.id === client.fishVoiceId)
        const referenceId = voice?.referenceId || tts.fish.referenceId
        if (!referenceId) continue
        const direction = tts.fish.direction || defaultDirection(type)
        prepared = {
          text: `${direction} ${text}`,
          cacheKey: `fish\n${tts.fish.model}\n${referenceId}\n${direction}`,
          request: () => requestFishAudio(`${direction} ${text}`, {
            apiKey: tts.fish.apiKey,
            model: tts.fish.model,
            referenceId,
          }),
        }
      } else {
        if (!tts.eleven) continue
        const voiceId = client.aiVoiceId || tts.eleven.voiceId
        if (!voiceId) continue
        prepared = {
          text,
          cacheKey: `elevenlabs\n${tts.eleven.model}\n${voiceId}\n${style.toFixed(3)}`,
          request: () => requestElevenLabs(text, {
            apiKey: tts.eleven.apiKey,
            voiceId,
            model: tts.eleven.model,
          }, style),
        }
      }

      const file = await cachePath(clientId, prepared.text, prepared.cacheKey)
      try {
        await fs.access(file)
        return { path: file, cached: true, characters: 0, provider }
      } catch {}

      if (!quotaChecked) {
        const [usageRows] = await pool.query(
          `SELECT characters FROM ai_tts_usage WHERE clientId = ? AND period = ? LIMIT 1`,
          [clientId, period()]
        )
        const used = Number(usageRows[0]?.characters || 0)
        if (used + text.length > client.aiMonthlyCharacters) {
          logger.warn({ clientId, type }, 'Cuota IA agotada para locución automática')
          return null
        }
        quotaChecked = true
      }

      const audio = await prepared.request()
      await fs.writeFile(file, audio)
      await consume(clientId, text.length)
      return { path: file, cached: false, characters: text.length, provider }
    } catch (err) {
      lastError = err
      logger.warn(
        { clientId, type, provider, err: err.message },
        'No se pudo generar locución automática; probando siguiente proveedor'
      )
    }
  }

  if (lastError) {
    logger.warn({ clientId, type, err: lastError.message }, 'Locución automática no generada')
  }
  return null
}
