// =====================================================
// DJ State — single source of truth for connected DJ slots
// =====================================================
// This module owns the in-memory map of active DJ slots and provides
// helpers to reconstruct it from Liquidsoap via telnet.

import { pool } from './db.js'
import { logger } from './logger.js'
import { getRadioDjs } from './liquidsoap.js'
import { listActiveHarborMounts } from './liquidsoap-telnet.js'

// Map<clientMount, Map<djMount, { connectedAt: number, slotName: string }>>
const _djActive = new Map()

export { _djActive }

export function isAnyDjActive(clientMount) {
  const slots = _djActive.get(sanitizeMount(clientMount))
  return slots ? slots.size > 0 : false
}

export function getDjActiveMounts(clientMount) {
  const slots = _djActive.get(sanitizeMount(clientMount))
  if (!slots) return []
  return [...slots.keys()]
}

export function setDjSlotActive(clientMount, djMount, active, slotName = null) {
  const key = sanitizeMount(clientMount)
  if (!_djActive.has(key)) {
    _djActive.set(key, new Map())
  }
  const slots = _djActive.get(key)
  if (active) {
    const existing = slots.get(djMount)
    slots.set(djMount, {
      connectedAt: existing?.connectedAt || Date.now(),
      slotName: slotName || existing?.slotName || null,
    })
  } else {
    slots.delete(djMount)
  }
  if (slots.size === 0) {
    _djActive.delete(key)
  }
}

/**
 * Rebuild _djActive for a single client by asking Liquidsoap which harbor
 * inputs are currently ready. Returns true if state was rebuilt.
 */
export async function rebuildDjState(clientId) {
  const [rsRows] = await pool.query(
    `SELECT id, icecastMount, liquidsoapTelnetPort FROM radio_streams WHERE clientId = ? AND liquidsoapRunning = 1`,
    [clientId]
  )
  if (rsRows.length === 0) return false
  const rs = rsRows[0]

  const djs = await getRadioDjs(clientId)
  if (djs.length === 0) {
    // Legacy single harbor input named 'live'
    const activeMounts = await listActiveHarborMounts(rs.liquidsoapTelnetPort, [
      { mount: '/live', sourceName: 'live' },
    ])
    if (activeMounts.includes('/live')) {
      setDjSlotActive(rs.icecastMount, '/live', true, 'live')
    } else {
      setDjSlotActive(rs.icecastMount, '/live', false)
    }
    return true
  }

  const slots = djs
    .filter(d => d.isActive !== false)
    .sort((a, b) => {
      const ROLE_ORDER = { owner: 0, host: 1, guest: 2 }
      const roleDiff = (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2)
      if (roleDiff !== 0) return roleDiff
      return (a.priority ?? 1) - (b.priority ?? 1)
    })
    .map((dj, idx) => ({ mount: dj.mount, sourceName: `dj${idx}` }))

  const activeMounts = await listActiveHarborMounts(rs.liquidsoapTelnetPort, slots)

  // Reset map for this client to mirror reality
  _djActive.delete(sanitizeMount(rs.icecastMount))
  for (const slot of slots) {
    const isActive = activeMounts.includes(slot.mount)
    if (isActive) {
      setDjSlotActive(rs.icecastMount, slot.mount, true, slot.sourceName)
    }
  }

  return true
}

/**
 * Rebuild state for all running streams. Called on agent startup.
 */
export async function rebuildAllDjState() {
  const [rows] = await pool.query(
    `SELECT clientId FROM radio_streams WHERE liquidsoapRunning = 1`
  )
  logger.info({ count: rows.length }, 'Reconstruyendo estado DJ para streams running')
  for (const row of rows) {
    try {
      await rebuildDjState(row.clientId)
    } catch (err) {
      logger.warn({ clientId: row.clientId, err: err.message }, 'rebuildDjState falló')
    }
  }
}

/**
 * For a given client mount, return the slot that is currently "on air"
 * according to the role-priority ordering. Returns null if none active.
 */
export function getOnAirSlot(clientMount) {
  const slots = _djActive.get(sanitizeMount(clientMount))
  if (!slots || slots.size === 0) return null
  // The first entry in the map already respects insertion order during rebuild,
  // but callers should rely on the role ordering used in script-generator.
  const [firstMount] = slots.keys()
  return { mount: firstMount, ...slots.get(firstMount) }
}

function sanitizeMount(mount) {
  if (!mount) return ''
  return String(mount).replace(/^\//, '')
}
