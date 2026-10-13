import { prisma } from '@/lib/prisma'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'
import {
  getCachedGlobalHidden,
  setCachedGlobalHidden,
  getCachedMenuEntry,
  setCachedMenuEntry,
  type MenuCacheEntry,
} from '@/lib/menu-cache'

/**
 * Devuelve un Set con las keys de los items ocultos GLOBALMENTE por el admin.
 * Si el campo hiddenMenuItems es null/inválido, devuelve Set vacío (fail-open).
 * El resultado se cachea en proceso con TTL corto.
 */
export async function getGloballyHiddenMenuItems(): Promise<Set<MenuItemKey>> {
  const cached = getCachedGlobalHidden()
  if (cached) return cached

  let value: Set<MenuItemKey>
  try {
    const config = await prisma.appConfig.findFirst({
      select: { hiddenMenuItems: true },
    })
    if (!config?.hiddenMenuItems) {
      value = new Set()
    } else {
      const arr = JSON.parse(config.hiddenMenuItems)
      value = Array.isArray(arr)
        ? new Set(arr.filter((k): k is MenuItemKey => typeof k === 'string') as MenuItemKey[])
        : new Set()
    }
  } catch (error) {
    console.error('Error cargando menú global:', error)
    return new Set()
  }

  setCachedGlobalHidden(value)
  return value
}

/**
 * Keys de menú que se ocultan automáticamente según los servicios del plan.
 * - 'radio' → oculta toda la sección Televisión
 * - 'tv'    → oculta toda la sección Radio
 * - 'both'  → nada oculto por plan
 */
function planHiddenKeys(services: string): MenuItemKey[] {
  const hideSection = services === 'radio' ? 'Televisión' : services === 'tv' ? 'Radio' : null
  if (!hideSection) return []
  const keys: MenuItemKey[] = []
  for (const item of MENU_ITEMS) {
    if (item.section === hideSection) {
      keys.push(item.key)
      if (item.children) {
        for (const c of item.children) keys.push(c.key)
      }
    }
  }
  return keys
}

/**
 * Resuelve y cachea los permisos de menú de un cliente: items ocultos globales,
 * overrides por cliente y secciones ocultas por plan. Una sola lectura de DB
 * alimenta a `getDisabledMenuItems` y a `isMenuItemEnabled`.
 */
async function computeMenuEntry(clientId: string): Promise<MenuCacheEntry> {
  const [globallyHidden, rows] = await Promise.all([
    getGloballyHiddenMenuItems(),
    prisma.clientMenuItem.findMany({
      where: { clientId },
      select: { itemKey: true, enabled: true },
    }),
  ])

  const overrides = new Map<MenuItemKey, boolean>()
  for (const row of rows) overrides.set(row.itemKey as MenuItemKey, row.enabled)

  const disabled = new Set<MenuItemKey>(globallyHidden)
  for (const [key, enabled] of overrides) {
    if (!enabled) disabled.add(key)
  }

  // Plan: ocultar secciones no incluidas
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { plan: { select: { services: true, menuHiddenKeys: true } } },
    })
    const services = client?.plan?.services || 'both'
    for (const k of planHiddenKeys(services)) disabled.add(k)
    // Ocultar items puntuales definidos en el plan
    if (client?.plan?.menuHiddenKeys) {
      try {
        const arr = JSON.parse(client.plan.menuHiddenKeys)
        if (Array.isArray(arr)) {
          for (const k of arr) {
            if (typeof k === 'string') disabled.add(k as MenuItemKey)
          }
        }
      } catch {}
    }
  } catch {}

  return { at: Date.now(), globallyHidden, overrides, disabled }
}

async function getMenuEntry(clientId: string): Promise<MenuCacheEntry> {
  const cached = getCachedMenuEntry(clientId)
  if (cached) return cached
  const entry = await computeMenuEntry(clientId)
  setCachedMenuEntry(clientId, entry)
  return entry
}

/**
 * Devuelve un Set con las keys de los items que están DESHABILITADOS
 * para el cliente, combinando el override global, el per-client y las
 * secciones que su plan no incluye (radio/tv).
 * El global tiene prioridad absoluta.
 *
 * Fail-open: si la query falla, devuelve Set vacío para no romper el dashboard.
 */
export async function getDisabledMenuItems(clientId: string): Promise<Set<MenuItemKey>> {
  try {
    const entry = await getMenuEntry(clientId)
    return entry.disabled
  } catch (error) {
    console.error('Error cargando permisos de menú:', error)
    return new Set()
  }
}

/**
 * Verifica si un item específico está habilitado para el cliente.
 * Considera tanto el override global como el per-client.
 * Default: true (visible) si no hay fila.
 */
export async function isMenuItemEnabled(
  clientId: string,
  itemKey: MenuItemKey
): Promise<boolean> {
  try {
    const entry = await getMenuEntry(clientId)
    if (entry.globallyHidden.has(itemKey)) return false
    return entry.overrides.get(itemKey) ?? true
  } catch (error) {
    console.error('Error verificando permiso de menú:', error)
    return true
  }
}

export interface MenuPermissions {
  clientId: string
  disabled: Set<MenuItemKey>
  globallyHidden: Set<MenuItemKey>
}

export function filterMenuItems(disabled: Set<MenuItemKey>) {
  return MENU_ITEMS.filter((item) => !disabled.has(item.key) || item.alwaysEnabled)
}

/**
 * Dada una ruta y un set de items ocultos globalmente, devuelve la key del item
 * correspondiente o null. Usado por el banner para detectar la sección actual.
 */
export function findGloballyHiddenItemForPath(
  globallyHidden: Set<MenuItemKey>,
  path: string
): MenuItemKey | null {
  for (const item of MENU_ITEMS) {
    if (path === item.href) {
      return globallyHidden.has(item.key) ? item.key : null
    }
  }
  return null
}
