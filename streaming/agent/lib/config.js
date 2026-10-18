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

  // Analytics (analytics-redesign) — muestreo de audiencia y sesiones
  analytics: {
    // Intervalo de muestreo de audiencia (ms).
    sampleIntervalMs: intEnv('ANALYTICS_SAMPLE_INTERVAL_MS', 60_000),
    // Intervalo de rollups (ms). Por defecto 5 min: recalcula la última ventana
    // (upserts idempotentes) para que el dashboard no espere hasta la hora.
    rollupIntervalMs: intEnv('ANALYTICS_ROLLUP_INTERVAL_MS', 5 * 60 * 1000),
    // Contenedor del proxy Caddy que escribe los access log.
    caddyContainer: required('ANALYTICS_CADDY_CONTAINER', 'ipstream-caddy'),
    // Access log de los streams de radio (panel) y de TV.
    radioLogPath: required('ANALYTICS_RADIO_LOG', '/data/stream-access.log'),
    videoLogPath: required('ANALYTICS_VIDEO_LOG', '/data/access.log'),
    // Cuántos bytes del final del log leer en cada ciclo.
    tailBytes: intEnv('ANALYTICS_LOG_TAIL_BYTES', 5_000_000),
  },

  // SRS (Televisión + ingesta WebRTC de radio)
  srs: {
    host: required('SRS_HOST', 'srs'),
    rtmpPort: intEnv('SRS_RTMP_PORT', 1935),
    httpPort: intEnv('SRS_HTTP_PORT', 8080),
  },

  // Consola web de radio (WebRTC / WebSocket)
  live: {
    // Clave compartida con el panel para firmar/validar tokens de sesión.
    sessionSecret: required('LIVE_SESSION_SECRET', required('STREAMING_AGENT_TOKEN')),
    // Contenedor que ejecuta FFmpeg para el puente al harbor.
    bridgeContainer: required('AUDIO_BRIDGE_CONTAINER', 'ipstream-audio-bridge'),
    // Bitrate del audio que se publica al harbor.
    bitrateKbps: intEnv('LIVE_AUDIO_BITRATE', 192),
    // 'mp3' (seguro) o 'aac' (solo si el harbor lo acepta; ver spike).
    bridgeCodec: required('LIVE_BRIDGE_CODEC', 'mp3'),
    // Heartbeat máximo antes de considerar la sesión abandonada.
    staleMs: intEnv('LIVE_SESSION_STALE_MS', 45000),
    // Piper TTS (locuciones de clima/hora)
    ttsContainer: required('PIPER_CONTAINER', 'ipstream-piper'),
    ttsBin: required('PIPER_BIN', '/opt/piper/piper'),
    ttsModel: required('PIPER_MODEL', '/voices/es_ES-davefx-medium.onnx'),
    // Fallback automático al AutoDJ cuando la fuente en vivo queda en silencio.
    // Aplica a la consola web y a DJs externos conectados al harbor.
    silenceFallbackSeconds: intEnv('RADIO_SILENCE_FALLBACK_SECONDS', 10),
    silenceThresholdDb: intEnv('RADIO_SILENCE_THRESHOLD_DB', -50),
    silenceCooldownMs: intEnv('RADIO_SILENCE_COOLDOWN_SECONDS', 30) * 1000,
  },

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
