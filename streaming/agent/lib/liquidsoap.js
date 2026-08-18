import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, access, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { config } from './config.js'
import { logger } from './logger.js'
import { generateLiquidsoapScript } from './script-generator.js'
import { pool } from './db.js'
import { decrypt, isEncrypted } from './encryption.js'

const execp = promisify(exec)

const LIQUIDSOAP_CONTAINER = config.liquidsoap.host
const LIQUIDSOAP_BIN = config.liquidsoap.bin
const SCRIPTS_DIR = config.liquidsoap.scriptsPath
const LIQUIDSOAP_MP3_DIR = config.library.path

const CHECK_SCRIPT_PATH = join(SCRIPTS_DIR, '_check_proc.sh')

// Mutex por cliente para evitar que dos llamadas concurrentes a startStream
// (o start+restart) terminen spawnando dos procesos liquidsoap para el mismo
// mount. El primer caller ejecuta; los siguientes esperan el resultado.
const _startLocks = new Map() // clientId → Promise

export function getHarborPort(telnetPort) {
  return telnetPort + 10000
}

async function loadRadioStream(clientId) {
  const [rows] = await pool.query(
    `SELECT rs.*, c.name AS clientName
     FROM radio_streams rs
     JOIN clients c ON c.id = rs.clientId
     WHERE rs.clientId = ?`,
    [clientId]
  )
  if (rows.length === 0) throw new Error(`RadioStream no encontrado para clientId=${clientId}`)
  return rows[0]
}

async function writeScript(mount, content) {
  const path = join(SCRIPTS_DIR, `${mount}.liq`)
  // Permisos 0o644 (rw-r--r--): el contenedor liquidsoap corre como uid 100
  // (savonet) y necesita poder leer el script. Antes era 0o600 (rw solo para
  // owner streamagent uid 1001) y producia "Permission denied" al iniciar.
  await writeFile(path, content, { mode: 0o644 })
  logger.info({ path, bytes: content.length }, 'Script .liq escrito')
  return path
}

export async function isProcessRunning(mount) {
  try {
    await ensureCheckScript()
    // Usamos `sh` (POSIX) en vez de `bash`. La imagen savonet/liquidsoap:v2.4.5
    // solo instala curl+ca-certificates+tini, no bash, y `docker exec ... bash`
    // fallaba con exit code 127 silenciosamente. El script es POSIX-compatible.
    const { stdout } = await execp(
      `docker exec ${LIQUIDSOAP_CONTAINER} sh /etc/liquidsoap/scripts/_check_proc.sh '${mount}'`,
      { timeout: 10000, maxBuffer: 64 * 1024 }
    )
    const pid = parseInt(stdout.trim(), 10)
    if (isNaN(pid)) return { running: false, pid: null }
    return { running: true, pid }
  } catch (err) {
    logger.warn({ err: err.message, mount }, 'isProcessRunning check failed')
    return { running: false, pid: null }
  }
}

let _checkScriptWritten = false
async function ensureCheckScript() {
  if (_checkScriptWritten) return
  const script = [
    '#!/bin/bash',
    'MOUNT="$1"',
    'for p in /proc/[0-9]*; do',
    '  if [ -r "$p/cmdline" ] 2>/dev/null; then',
    "    if tr '\\0' ' ' < \"$p/cmdline\" 2>/dev/null | grep -q \"liquidsoap /etc/liquidsoap/scripts/${MOUNT}.liq\"; then",
    '      basename "$p"',
    '      exit 0',
    '    fi',
    '  fi',
    'done',
    'exit 0',
    '',
  ].join('\n')
  await writeFile(CHECK_SCRIPT_PATH, script, { mode: 0o755 })
  _checkScriptWritten = true
  logger.info({ path: CHECK_SCRIPT_PATH }, 'Check script escrito')
}

