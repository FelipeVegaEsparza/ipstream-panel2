// =====================================================
// Liquidsoap — control de procesos via docker exec
// =====================================================
// Estrategia:
//   - Los scripts .liq se escriben en /etc/liquidsoap/scripts/
//     (volumen compartido entre agent y liquidsoap container).
//   - Para arrancar/kill/reiniciar, hacemos `docker exec` en el
//     container de liquidsoap.
//   - El tracking de PIDs se hace desde la DB (RadioStream.liquidsoapPid).
//
// IMPORTANTE: este módulo requiere que el agent tenga acceso al
// docker socket (montar /var/run/docker.sock en docker-compose).

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, access } from 'fs/promises'
import { join } from 'path'
import { config } from './config.js'
import { logger } from './logger.js'
import { generateLiquidsoapScript } from './script-generator.js'
import { pool } from './db.js'
import { decrypt } from './encryption.js'

const execp = promisify(exec)

const LIQUIDSOAP_CONTAINER = config.liquidsoap.host  // ej: "ipstream-liquidsoap"
const LIQUIDSOAP_BIN = config.liquidsoap.bin          // ej: "/usr/bin/liquidsoap"
const SCRIPTS_DIR = config.liquidsoap.scriptsPath     // ej: "/etc/liquidsoap/scripts" (compartido)
const LIQUIDSOAP_MP3_DIR = config.library.path        // ej: "/var/lib/radio"

// Path a un script de check que escribimos en el volumen compartido.
// Lo creamos al iniciar el módulo para que docker exec lo pueda correr.
const CHECK_SCRIPT_PATH = join(SCRIPTS_DIR, '_check_proc.sh')

/**
 * Carga un RadioStream con su Client asociado desde la DB.
 */
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

/**
 * Escribe el script .liq en el volumen compartido.
 */
async function writeScript(mount, content) {
  const path = join(SCRIPTS_DIR, `${mount}.liq`)
  await writeFile(path, content, { mode: 0o644 })
  logger.info({ path, bytes: content.length }, 'Script .liq escrito')
  return path
}

/**
 * Verifica si el proceso liquidsoap de un cliente está corriendo dentro del container.
 * Usa /proc en vez de ps (ps no está en debian-slim por defecto).
 * Escribimos un script de check en el volumen compartido y lo ejecutamos.
 * @returns {Promise<{ running: boolean, pid: number | null }>}
 */
