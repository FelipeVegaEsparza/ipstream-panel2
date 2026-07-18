// =====================================================
// DJ Watcher — detecta cuando un DJ se desconecta y
// reinicia el AutoDJ automáticamente.
// =====================================================

import { getMountStatus } from './icecast.js'
import { logger } from './logger.js'
import { _djActive } from '../routes/streams.js'
import { startStream } from './liquidsoap.js'
import { pool } from './db.js'

const CHECK_INTERVAL = 15_000
const COOLDOWN_MS = 30_000
let intervalHandle = null

// Última vez que detectamos que un DJ estaba en cada mount
const lastDjSeen = new Map()

export function startDjWatcher() {
  if (intervalHandle) return
  logger.info('DJ watcher iniciado')
  intervalHandle = setInterval(checkMounts, CHECK_INTERVAL)
}

export function stopDjWatcher() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function checkMounts() {
  for (const mount of _djActive) {
    try {
      const currentMount = await getMountStatus(mount)
      if (currentMount) {
        // DJ sigue conectado
        lastDjSeen.set(mount, Date.now())
        continue
      }

      // No hay source en Icecast — posiblemente DJ se fue
      const lastSeen = lastDjSeen.get(mount) || 0
      const elapsed = Date.now() - lastSeen

      if (elapsed < COOLDOWN_MS) {
        // Esperar cooldown por si el DJ está reconectando
        continue
      }

      // DJ se fue — reiniciar AutoDJ
      logger.info({ mount }, 'DJ watcher: DJ desconectado, reiniciando AutoDJ')

      // Buscar clientId del mount
      const [rows] = await pool.query(
        `SELECT clientId FROM radio_streams WHERE icecastMount = ? LIMIT 1`,
        [mount]
      )
      if (rows.length === 0) {
        logger.warn({ mount }, 'DJ watcher: mount no encontrado en DB, limpiando')
        _djActive.delete(mount)
        lastDjSeen.delete(mount)
        continue
      }

      const { clientId } = rows[0]
      await startStream(clientId)
      _djActive.delete(mount)
      lastDjSeen.delete(mount)
      logger.info({ mount, clientId }, 'DJ watcher: AutoDJ reiniciado')
    } catch (err) {
      logger.warn({ mount, err: err.message }, 'DJ watcher: error en check')
    }
  }
}