export async function getRadioDjs(clientId) {
  const [rows] = await pool.query(
    `SELECT id, clientId, name, mount, priority, passwordEnc, role, isActive
     FROM radio_djs WHERE clientId = ? ORDER BY priority ASC`,
    [clientId]
  )
  const djs = []
  for (const row of rows) {
    let password = row.passwordEnc
    if (row.passwordEnc && isEncrypted(row.passwordEnc)) {
      try {
        password = decrypt(row.passwordEnc)
      } catch (err) {
        logger.warn({ clientId, dj: row.name, err: err.message }, 'Error descifrando password de DJ')
        password = null
      }
    }
    djs.push({
      id: row.id,
      name: row.name,
      mount: row.mount,
      priority: row.priority,
      password,
      passwordEnc: row.passwordEnc,
      role: row.role,
      isActive: !!row.isActive,
    })
  }
  return djs
}

export async function regenerateScript(clientId) {
  const rs = await loadRadioStream(clientId)
  const playlist = await getActivePlaylist(clientId)

  // Regenerar M3U primero para asegurar orden actualizado en DB
  await regenerateM3u(clientId)

  const m3uPath = playlist
    ? `/var/lib/radio/${clientId}/playlist.m3u`
    : null

  const jinglesM3uPath = `/var/lib/radio/${clientId}/jingles.m3u`
  const [jingleRows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM jingles WHERE clientId = ?`,
    [clientId]
  )
  const hasJingles = jingleRows[0]?.cnt > 0 && rs.jinglePlayEvery > 0

  let sourcePassword = config.ice.sourcePassword
  let harborPassword = config.ice.sourcePassword

  if (rs.sourcePasswordEnc && isEncrypted(rs.sourcePasswordEnc)) {
    try {
      sourcePassword = decrypt(rs.sourcePasswordEnc)
    } catch (err) {
      logger.warn({ clientId, err: err.message }, 'Error al descifrar sourcePasswordEnc, usando password compartido para source')
    }
  } else {
    logger.warn({ clientId }, 'Sin sourcePasswordEnc en DB, usando password compartido para source')
  }

  if (rs.livePasswordEnc && isEncrypted(rs.livePasswordEnc)) {
    try {
      harborPassword = decrypt(rs.livePasswordEnc)
    } catch (err) {
      logger.warn({ clientId, err: err.message }, 'Error al descifrar livePasswordEnc, usando password compartido para harbor')
    }
  } else {
    logger.warn({ clientId }, 'Sin livePasswordEnc en DB, usando password compartido para harbor')
  }

  // Load DJ slots from DB
  const djs = await getRadioDjs(clientId)

  const content = generateLiquidsoapScript({
    clientId,
    clientName: rs.clientName,
    icecastMount: rs.icecastMount,
    sourcePassword,
    telnetPort: rs.liquidsoapTelnetPort,
    harborPassword,
    bitrate: rs.bitrate,
    playlistM3uPath: m3uPath,
    mode: playlist ? 'playlist' : 'single',
    shuffle: playlist?.shuffle ?? false,
    repeat: playlist?.repeat ?? true,
    jinglePlayEvery: hasJingles ? rs.jinglePlayEvery : 0,
    jinglePlayCount: hasJingles ? rs.jinglePlayCount : 0,
    jinglesM3uPath: hasJingles ? jinglesM3uPath : null,
    agentToken: config.harborCallbackSecret,
    djs: djs.map(d => ({
      mount: d.mount,
      password: d.password,
      priority: d.priority,
      name: d.name,
      isActive: d.isActive,
    })),
  })

  const path = await writeScript(rs.icecastMount, content)
  return { path, hasPlaylist: !!playlist }
}

export async function startStream(clientId) {
  // Si ya hay un start en curso para este cliente, esperamos su resultado
  // y devolvemos lo mismo (o re-lanzamos su error).
  const prev = _startLocks.get(clientId)
  if (prev) {
    logger.info({ clientId }, 'startStream: ya hay un start en curso, esperando')
    return prev
  }

  // Timeout de seguridad: si algún docker exec se cuelga indefinidamente,
  // liberamos el lock para no bloquear futuros intentos de forma permanente.
  const START_TIMEOUT_MS = 120_000

  const runStart = async () => {
    const rs = await loadRadioStream(clientId)

    const status = await isProcessRunning(rs.icecastMount)
    if (status.running) {
      throw new Error(`Stream ya está corriendo (PID ${status.pid}). Usa /restart para reiniciar.`)
    }

    const { path, hasPlaylist } = await regenerateScript(clientId)
    if (!hasPlaylist) {
      logger.warn({ clientId }, 'Iniciando stream sin playlist activa')
    }

    // Usar `setsid` para crear una nueva sesion (independiente de tini/PID1)
    // y `exec` para reemplazar el shell por el proceso liquidsoap, asi no
    // queda un shell padre que pueda terminar y matar al hijo.
    // Ademas `setsid` redirige correctamente el output al fd 1 del contenedor.
    const cmd = `docker exec -d ${LIQUIDSOAP_CONTAINER} setsid ${LIQUIDSOAP_BIN} ${path} < /dev/null > /proc/1/fd/1 2>&1`
    await execp(cmd, { timeout: 10000 })

    await new Promise((r) => setTimeout(r, 1500))
    const newStatus = await isProcessRunning(rs.icecastMount)
    if (!newStatus.running) {
      throw new Error(`Liquidsoap arrancó pero no se encontró el proceso. Revisa /var/log/liquidsoap/${rs.icecastMount}.log`)
    }

    await pool.query(
      `UPDATE radio_streams
       SET liquidsoapRunning = 1,
           liquidsoapPid = ?,
           liquidsoapStartedAt = NOW(),
           status = 'autodj',
           lastError = NULL,
           updatedAt = NOW()
       WHERE clientId = ?`,
      [newStatus.pid, clientId]
    )

    logger.info({ clientId, mount: rs.icecastMount, pid: newStatus.pid, hasPlaylist, harborPort: getHarborPort(rs.liquidsoapTelnetPort) }, 'Stream iniciado con harbor')
    return { pid: newStatus.pid, scriptPath: path, hasPlaylist }
  }

  const promise = runStart()
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`startStream timeout (${START_TIMEOUT_MS}ms) para clientId=${clientId}`)), START_TIMEOUT_MS)
  })

  const guarded = Promise.race([promise, timeoutPromise])

  _startLocks.set(clientId, guarded)
  try {
    return await guarded
  } finally {
    _startLocks.delete(clientId)
  }
}

export async function stopStream(clientId) {
  const rs = await loadRadioStream(clientId)
  const status = await isProcessRunning(rs.icecastMount)

  if (!status.running) {
    logger.info({ clientId, mount: rs.icecastMount }, 'Stream ya estaba detenido')
    await pool.query(
      `UPDATE radio_streams SET liquidsoapRunning = 0, liquidsoapPid = NULL, status = 'off', updatedAt = NOW() WHERE clientId = ?`,
      [clientId]
    )
    return { wasRunning: false }
  }

  await execp(
    // Mismo motivo: usar `sh` (POSIX) en lugar de `bash` (no instalado en el container).
    `docker exec ${LIQUIDSOAP_CONTAINER} sh -c "kill -TERM ${status.pid} 2>/dev/null; sleep 1; kill -KILL ${status.pid} 2>/dev/null || true"`,
    { timeout: 8000 }
  )

  await pool.query(
    `UPDATE radio_streams SET liquidsoapRunning = 0, liquidsoapPid = NULL, status = 'off', updatedAt = NOW() WHERE clientId = ?`,
    [clientId]
  )

  logger.info({ clientId, mount: rs.icecastMount, pid: status.pid }, 'Stream detenido')
  return { wasRunning: true, killedPid: status.pid }
}

export async function restartStream(clientId) {
  await stopStream(clientId).catch(() => {})
  await new Promise((r) => setTimeout(r, 500))
  return startStream(clientId)
}

async function getActivePlaylist(clientId) {
  const [rows] = await pool.query(
    "SELECT id, name, shuffle, `repeat` FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1",
    [clientId]
  )
  return rows[0] || null
}

export async function regenerateM3u(clientId) {
  const [activeRows] = await pool.query(
    `SELECT id FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1`,
    [clientId]
  )

  const m3uPath = join(LIQUIDSOAP_MP3_DIR, clientId, 'playlist.m3u')
  const mp3Dir = join(LIQUIDSOAP_MP3_DIR, clientId, 'mp3')

  // Asegurar que el dir padre existe. Sin esto, clientes nuevos (que nunca
  // subieron tracks) rompen con ENOENT al primer start.
  await mkdir(dirname(m3uPath), { recursive: true })

  if (activeRows.length === 0) {
    await writeFile(m3uPath, '', { mode: 0o644 })
    logger.info({ clientId, m3uPath }, 'm3u vaciado (no hay playlist activa)')
    return { active: false, trackCount: 0 }
  }

  const playlistId = activeRows[0].id
  const [entries] = await pool.query(
    `SELECT t.fileName FROM playlist_entries pe
     JOIN tracks t ON t.id = pe.trackId
     WHERE pe.playlistId = ?
     ORDER BY pe.\`order\` ASC`,
    [playlistId]
  )

  const lines = entries.map((e) => join(mp3Dir, e.fileName)).join('\n')
  await writeFile(m3uPath, lines + (lines ? '\n' : ''), { mode: 0o644 })
  logger.info({ clientId, m3uPath, trackCount: entries.length }, 'm3u regenerado')
  return { active: true, trackCount: entries.length }
}

