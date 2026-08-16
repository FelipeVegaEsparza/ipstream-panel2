// =====================================================
// Mount allocation — asigna dinámicamente mounts /dj1, /dj2, …, /djN
// donde N viene del Plan (maxDjs). Si un slot intermedio se borra, su
// mount se reutiliza. Nunca se salta números, nunca se reutiliza un mount
// ocupado por otro slot del mismo cliente.
// =====================================================

import { pool } from './db.js'

const MOUNT_PREFIX = '/dj'

/**
 * Devuelve el mount /djK con K = entero más bajo entre 1 y planMaxDjs
 * que NO esté en uso en radio_djs para ese cliente.
 *
 * @param {string} clientId
 * @param {number} planMaxDjs
 * @returns {Promise<string|null>} Mount asignado, o null si no hay huecos.
 */
export async function nextAvailableMount(clientId, planMaxDjs) {
  if (!clientId) throw new Error('clientId is required')
  if (!Number.isFinite(planMaxDjs) || planMaxDjs < 1) {
    throw new Error('planMaxDjs must be a positive integer')
  }

  // 1) Traer todos los mounts ya ocupados por el cliente (parseados a int).
  const [rows] = await pool.query(
    `SELECT mount FROM radio_djs WHERE clientId = ?`,
    [clientId]
  )

  const used = new Set()
  for (const r of rows) {
    const n = parseMount(r.mount)
    if (n !== null) used.add(n)
  }

  // 2) Buscar el entero más bajo entre 1 y planMaxDjs no usado.
  for (let k = 1; k <= planMaxDjs; k++) {
    if (!used.has(k)) return `${MOUNT_PREFIX}${k}`
  }

  // Sin huecos: el caller debe comparar contra planMaxDjs antes de llamar,
  // pero devolvemos null como defensa final.
  return null
}

/**
 * Lista todos los mounts disponibles (no ocupados) para el cliente hasta planMaxDjs.
 *
 * @param {string} clientId
 * @param {number} planMaxDjs
 * @returns {Promise<string[]>}
 */
export async function listAvailableMounts(clientId, planMaxDjs) {
  if (!clientId) throw new Error('clientId is required')
  if (!Number.isFinite(planMaxDjs) || planMaxDjs < 1) {
    throw new Error('planMaxDjs must be a positive integer')
  }

  const [rows] = await pool.query(
    `SELECT mount FROM radio_djs WHERE clientId = ?`,
    [clientId]
  )

  const used = new Set()
  for (const r of rows) {
    const n = parseMount(r.mount)
    if (n !== null) used.add(n)
  }

  const available = []
  for (let k = 1; k <= planMaxDjs; k++) {
    if (!used.has(k)) available.push(`${MOUNT_PREFIX}${k}`)
  }
  return available
}

/**
 * Indica si un mount dado (/djK) ya está en uso por otro slot del mismo cliente
 * (excluyendo el djId opcional pasado para PATCH sobre el mismo slot).
 *
 * @param {string} clientId
 * @param {string} mount
 * @param {string|null} excludeDjId  Slot a excluir de la búsqueda (PATCH sobre sí mismo).
 * @returns {Promise<boolean>}
 */
export async function isMountInUse(clientId, mount, excludeDjId = null) {
  if (!clientId || !mount) return false
  const params = [clientId, mount]
  let sql = `SELECT id FROM radio_djs WHERE clientId = ? AND mount = ?`
  if (excludeDjId) {
    sql += ` AND id <> ?`
    params.push(excludeDjId)
  }
  sql += ` LIMIT 1`
  const [rows] = await pool.query(sql, params)
  return rows.length > 0
}

/**
 * Parsea /djK a entero K. Devuelve null si el formato no es válido.
 */
function parseMount(mount) {
  if (typeof mount !== 'string') return null
  if (!mount.startsWith(MOUNT_PREFIX)) return null
  const n = parseInt(mount.slice(MOUNT_PREFIX.length), 10)
  if (!Number.isFinite(n) || n < 1) return null
  return n
}