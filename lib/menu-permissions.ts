import { prisma } from '@/lib/prisma'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'

/**
 * Devuelve un Set con las keys de los items ocultos GLOBALMENTE por el admin.
 * Si el campo hiddenMenuItems es null/inválido, devuelve Set vacío (fail-open).
 */
export async function getGloballyHiddenMenuItems(): Promise<Set<MenuItemKey>> {
  try {
    const config = await prisma.appConfig.findFirst({
      select: { hiddenMenuItems: true },
    })
    if (!config?.hiddenMenuItems) return new Set()
    const arr = JSON.parse(config.hiddenMenuItems)
    if (!Array.isArray(arr)) return new Set()
    return new Set(
      arr.filter((k): k is MenuItemKey => typeof k === 'string') as MenuItemKey[]
    )
  } catch (error) {
    console.error('Error cargando menú global:', error)
    return new Set()
  }
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
 * Devuelve un Set con las keys de los items que están DESHABILITADOS
 * para el cliente, combinando el override global, el per-client y las
 * secciones que su plan no incluye (radio/tv).
 * El global tiene prioridad absoluta.
 *
 * Fail-open: si la query falla, devuelve Set vacío para no romper el dashboard.
 */
export async function getDisabledMenuItems(clientId: string): Promise<Set<MenuItemKey>> {
  try {
    const [globalHidden, clientOverrides] = await Promise.all([
      getGloballyHiddenMenuItems(),
      prisma.clientMenuItem.findMany({
        where: { clientId, enabled: false },
        select: { itemKey: true },
      }),
    ])
    const disabled = new Set<MenuItemKey>([...globalHidden, ...clientOverrides.map((r) => r.itemKey as MenuItemKey)])

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

    return disabled
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
    const [globalHidden, row] = await Promise.all([
      getGloballyHiddenMenuItems(),
      prisma.clientMenuItem.findUnique({
        where: { clientId_itemKey: { clientId, itemKey } },
        select: { enabled: true },
      }),
    ])
    if (globalHidden.has(itemKey)) return false
    return row ? row.enabled : true
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
