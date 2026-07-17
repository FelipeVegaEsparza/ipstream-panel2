// =====================================================
// Generador de scripts .liq por cliente
// =====================================================
// Dado un RadioStream + Playlist + Tracks, genera un script liquidsoap
// que se conecta a Icecast con las credenciales correctas.

import { config } from './config.js'

/**
 * Genera el contenido de un .liq para una radio específica.
 * @param {object} params
 * @param {string} params.clientId
 * @param {string} params.clientName   — ej: "Radio FM 99.5"
 * @param {string} params.icecastMount — ej: "test_abc" (sin slash)
 * @param {string} params.sourcePassword — password en texto plano
 * @param {number} params.telnetPort
 * @param {number} params.bitrate       — kbps
 * @param {string} [params.playlistM3uPath] — ruta absoluta al m3u dentro de liquidsoap
 * @param {string} [params.mode]         — "playlist" | "single" (default playlist)
 * @returns {string} contenido del archivo .liq
 */
export function generateLiquidsoapScript({
  clientId,
  clientName,
  icecastMount,
  sourcePassword,
  telnetPort,
  bitrate = 128,
  playlistM3uPath,
  mode = 'playlist',
}) {
  // Sanitizar valores que van al .liq
  const safeMount = sanitizeForLiquidsoap(icecastMount)
  const safeName = sanitizeForLiquidsoap(clientName)
  const safePwd = sanitizeForLiquidsoap(sourcePassword)
  const safeClient = sanitizeForLiquidsoap(clientId)
  const m3u = playlistM3uPath || `/var/lib/radio/${safeClient}/playlist.m3u`

  return `# =====================================================
# Auto-generated for client ${safeClient} (mount: ${safeMount})
# DO NOT EDIT — será regenerado en cada start/restart.
# =====================================================

# Permitir root (estamos dentro de un container)
set("init.allow_root", true)

# Logs
settings.log.file.path.set("/var/log/liquidsoap/${safeMount}.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# Telnet para control remoto (lo usa el streaming-agent)
settings.server.telnet.set(true)
settings.server.telnet.port.set(${telnetPort})

# Source: playlist (default) o silencio
music =
  ${
    mode === 'playlist'
      ? `mksafe(playlist(
    id="${safeMount}-playlist",
    "${m3u}",
    mode="normal",
    reload=5000,
    loop=true
  ))`
      : `blank()`
  }

# Output a Icecast como AutoDJ (prioridad baja — DJ puede tomar el control)
output.icecast(
  %mp3(bitrate=${bitrate}),
  host="${config.ice.host}",
  port=${config.ice.port},
  password="${safePwd}",
  mount="/${safeMount}",
  name="${safeName}",
  genre="Various",
  description="AutoDJ stream for ${safeName}",
  public=true,
  music
)
`
}

/**
 * Sanitiza un string para ser seguro dentro de un script liquidsoap.
 * Liquidsoap interpreta comillas, $, y otros chars especiales.
 */
function sanitizeForLiquidsoap(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/[\\$"]/g, '\\$&')   // escapar \ $ "
    .replace(/[\r\n]/g, ' ')        // sin saltos de línea
    .slice(0, 100)                  // límite defensivo
}
