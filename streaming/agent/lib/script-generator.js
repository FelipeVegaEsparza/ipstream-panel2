import { config } from './config.js'

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
  const m3u = playlistM3uPath || `/var/lib/radio/${safeClient}/playlist.m3u`

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
  // El token de callback se lee desde una variable de entorno del container
  // de Liquidsoap, para no quedar expuesto en el cmdline del proceso.
  const tokenExpr = `getenv("HARBOR_CALLBACK_TOKEN")`

  function harborCallbackCmd(action, djMount) {
    return `system("curl -s -X POST '${agentBase}/api/streams/${safeClient}/harbor/${action}?token=" ^ ${tokenExpr} ^ "&dj=${djMount}' &>/dev/null &")`
  }

  // DJs sorted by priority (1 = highest)
  const sortedDjs = [...djs].sort((a, b) => a.priority - b.priority)
  const activeDjs = sortedDjs.filter(d => d.isActive !== false)

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

settings.log.file.path.set("/var/log/liquidsoap/${safeMount}.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

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
