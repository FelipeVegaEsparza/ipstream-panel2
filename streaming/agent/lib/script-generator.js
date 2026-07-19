// =====================================================
// Generador de scripts .liq por cliente
// =====================================================

import { config } from './config.js'

export function generateLiquidsoapScript({
  clientId,
  clientName,
  icecastMount,
  sourcePassword,
  telnetPort,
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
  const m3u = playlistM3uPath || `/var/lib/radio/${safeClient}/playlist.m3u`

  const hasJingles = jinglePlayEvery > 0 && jinglesM3uPath

  let sourceBlock
  if (mode !== 'playlist') {
    sourceBlock = 'blank()'
  } else if (hasJingles) {
    sourceBlock = `mksafe(rotate(
    weights=[${jinglePlayEvery}, ${jinglePlayCount}],
    [
      playlist(id="${safeMount}-music", "${m3u}", mode="normal", reload=5000, loop=true),
      playlist(id="${safeMount}-jingles", "${jinglesM3uPath}", mode="random", reload=5000, loop=true)
    ]
  ))`
  } else {
    sourceBlock = `mksafe(playlist(
    id="${safeMount}-playlist",
    "${m3u}",
    mode="normal",
    reload=5000,
    loop=true
  ))`
  }

  return `# =====================================================
# Auto-generated for client ${safeClient} (mount: ${safeMount})
# =====================================================

set("init.allow_root", true)

settings.log.file.path.set("/var/log/liquidsoap/${safeMount}.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

settings.server.telnet.set(true)
settings.server.telnet.port.set(${telnetPort})

source = ${sourceBlock}

output.icecast(
  %mp3(bitrate=${bitrate}),
  host="${config.ice.host}",
  port=${config.ice.port},
  user="source",
  password="${safePwd}",
  mount="/${safeMount}",
  name="${safeName}",
  genre="Various",
  description="AutoDJ stream for ${safeName}",
  public=true,
  source
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
