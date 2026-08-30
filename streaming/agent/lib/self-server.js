// =====================================================
// Self server — identidad del agente en streaming_servers
// =====================================================
// Resuelve el id del servidor que corre ESTE agente comparando el
// STREAMING_AGENT_TOKEN local con el tokenEnc descifrado de la tabla
// compartida streaming_servers. Se usa para que cada agente supervise y
// reporte SOLO sus propios streams (multi-servidor).
// Si no se puede resolver (config legacy sin fila), devuelve null y los
// callers caen al comportamiento previo (streams sin serverId).

import { logger } from './logger.js'
import { pool } from './db.js'
import { decrypt, isEncrypted } from './encryption.js'
import { config } from './config.js'

let selfServerId = null
let resolved = false

export async function resolveSelfServerId() {
  if (resolved) return selfServerId
  resolved = true
  try {
    const [rows] = await pool.query(
      `SELECT id, tokenEnc FROM streaming_servers WHERE isActive = 1`
    )
    for (const row of rows) {
      if (row.tokenEnc && isEncrypted(row.tokenEnc)) {
        try {
          if (decrypt(row.tokenEnc) === config.agentToken) {
            selfServerId = row.id
            logger.info({ serverId: selfServerId }, 'Self server: serverId local resuelto')
            return selfServerId
          }
        } catch {
          // fila con token ilegible: ignorar
        }
      }
    }
    logger.warn('Self server: no se pudo resolver serverId local')
  } catch (err) {
    logger.error({ err: err.message }, 'Self server: error resolviendo serverId local')
  }
  return selfServerId
}