export async function regenerateJinglesM3u(clientId) {
  const [rows] = await pool.query(
    `SELECT fileName FROM jingles WHERE clientId = ? ORDER BY uploadedAt ASC`,
    [clientId]
  )

  const m3uPath = join(LIQUIDSOAP_MP3_DIR, clientId, 'jingles.m3u')
  const jinglesDir = join(LIQUIDSOAP_MP3_DIR, clientId, 'jingles')

  // Igual que en regenerateM3u: el dir padre puede no existir.
  await mkdir(dirname(m3uPath), { recursive: true })

  const lines = rows.map((r) => join(jinglesDir, r.fileName)).join('\n')
  await writeFile(m3uPath, lines + (lines ? '\n' : ''), { mode: 0o644 })
  logger.info({ clientId, m3uPath, jingleCount: rows.length }, 'jingles.m3u regenerado')
  return { jingleCount: rows.length }
}

/**
 * Auto-start: inicia todos los streams marcados con autoStart = true
 * que no estén ya corriendo. Se llama al arrancar el agente.
 */
export async function autoStartStreams() {
  const [rows] = await pool.query(
    `SELECT clientId FROM radio_streams WHERE autoStart = 1 AND enabled = 1`
  )

  logger.info({ count: rows.length }, 'autoStartStreams: streams a iniciar')
  const started = []
  const failed = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Escalonar inicios para evitar thundering herd
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 2000))
    }
    try {
      const rs = await loadRadioStream(row.clientId)
      const status = await isProcessRunning(rs.icecastMount)
      if (status.running) {
        // Ya corriendo: regenerar script y reiniciar para asegurar versión actualizada
        await restartStream(row.clientId)
        started.push({ clientId: row.clientId, restarted: true })
        logger.info({ clientId: row.clientId, pid: status.pid }, 'autoStartStreams: reiniciado para refrescar script')
      } else {
        const result = await startStream(row.clientId)
        started.push({ clientId: row.clientId, pid: result.pid })
        logger.info({ clientId: row.clientId, pid: result.pid }, 'autoStartStreams: iniciado')
      }
    } catch (err) {
      failed.push({ clientId: row.clientId, error: err.message })
      logger.warn({ clientId: row.clientId, err: err.message }, 'autoStartStreams: falló')
    }
  }

  return { started, failed }
}
