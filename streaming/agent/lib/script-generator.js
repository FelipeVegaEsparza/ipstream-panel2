// =====================================================
// Generador de scripts .liq por cliente
// Arquitectura: Liquidsoap permanente con harbor para DJ
//   - input.harbor() para live DJ (fallback prioritario)
//   - playlist para AutoDJ (fallback cuando no hay DJ)
//   - Liquidsoap siempre corre, nunca se reinicia
// =====================================================

import { config } from './config.js'

export function generateLiquidsoapScript({
  clientId,
  clientName,
  icecastMount,
  sourcePassword,
  telnetPort,
  harborPort,
  bitrate = 128,
  playlistM3uPath,
  mode = 'playlist',
  jinglePlayEvery = 0,
  jinglePlayCount = 1,
  jinglesM3uPath = null,
}) {
  const safeMount = sanitizeForLiquidsoap(icecastMount)
  const safeName = sanitizeForLiquidsoap(clientName)
  const safePwd = sanitizeForLiquidsoap(sourcePassword)
  const safeClient = sanitizeForLiquidsoap(clientId)
  const iceHost = sanitizeForLiquidsoap(config.ice.host)
  const icePort = parseInt(config.ice.port, 10) || 8000
  const agentUrl = sanitizeForLiquidsoap(`http://agent:4000/api/streams/${safeClient}/harbor`)
  const m3u = playlistM3uPath || `/var/lib/radio/${safeClient}/playlist.m3u`

  const hasJingles = jinglePlayEvery > 0 && jinglesM3uPath

  let autodjBlock
  if (mode !== 'playlist') {
    autodjBlock = 'blank()'
  } else if (hasJingles) {
    autodjBlock = `rotate(
    weights=[${jinglePlayEvery}, ${jinglePlayCount}],
    [
      playlist(id="${safeMount}-music", "${m3u}", mode="normal", reload=5000, loop=true),
      playlist(id="${safeMount}-jingles", "${jinglesM3uPath}", mode="random", reload=5000, loop=true)
    ]
  )`
  } else {
    autodjBlock = `playlist(
    id="${safeMount}-playlist",
    "${m3u}",
    mode="normal",
    reload=5000,
    loop=true
  )`
  }

  return `# =====================================================
# Auto-generated for client ${safeClient} (mount: ${safeMount})
# Architecture: permanent Liquidsoap with harbor DJ input
# DO NOT EDIT
# =====================================================

# Allow root (we run inside a container)
set("init.allow_root", true)

# Logs
settings.log.file.path.set("/var/log/liquidsoap/${safeMount}.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# Telnet for remote control (used by streaming-agent)
settings.server.telnet.set(true)
settings.server.telnet.port.set(${telnetPort})

# ─── Live DJ source via harbor ───────────────────────
# DJ connects to this Liquidsoap instance on port ${harborPort}
# with the per-client password.
# When DJ connects, this source becomes "ready" and
# fallback() switches to it immediately.
live = input.harbor(
  port=${harborPort},
  password="${safePwd}",
  on_connect=[fun () -> ignore(system("curl -s -o /dev/null -X POST ${agentUrl}/connected &"))],
  on_disconnect=[fun () -> ignore(system("curl -s -o /dev/null -X POST ${agentUrl}/disconnected &"))]
)

# ─── AutoDJ source (playlist-based) ──────────────────
autodj = mksafe(${autodjBlock})

# ─── Fallback: live DJ takes priority ────────────────
# track_sensitive=false = change immediately, no crossfade
radio = fallback(track_sensitive=false, [live, autodj])

# ─── Output to Icecast ───────────────────────────────
# This is the ONLY source connecting to Icecast.
# Icecast just serves listeners; it never sees the DJ directly.
output.icecast(
  %mp3(bitrate=${bitrate}),
  host="${iceHost}",
  port=${icePort},
  user="source",
  password="${safePwd}",
  mount="/${safeMount}",
  name="${safeName}",
  genre="Various",
  description="Stream for ${safeName}",
  public=true,
  radio
)
`
}

function sanitizeForLiquidsoap(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/[\\$"]/g, '\\$&')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 100)
}
