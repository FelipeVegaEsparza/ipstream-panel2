'use client'

import { useMemo, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { GlobalMenuBanner } from './GlobalMenuBanner'
import type { MenuItemKey } from '@/lib/menu-items'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email: string
  }
  disabledItems?: MenuItemKey[]
  globalHiddenItems?: MenuItemKey[]
  websiteUrl?: string | null
}

export function DashboardLayoutClient({
  children,
  user,
  disabledItems,
  globalHiddenItems,
  websiteUrl,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const disabledSet = useMemo(
    () => new Set<MenuItemKey>(disabledItems ?? []),
    [disabledItems]
  )
  const globalHidden = useMemo(
    () => globalHiddenItems ?? [],
    [globalHiddenItems]
  )

  return (
    <>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        disabledItems={disabledSet}
      />
      <div className="lg:pl-72">
        <Header user={user} setSidebarOpen={setSidebarOpen} websiteUrl={websiteUrl} />
        <GlobalMenuBanner globallyHidden={globalHidden} />
        <main className="py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}