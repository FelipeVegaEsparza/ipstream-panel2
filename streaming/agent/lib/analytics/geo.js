// =====================================================
// Analytics — geolocalización local (geoip-lite)
// =====================================================
// Función pura: resuelve país/ciudad desde la base local, sin
// llamadas externas. Devuelve nulls cuando no se puede resolver.

import geoip from 'geoip-lite'

/**
 * @param {string|null|undefined} ip
 * @returns {{ country: string|null, city: string|null }}
 */
export function lookupGeo(ip) {
  if (!ip || typeof ip !== 'string') {
    return { country: null, city: null }
  }

  // Normaliza IPv4 mapeada a IPv6 (::ffff:1.2.3.4).
  let clean = ip.trim()
  if (clean.startsWith('::ffff:')) clean = clean.slice(7)

  let hit = null
  try {
    hit = geoip.lookup(clean)
  } catch {
    hit = null
  }

  if (!hit) return { country: null, city: null }
  return {
    country: hit.country || null,
    city: hit.city || null,
  }
}
