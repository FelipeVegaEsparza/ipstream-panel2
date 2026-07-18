'use client'

import { usePathname } from 'next/navigation'
import { EyeOff } from 'lucide-react'
import { findGloballyHiddenItemForPath } from '@/lib/menu-permissions'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'

interface GlobalMenuBannerProps {
  globallyHidden: MenuItemKey[]
}

export function GlobalMenuBanner({ globallyHidden }: GlobalMenuBannerProps) {
  const path = usePathname()
  if (!path) return null
  const hiddenSet = new Set(globallyHidden)
  const hiddenKey = findGloballyHiddenItemForPath(hiddenSet, path)
  if (!hiddenKey) return null
  const item = MENU_ITEMS.find((i) => i.key === hiddenKey)
    ?? MENU_ITEMS.flatMap((i) => i.children ?? []).find((c) => c.key === hiddenKey)
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-sm px-4 py-2 flex items-center gap-2">
      <EyeOff className="h-4 w-4 flex-shrink-0" />
      <span>
        La sección <strong>{item?.name ?? hiddenKey}</strong> está oculta del menú por configuración global del administrador.
      </span>
    </div>
  )
}
