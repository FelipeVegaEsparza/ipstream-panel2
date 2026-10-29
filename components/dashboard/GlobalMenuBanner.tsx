'use client'

import { usePathname } from 'next/navigation'
import { EyeOff } from 'lucide-react'
import { findGloballyHiddenItemForPath } from '@/lib/menu-permissions'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface GlobalMenuBannerProps {
  globallyHidden: MenuItemKey[]
}

export function GlobalMenuBanner({ globallyHidden }: GlobalMenuBannerProps) {
  const { t } = useDashboardI18n()
  const path = usePathname()
  if (!path) return null
  const hiddenSet = new Set(globallyHidden)
  const hiddenKey = findGloballyHiddenItemForPath(hiddenSet, path)
  if (!hiddenKey) return null
  const item = MENU_ITEMS.find((i) => i.key === hiddenKey)
    ?? MENU_ITEMS.flatMap((i) => i.children ?? []).find((c) => c.key === hiddenKey)
  return (
    <div className="flex items-center gap-2 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 sm:px-6 lg:px-8">
      <EyeOff className="h-4 w-4 flex-shrink-0" />
      <span>
        {t('menuBanner.hidden', { name: item?.name ?? hiddenKey })}
      </span>
    </div>
  )
}
