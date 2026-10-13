// =====================================================
// Caché en proceso de permisos de menú
// =====================================================
// Evita consultar `app_config` + `client_menu_items` + plan en cada request de
// las rutas con MENU_GUARD y en el layout del dashboard. TTL corto para que un
// cambio del admin se refleje pronto; además se invalida explícitamente en las
// mutaciones de menú/plan.
//
// Alcance: el caché vive en el proceso del panel. Es correcto para el despliegue
// de una sola instancia; con varias réplicas el cambio propaga dentro del TTL.

import type { MenuItemKey } from '@/lib/menu-items'

export const MENU_CACHE_TTL_MS = Number(process.env.MENU_CACHE_TTL_MS) || 30000

export interface MenuCacheEntry {
  at: number
  globallyHidden: Set<MenuItemKey>
  overrides: Map<MenuItemKey, boolean>
  disabled: Set<MenuItemKey>
}

let globalHiddenCache: { at: number; value: Set<MenuItemKey> } | null = null
const clientCache = new Map<string, MenuCacheEntry>()

export function getCachedGlobalHidden(): Set<MenuItemKey> | null {
  if (!globalHiddenCache) return null
  if (Date.now() - globalHiddenCache.at > MENU_CACHE_TTL_MS) {
    globalHiddenCache = null
    return null
  }
  return globalHiddenCache.value
}

export function setCachedGlobalHidden(value: Set<MenuItemKey>): void {
  globalHiddenCache = { at: Date.now(), value }
}

export function getCachedMenuEntry(clientId: string): MenuCacheEntry | null {
  const entry = clientCache.get(clientId)
  if (!entry) return null
  if (Date.now() - entry.at > MENU_CACHE_TTL_MS) {
    clientCache.delete(clientId)
    return null
  }
  return entry
}

export function setCachedMenuEntry(clientId: string, entry: MenuCacheEntry): void {
  clientCache.set(clientId, entry)
}

/**
 * Invalida la caché de menú.
 * - Sin argumento: limpia el global y todos los clientes (cambio de menú global
 *   o de un plan, que afecta a varios clientes).
 * - Con `clientId`: limpia solo ese cliente (override de menú o cambio de plan).
 */
export function invalidateMenuCache(clientId?: string): void {
  globalHiddenCache = null
  if (clientId) clientCache.delete(clientId)
  else clientCache.clear()
}
