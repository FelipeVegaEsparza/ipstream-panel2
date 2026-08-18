import { config } from './config.js'

// Defensa en profundidad: tope absoluto de DJs por radio. Si Plan.maxDjs se
// configura a un valor absurdo, este cap evita generar un .liq patológico.
// 50 DJs simultáneos cubre el 99% de casos reales.
export const HARD_DJS_LIMIT = 50

// Paths derivados de env vars (con defaults) en lugar de hardcoded.
const LIQUIDSOAP_LOG_PATH = config.liquidsoap.logPath || '/var/log/liquidsoap'
const LIQUIDSOAP_LIBRARY_PATH = config.library.path || '/var/lib/radio'

export function generateLiquidsoapScript({
  clientId,
  clientName,
  icecastMount,
  sourcePassword,
  telnetPort,
  harborPassword,
  bitrate = 128,
  playlistM3uPath,
  mode = 'playlist',
  shuffle = false,
  repeat = true,
  jinglePlayEvery = 0,
  jinglePlayCount = 1,
  jinglesM3uPath = null,
  agentToken = '',
  djs = [],              // [{ mount: '/dj1', password: '...', priority: 1 }]
}) {
  const safeMount = sanitizeForLiquidsoap(icecastMount)
  const safeName = sanitizeForLiquidsoap(clientName)
  const safePwd = sanitizeForLiquidsoap(sourcePassword)
  const safeClient = sanitizeForLiquidsoap(clientId)
  const safeHarborPwd = sanitizeForLiquidsoap(harborPassword || sourcePassword)
  const m3u = playlistM3uPath || `${LIQUIDSOAP_LIBRARY_PATH}/${safeClient}/playlist.m3u`

  const harborPort = telnetPort + 10000

  const hasJingles = jinglePlayEvery > 0 && jinglesM3uPath

  const playlistMode = shuffle ? 'randomize' : 'normal'
  const loopStr = repeat ? 'true' : 'false'

  let sourceBlock
  if (mode !== 'playlist') {
    sourceBlock = 'blank()'
  } else if (hasJingles) {
    const jingleMode = shuffle ? 'random' : 'normal'
    sourceBlock = `mksafe(rotate(
    weights=[${jinglePlayEvery}, ${jinglePlayCount}],
    [
      playlist(id="${safeMount}-music", "${m3u}", mode="${playlistMode}", reload_mode="watch", loop=${loopStr}),
      playlist(id="${safeMount}-jingles", "${jinglesM3uPath}", mode="${jingleMode}", reload_mode="watch", loop=true)
    ]
  ))`
  } else {
    sourceBlock = `mksafe(playlist(
    id="${safeMount}-playlist",
    "${m3u}",
    mode="${playlistMode}",
    reload_mode="watch",
    loop=${loopStr}
  ))`
  }

  const agentHost = config.ice.host === 'localhost' ? 'localhost' : 'agent'
  const agentBase = `http://${agentHost}:4000`
  // El token de callback se inyecta como string literal en el .liq.
  // No usamos getenv() porque Liquidsoap 2.4.5 no permite concatenar
  // strings dentro de la expresión de system() de forma directa.
  // El archivo .liq solo es legible por el usuario liquidsoap/root.
  const safeCallbackToken = sanitizeForLiquidsoap(agentToken || '')

  function harborCallbackCmd(action, djMount) {
    const url = `${agentBase}/api/streams/${safeClient}/harbor/${action}?token=${encodeURIComponent(safeCallbackToken)}&dj=${encodeURIComponent(djMount)}`
    return `system("curl -s -X POST '${url}' &>/dev/null &")`
  }

  // DJs sorted by priority (1 = highest)
  const sortedDjs = [...djs].sort((a, b) => a.priority - b.priority)
  const activeDjs = sortedDjs.filter(d => d.isActive !== false)

  // Defensa contra Plan.maxDjs absurdo. Ver HARD_DJS_LIMIT arriba.
  if (activeDjs.length > HARD_DJS_LIMIT) {
    throw new Error(
      `DJs activos (${activeDjs.length}) exceden el tope absoluto (${HARD_DJS_LIMIT}). ` +
      `Revisar Plan.maxDjs del cliente ${safeClient}.`
    )
  }

  let harborInputs = ''
  let fallbackSources = []

  if (activeDjs.length === 0) {
    // Single DJ slot (legacy) using harborPassword
    harborInputs = `
live = input.harbor("/live",
  port=${harborPort},
  password="${safeHarborPwd}",
  on_connect=fun (_) -> ${harborCallbackCmd('connected', '/live')},
  on_disconnect=fun () -> ${harborCallbackCmd('disconnected', '/live')}
)`
    fallbackSources = ['live']
  } else {
    // Multiple DJ slots — generate one input.harbor per DJ
    const lines = activeDjs.map((dj, idx) => {
      const djMount = sanitizeForLiquidsoap(dj.mount || `/dj${idx + 1}`)
      const djPwd = sanitizeForLiquidsoap(dj.password || safeHarborPwd)
      const slotName = `dj${idx}`
      fallbackSources.push(slotName)
      return `${slotName} = input.harbor("${djMount}",
  port=${harborPort},
  password="${djPwd}",
  on_connect=fun (_) -> ${harborCallbackCmd('connected', djMount)},
  on_disconnect=fun () -> ${harborCallbackCmd('disconnected', djMount)}
)`
    })
    harborInputs = '\n' + lines.join('\n\n')
  }

  // fallback: DJs in priority order, then autodj
  fallbackSources.push('autodj')
  const fallbackList = fallbackSources.join(', ')

  return `# =====================================================
# Auto-generated for client ${safeClient} (mount: ${safeMount})
# =====================================================

settings.log.file.path.set("${LIQUIDSOAP_LOG_PATH}/${safeMount}.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# Excluir tags ID3 problematicos que pueden romper el stream title.
# Si un tag tiene encoding invalido (ej geob con URL larga), liquidsoap
# descarta el bloque entero de metadata, incluyendo title/artist, y
# Icecast nunca actualiza el stream title.
# NOTA: en Liquidsoap 2.4.5, settings.request.metadata_decoders.recode.exclude
# es una function getter, no un objeto Set. Hay que pasar un array completo
# con .set([...]) y no .add() individual.
settings.request.metadata_decoders.recode.exclude.set(["geob", "TXXX", "WXXX", "USLT"])

settings.server.telnet.set(true)
settings.server.telnet.port.set(${telnetPort})

settings.harbor.bind_addrs := ["0.0.0.0"]

autodj = ${sourceBlock}
${harborInputs}

radio = fallback(track_sensitive=false, [${fallbackList}])

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
