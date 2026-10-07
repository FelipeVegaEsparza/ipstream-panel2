// =====================================================
// IPStream Streaming Agent — config
// Carga y valida las variables de entorno al arranque.
// =====================================================

import 'dotenv/config'

function required(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback
    throw new Error(`Variable de entorno requerida: ${name}`)
  }
  return v
}

function intEnv(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  const n = parseInt(v, 10)
  if (Number.isNaN(n)) throw new Error(`${name} debe ser un entero, recibido: ${v}`)
  return n
}

function listEnv(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback
    return []
  }
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

// Dimensiones conocidas para cada nombre de rendición del ladder ABR.
const LADDER_DIMS = {
  '1080p': [1920, 1080],
  '720p': [1280, 720],
  '480p': [854, 480],
  '360p': [640, 360],
}

// Parsea TV_VIDEO_LADDER ("1080p:2000,720p:1000") a un array ordenado de mayor
// a menor resolución: [{ name, bitrateKbps, width, height }].
function parseLadder(str) {
  const out = String(str)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, kbps] = part.split(':')
      const dims = LADDER_DIMS[name] || LADDER_DIMS['1080p']
      const bitrateKbps = parseInt(kbps, 10)
      return {
        name,
        bitrateKbps: Number.isNaN(bitrateKbps) ? 1500 : bitrateKbps,
        width: dims[0],
        height: dims[1],
      }
    })
  out.sort((a, b) => b.height - a.height)
  return out
}

export const config = {
  port: intEnv('PORT', 4000),
  host: required('HOST', '0.0.0.0'),
  logLevel: required('LOG_LEVEL', 'info'),
  nodeEnv: required('NODE_ENV', 'production'),

  // Auth
  agentToken: required('STREAMING_AGENT_TOKEN'),
  harborCallbackSecret: required('HARBOR_CALLBACK_SECRET'),
  corsAllowedOrigins: listEnv('CORS_ALLOWED_ORIGINS'),

  // DB
  db: {
    host: required('DB_HOST', 'db'),
    port: intEnv('DB_PORT', 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_DATABASE'),
    connectionLimit: intEnv('DB_CONNECTION_LIMIT', 10),
  },

  // Icecast
  ice: {
    host: required('ICE_HOST', 'icecast'),
    port: intEnv('ICE_PORT', 8000),
    adminUser: required('ICE_ADMIN_USER'),
    adminPassword: required('ICE_ADMIN_PASSWORD'),
    // Password compartida de fallback. En producción cada mount usa su propia
    // livePassword descifrada desde la DB (ver icecast-config.js).
    sourcePassword: required('ICE_SOURCE_PASSWORD'),
    relayPassword: required('ICE_RELAY_PASSWORD'),
    hostname: required('ICE_HOSTNAME'),
  },

  // Public hostname DJs use to reach the Liquidsoap harbor input
  harborPublicHostname: required('HARBOR_PUBLIC_HOSTNAME'),

  // Liquidsoap
  liquidsoap: {
    bin: required('LIQUIDSOAP_BIN', '/usr/bin/liquidsoap'),
    scriptsPath: required('LIQUIDSOAP_SCRIPTS_PATH', '/etc/liquidsoap/scripts'),
    logPath: required('LIQUIDSOAP_LOG_PATH', '/var/log/liquidsoap'),
    telnetBasePort: intEnv('LIQUIDSOAP_TELNET_BASE_PORT', 12340),
    host: required('LIQUIDSOAP_HOST', 'liquidsoap'),
  },

  // Radio library
  library: {
    path: required('RADIO_LIBRARY_PATH', '/var/lib/radio'),
  },

  // Video (Televisión)
  video: {
    // Tamaño máximo de una subida de video de TV, en MB.
    maxUploadMb: intEnv('MAX_VIDEO_UPLOAD_MB', 2048),
    // Timeout de ffmpeg para normalizar video, en ms (0 = sin límite).
    ffmpegTimeoutMs: intEnv('FFMPEG_TIMEOUT_MS', 0),
    // Preset de x264 para normalizar. ultrafast/veryfast reducen mucho la CPU
    // a costa de algo de calidad a igual bitrate.
    preset: required('FFMPEG_PRESET', 'veryfast'),
    // Hilos por job de normalización (0 = auto).
    threads: intEnv('FFMPEG_THREADS', 0),
    // Bitrate del H.264 de TV, en kbps. Target + maxrate + bufsize (x264).
    // 1500k entra cómodo en conexiones hogareñas; subilo si querés más calidad.
    bitrateKbps: intEnv('TV_VIDEO_BITRATE', 1500),
    maxrateKbps: intEnv('TV_VIDEO_MAXRATE', 1700),
    bufsizeKbps: intEnv('TV_VIDEO_BUFSIZE', 3000),
    // Ladder ABR (VOD2Live): rendiciones a empaquetar por video. Formato
    // "nombre:bitrateKbps" separado por comas, mayor→menor resolución.
    ladder: parseLadder(required('TV_VIDEO_LADDER', '1080p:2000,720p:1000')),
    // Modo de playout de TV:
    //   'stitch' = VOD2Live (empaqueta HLS por asset + manifiesto vivo; sin concat)
    //   'concat' = legacy (concat -c copy a RTMP/SRS, requiere formato uniforme)
    playout: required('TV_PLAYOUT', 'stitch'),
  },
}
