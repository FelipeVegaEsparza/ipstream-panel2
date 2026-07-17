'use client'

import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

interface AdminLayoutClientProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email: string
  }
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="lg:pl-72">
        <AdminHeader user={user} setSidebarOpen={setSidebarOpen} />
        <main className="py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}