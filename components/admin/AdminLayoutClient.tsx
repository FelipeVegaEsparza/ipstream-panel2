'use client'

import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
import { ServerAlerts } from './ServerAlerts'
import { DashboardI18nProvider } from '@/components/providers/DashboardI18nProvider'
import type { DashboardLocale } from '@/lib/dashboard-i18n'

interface AdminLayoutClientProps {
  children: React.ReactNode
  locale: DashboardLocale
  user: {
    name?: string | null
    email: string
  }
}

export function AdminLayoutClient({ children, locale, user }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <DashboardI18nProvider locale={locale}>
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="lg:pl-[248px]">
        <AdminHeader user={user} setSidebarOpen={setSidebarOpen} />
        <ServerAlerts />
        <main className="py-6 md:py-8">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10">
            {children}
          </div>
        </main>
      </div>
    </DashboardI18nProvider>
  )
}