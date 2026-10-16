// =====================================================
// Analytics — clasificación de dispositivo/navegador
// =====================================================
// Función pura: no depende de DB ni de config.

import { UAParser } from 'ua-parser-js'

/**
 * Clasifica un user-agent en tipo de dispositivo y navegador.
 * @param {string|null|undefined} ua
 * @returns {{ device: string, browser: string|null }}
 */
export function classifyUserAgent(ua) {
  if (!ua || typeof ua !== 'string') {
    return { device: 'unknown', browser: null }
  }

  let parsed
  try {
    parsed = new UAParser(ua).getResult()
  } catch {
    return { device: 'unknown', browser: null }
  }

  const type = parsed.device?.type || null
  let device = 'desktop'

  if (type === 'mobile') device = 'mobile'
  else if (type === 'tablet') device = 'tablet'
  else if (type === 'smarttv' || type === 'console') device = 'tv'
  else if (type === 'wearable') device = 'wearable'
  else if (!type) {
    // Fallback heurístico para UAs que el parser no tipa.
    const low = ua.toLowerCase()
    if (/smart-?tv|smarttv|appletv|roku|hbbtv|tizen|web0s/.test(low)) device = 'tv'
    else if (/ipad|tablet/.test(low)) device = 'tablet'
    else if (/mobile|android|iphone|ipod/.test(low)) device = 'mobile'
  }

  const browser = parsed.browser?.name || null
  return { device, browser }
}
