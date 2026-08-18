// =====================================================
// Icecast 2 — cliente HTTP
// =====================================================
// Icecast expone:
//   - GET  /status-json.xsl        — estado global, sin auth
//   - GET  /admin/stats            — estadísticas, requiere auth
//   - GET  /admin/listclients?mount=<m>  — listeners de un mount
//   - GET  /admin/moveclients?...  — mover listeners
//   - GET  /admin/killsource?mount=<m>  — kickear source (DJ)
//   - GET  /admin/updatemetadata?mount=<m>&song=<s>  — metadata
//
// Auth: HTTP Basic con admin user/password
// =====================================================

import { config } from './config.js'
import { logger } from './logger.js'

const BASE = `http://${config.ice.host}:${config.ice.port}`

const AUTH = 'Basic ' + Buffer.from(`${config.ice.adminUser}:${config.ice.adminPassword}`).toString('base64')

async function fetchText(path, { admin = false, timeoutMs = 5000 } = {}) {
  const headers = { 'User-Agent': 'ipstream-streaming-agent/0.1' }
  if (admin) headers['Authorization'] = AUTH

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  try {
    const res = await fetch(`${BASE}${path}`, { headers, signal: ctrl.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Icecast ${path} → ${res.status} ${res.statusText}: ${text.slice(0, 200)}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Lee el estado global de Icecast (todos los mountpoints).
 * @returns {Promise<IcecastStatus>}
 */
export async function getGlobalStatus() {
  const json = await fetchText('/status-json.xsl')
  return JSON.parse(json)
}

/**
 * Lee el estado de un mountpoint específico.
 * @param {string} mount — el nombre del mount SIN slash (ej: "test_abc")
 * @returns {Promise<MountStatus | null>}
 *
 * Icecast 2.4.x a veces NO incluye el campo `mount` en el JSON del source,
 * solo `listenurl` con la URL completa. Para hacerlo robusto, matchea
 * por `mount` o por el path final de `listenurl`.
 */
export async function getMountStatus(mount) {
  const status = await getGlobalStatus()
  const sources = status?.icestats?.source
  if (!sources) return null
  const list = Array.isArray(sources) ? sources : [sources]
  const targetMount = mount.startsWith('/') ? mount : `/${mount}`

  return (
    list.find((s) => {
      // Match directo por mount (Icecast ≥2.5 devuelve esto)
      if (s.mount && (s.mount === targetMount || s.mount === mount)) return true
      // Fallback: extraer el path de listenurl (ej: ".../radio_xxx")
      if (s.listenurl) {
        try {
          const url = new URL(s.listenurl)
          const path = url.pathname.replace(/^\//, '')
          return path === mount
        } catch {
          return false
        }
      }
      return false
    }) || null
  )
}

/**
 * Verifica si Icecast responde.
 */
export async function ping() {
  try {
    await getGlobalStatus()
    return true
  } catch (err) {
    logger.warn({ err: err.message }, 'Icecast ping failed')
    return false
  }
}

/**
 * Kickea el source actual de un mountpoint (útil para forzar cambio a AutoDJ).
 * Solo funciona si hay un source conectado.
 */
export async function killSource(mount) {
  return fetchText(`/admin/killsource?mount=/${encodeURIComponent(mount)}`, { admin: true })
}

/**
 * Actualiza metadata (now playing) de un mountpoint.
 * Requiere que haya un source conectado.
 */
export async function updateMetadata(mount, song) {
  return fetchText(`/admin/updatemetadata?mount=/${encodeURIComponent(mount)}&song=${encodeURIComponent(song)}`, { admin: true })
}