export async function isProcessRunning(mount) {
  try {
    await ensureCheckScript()
    const { stdout } = await execp(
      `docker exec ${LIQUIDSOAP_CONTAINER} bash /etc/liquidsoap/scripts/_check_proc.sh '${mount}'`,
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
  // Construimos el script como string (sin template literal) para evitar
  // que JS interprete $1, ${MOUNT}, etc.
  const script = [
    '#!/bin/bash',
    '# Imprime el PID del proceso liquidsoap del mount pasado como $1.',
    '# Vacío si no se encuentra.',
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

/**
 * Genera el .liq desde la DB y lo escribe al volumen compartido.
 * NO inicia el proceso.
 *
 * IMPORTANTE: usa el source-password COMPARTIDO de Icecast (no el per-cliente).
 * En una config con <mount type="default">, todos los mounts usan el mismo
 * source-password. Los passwords per-cliente se usan en una fase futura
 * si pasamos a Icecast 2.5+ con mount configs dinámicas.
 */
export async function regenerateScript(clientId) {
  const rs = await loadRadioStream(clientId)
  const playlist = await getActivePlaylist(clientId)

  // Path al m3u dentro del container liquidsoap
  const m3uPath = playlist
    ? `/var/lib/radio/${clientId}/playlist.m3u`
    : null

  // Chequear si hay jingles configurados
  const jinglesM3uPath = `/var/lib/radio/${clientId}/jingles.m3u`
  const [jingleRows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM jingles WHERE clientId = ?`,
    [clientId]
  )
  const hasJingles = jingleRows[0]?.cnt > 0 && rs.jinglePlayEvery > 0

  const content = generateLiquidsoapScript({
    clientId,
    clientName: rs.clientName,
    icecastMount: rs.icecastMount,
    sourcePassword: config.ice.sourcePassword,  // compartido por todos los clients
    telnetPort: rs.liquidsoapTelnetPort,
    bitrate: rs.bitrate,
    playlistM3uPath: m3uPath,
    mode: playlist ? 'playlist' : 'single',
    jinglePlayEvery: hasJingles ? rs.jinglePlayEvery : 0,
    jinglePlayCount: hasJingles ? rs.jinglePlayCount : 0,
    jinglesM3uPath: hasJingles ? jinglesM3uPath : null,
  })

  const path = await writeScript(rs.icecastMount, content)
  return { path, hasPlaylist: !!playlist }
}

/**
 * Inicia el proceso liquidsoap para un cliente.
 * @returns {Promise<{ pid: number, scriptPath: string }>}
 */
export async function startStream(clientId) {
  const rs = await loadRadioStream(clientId)

  // 1. Verificar si ya está corriendo
  const status = await isProcessRunning(rs.icecastMount)
  if (status.running) {
    throw new Error(`Stream ya está corriendo (PID ${status.pid}). Usa /restart para reiniciar.`)
  }

  // 2. Regenerar script (por si cambió la playlist)
  const { path, hasPlaylist } = await regenerateScript(clientId)
  if (!hasPlaylist) {
    logger.warn({ clientId }, 'Iniciando stream sin playlist activa — reproducirá silencio')
  }

  // 3. Lanzar liquidsoap en background dentro del container
  // Usamos `nohup ... &` + `disown` para que el proceso sobreviva
  // al exec de docker. La salida va al log configurado en el .liq.
  const cmd = `docker exec -d ${LIQUIDSOAP_CONTAINER} bash -c 'nohup ${LIQUIDSOAP_BIN} ${path} > /proc/1/fd/1 2>&1 & disown'`
  await execp(cmd, { timeout: 10000 })

  // 4. Esperar a que el proceso aparezca
  await new Promise((r) => setTimeout(r, 1500))
  const newStatus = await isProcessRunning(rs.icecastMount)
  if (!newStatus.running) {
    throw new Error(`Liquidsoap arrancó pero no se encontró el proceso. Revisa /var/log/liquidsoap/${rs.icecastMount}.log`)
  }

  // 5. Actualizar DB
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

  logger.info({ clientId, mount: rs.icecastMount, pid: newStatus.pid, hasPlaylist }, 'Stream iniciado')
  return { pid: newStatus.pid, scriptPath: path, hasPlaylist }
}

/**
 * Detiene el proceso liquidsoap de un cliente.
 */
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

  // Kill el proceso dentro del container
  await execp(
    `docker exec ${LIQUIDSOAP_CONTAINER} bash -c "kill -TERM ${status.pid} 2>/dev/null; sleep 1; kill -KILL ${status.pid} 2>/dev/null || true"`,
    { timeout: 8000 }
  )

  await pool.query(
    `UPDATE radio_streams SET liquidsoapRunning = 0, liquidsoapPid = NULL, status = 'off', updatedAt = NOW() WHERE clientId = ?`,
    [clientId]
  )

  logger.info({ clientId, mount: rs.icecastMount, pid: status.pid }, 'Stream detenido')
  return { wasRunning: true, killedPid: status.pid }
}

/**
 * Reinicia el stream (stop + start).
 */
export async function restartStream(clientId) {
  await stopStream(clientId).catch(() => {})  // ignorar si no estaba corriendo
  await new Promise((r) => setTimeout(r, 500))
  return startStream(clientId)
}

/**
 * Obtiene la playlist activa de un cliente (si hay).
 */
async function getActivePlaylist(clientId) {
  const [rows] = await pool.query(
    "SELECT id, name, shuffle, `repeat` FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1",
    [clientId]
  )
  return rows[0] || null
}

/**
 * Genera/actualiza el archivo playlist.m3u en el volumen compartido
 * basado en las entries de la playlist activa.
 * Cada línea es una ruta ABSOLUTA al MP3 (liquidsoap no resuelve paths relativos).
 */
export async function regenerateM3u(clientId) {
  const [activeRows] = await pool.query(
    `SELECT id FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1`,
    [clientId]
  )

  const m3uPath = join(LIQUIDSOAP_MP3_DIR, clientId, 'playlist.m3u')
  const mp3Dir = join(LIQUIDSOAP_MP3_DIR, clientId, 'mp3')

  if (activeRows.length === 0) {
    // No hay playlist activa — vaciar m3u
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

  // Paths absolutos dentro del container liquidsoap
  const lines = entries.map((e) => join(mp3Dir, e.fileName)).join('\n')
  await writeFile(m3uPath, lines + (lines ? '\n' : ''), { mode: 0o644 })
  logger.info({ clientId, m3uPath, trackCount: entries.length }, 'm3u regenerado (paths absolutos)')
  return { active: true, trackCount: entries.length }
}

/**
 * Genera/actualiza el archivo jingles.m3u en el volumen compartido
 * basado en todos los jingles disponibles del cliente.
 */
export async function regenerateJinglesM3u(clientId) {
  const [rows] = await pool.query(
    `SELECT fileName FROM jingles WHERE clientId = ? ORDER BY uploadedAt ASC`,
    [clientId]
  )

  const m3uPath = join(LIQUIDSOAP_MP3_DIR, clientId, 'jingles.m3u')
  const jinglesDir = join(LIQUIDSOAP_MP3_DIR, clientId, 'jingles')

  const lines = rows.map((r) => join(jinglesDir, r.fileName)).join('\n')
  await writeFile(m3uPath, lines + (lines ? '\n' : ''), { mode: 0o644 })
  logger.info({ clientId, m3uPath, jingleCount: rows.length }, 'jingles.m3u regenerado')
  return { jingleCount: rows.length }
}
