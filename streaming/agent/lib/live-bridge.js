// =====================================================
// Live Console — puente FFmpeg hacia Liquidsoap harbor
// =====================================================
// WHIP: SRS publica RTMP en app 'radio'; FFmpeg lo toma y lo publica al
//       harbor del slot como source Icecast.
// WebSocket: FFmpeg lee el stream del navegador por stdin.

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { pool } from './db.js'
import { decrypt } from './encryption.js'
import { config } from './config.js'
import { logger } from './logger.js'

const execp = promisify(exec)

async function slotCredentials(session) {
  const [rows] = await pool.query(
    `SELECT rs.liquidsoapTelnetPort, rs.livePasswordEnc,
            rd.passwordEnc AS djPasswordEnc
       FROM radio_streams rs
       LEFT JOIN radio_djs rd ON rd.clientId = rs.clientId AND rd.id = ?
      WHERE rs.clientId = ?
      LIMIT 1`,
    [session.slotId || '', session.clientId]
  )
  if (rows.length === 0) throw new Error('RadioStream no encontrado')

  const row = rows[0]
  const encoded = row.djPasswordEnc || row.livePasswordEnc
  if (!encoded) throw new Error('El slot no tiene password configurado')
  return {
    password: decrypt(encoded),
    harborPort: Number(row.liquidsoapTelnetPort) + 10000,
  }
}

export function ffmpegArgs(session, mode, harborPort, password) {
  const mount = String(session.mount || '/live').replace(/^\/+/, '')
  const sourceUrl = `icecast://source:${encodeURIComponent(password)}@${config.liquidsoap.host}:${harborPort}/${mount}`
  const args = ['exec']
  if (mode === 'websocket') args.push('-i')

  args.push(
    config.live.bridgeContainer,
    'ffmpeg',
    '-hide_banner',
    '-loglevel', 'warning',
    '-vn',
    '-i', mode === 'whip'
      ? `rtmp://${config.srs.host}:${config.srs.rtmpPort}/radio/${session.stream}`
      : 'pipe:0'
  )

  if (config.live.bridgeCodec === 'aac') {
    // Solo válido si input.harbor acepta AAC (ver spike de calidad).
    args.push('-c:a', 'copy', '-f', 'adts', '-content_type', 'audio/aac')
  } else {
    args.push(
      '-af', 'aformat=sample_rates=48000:channel_layouts=stereo',
      '-c:a', 'libmp3lame',
      '-b:a', `${config.live.bitrateKbps}k`,
      '-ar', '48000',
      '-ac', '2',
      '-f', 'mp3'
    )
  }

  args.push(sourceUrl)
  return args
}

export async function startBridge(session, mode = session.transport) {
  if (session.bridge?.child) return session.bridge

  const { password, harborPort } = await slotCredentials(session)
  const args = ffmpegArgs(session, mode, harborPort, password)
  logger.info(
    { sessionId: session.sessionId, clientId: session.clientId, mount: session.mount, mode, codec: config.live.bridgeCodec },
    'Iniciando puente live'
  )

  const child = spawn('docker', args, { stdio: ['pipe', 'ignore', 'pipe'] })
  session.bridge = { child, mode, startedAt: Date.now() }

  let stderr = ''
  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString()
    stderr = (stderr + text).slice(-2000)
    logger.debug({ sessionId: session.sessionId, ffmpeg: text.trim().slice(0, 300) }, 'live bridge stderr')
  })
  child.on('error', (err) => {
    logger.error({ sessionId: session.sessionId, err: err.message }, 'No se pudo iniciar el puente live')
  })
  child.on('exit', (code, signal) => {
    logger.info({ sessionId: session.sessionId, code, signal }, 'Puente live terminado')
    if (code && code !== 0) {
      logger.warn({ sessionId: session.sessionId, stderr }, 'Puente live salió con error')
    }
    if (session.bridge?.child === child) session.bridge = null
  })

  return session.bridge
}

export function writeBridgeChunk(session, chunk) {
  const child = session.bridge?.child
  if (!child?.stdin || child.stdin.destroyed) return false
  // Evitar que un cliente lento haga crecer el buffer sin límite.
  if (child.stdin.writableLength > 4 * 1024 * 1024) return false
  return child.stdin.write(chunk)
}

export async function stopBridge(session) {
  const bridge = session.bridge
  session.bridge = null
  if (!bridge?.child) return

  const child = bridge.child
  try { child.stdin?.end() } catch {}
  try { child.kill('SIGTERM') } catch {}
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      resolve()
    }, 3000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

export function isBridgeRunning(session) {
  return Boolean(session.bridge?.child)
}

/** Extrae PIDs de FFmpeg que publican al harbor desde la salida de `ps`. */
export function parseOrphanPids(output) {
  const pids = []
  for (const line of String(output || '').split('\n')) {
    if (!line.includes('icecast://source:')) continue
    const match = line.trim().match(/^(\d+)\s+/)
    if (match) pids.push(Number(match[1]))
  }
  return pids
}

/**
 * Al arrancar el agente, los procesos FFmpeg del contenedor audio-bridge
 * pueden haber quedado huérfanos (el estado de sesiones vive en memoria).
 * Los terminamos para que Liquidsoap reciba el disconnect y vuelva el AutoDJ.
 */
export async function reconcileOrphanBridges() {
  try {
    const { stdout } = await execp(
      `docker exec ${config.live.bridgeContainer} ps -eo pid,args`,
      { timeout: 10000 }
    )
    const pids = parseOrphanPids(stdout)
    for (const pid of pids) {
      try {
        await execp(`docker exec ${config.live.bridgeContainer} kill ${pid}`, { timeout: 5000 })
      } catch {}
    }
    if (pids.length > 0) {
      logger.info({ count: pids.length }, 'Puentes live huérfanos terminados')
    }
    return pids.length
  } catch (err) {
    logger.debug({ err: err.message }, 'No se pudieron reconciliar puentes live huérfanos')
    return 0
  }
}
