// =====================================================
// Analytics — enriquecimiento de sesiones
// =====================================================
// Combina geolocalización y clasificación de dispositivo. Puro.

import { lookupGeo } from './geo.js'
import { classifyUserAgent } from './ua.js'

/**
 * @param {object} session
 * @returns {object} sesión con country/city/device/browser/userAgent normalizados
 */
export function enrichSession(session) {
  const { country, city } = lookupGeo(session.ip)
  const { device, browser } = classifyUserAgent(session.userAgent)
  return {
    ...session,
    country,
    city,
    device,
    browser,
    userAgent: session.userAgent ? session.userAgent.slice(0, 500) : null,
  }
}
