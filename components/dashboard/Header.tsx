'use client'

import { signOut } from 'next-auth/react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bars3Icon, SunIcon, MoonIcon, PlayCircleIcon, LifebuoyIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { useImpersonationSession } from '@/lib/useImpersonationSession'
import { useTheme } from '@/components/providers/ThemeProvider'
import { getTicketLastRead } from '@/lib/ticket-read-state'

interface HeaderProps {
  user: {
    name?: string | null
    email: string
  }
  setSidebarOpen?: (open: boolean) => void
  websiteUrl?: string | null
}

export function Header({ user, setSidebarOpen, websiteUrl }: HeaderProps) {
  const { effectiveUser, isImpersonating } = useImpersonationSession()
  
  // Usar el usuario efectivo si hay impersonación activa
  const displayUser = effectiveUser || user
  const { theme, toggle } = useTheme()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch('/api/dashboard/support/unread-summary')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const count = (data.tickets || []).filter((t: { id: string; updatedAt: string; lastMessageAuthorType: string | null }) => {
          if (t.lastMessageAuthorType !== 'admin') return false
          const lastRead = getTicketLastRead(t.id)
          return new Date(t.updatedAt).getTime() > lastRead
        }).length
        setUnread(count)
      } catch {}
    }
    check()
    const id = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-md px-4 shadow-xl sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-400 lg:hidden hover:text-white transition-colors"
        onClick={() => setSidebarOpen?.(true)}
      >
        <span className="sr-only">Abrir sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1"></div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Ir a mi sitio Web */}
          {websiteUrl && (
            <>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-cyan-300 hover:text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/30 transition-colors"
              >
                <GlobeAltIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Ir a mi sitio Web</span>
              </a>
              <div className="hidden sm:block w-px h-5 bg-gray-700" />
            </>
          )}

          {/* Quick nav */}
          <Link
            href="/dashboard/tutorials"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-cyan-400 hover:bg-gray-700/50 transition-colors"
          >
            <PlayCircleIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Tutoriales</span>
          </Link>
          <div className="hidden sm:block w-px h-5 bg-gray-700" />
          <Link
            href="/dashboard/support"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-cyan-400 hover:bg-gray-700/50 transition-colors relative"
          >
            <LifebuoyIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Soporte</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <div className="w-px h-5 bg-gray-700" />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-gray-700/50 transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center p-2 rounded-xl hover:bg-gray-700/50 transition-colors">
              <span className="sr-only">Abrir menú de usuario</span>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isImpersonating 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                }`}>
                  <span className="text-white font-semibold text-sm">
                    {(displayUser.name || displayUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-semibold leading-6 text-gray-100">
                    {displayUser.name || displayUser.email}
                  </span>
                  {isImpersonating && (
                    <span className="ml-2 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                      Impersonando
                    </span>
                  )}
                </span>
              </div>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-xl bg-gray-800 py-2 shadow-2xl ring-1 ring-gray-700 focus:outline-none border border-gray-700">
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm text-gray-300">
                    {isImpersonating ? 'Impersonando como' : 'Conectado como'}
                  </p>
                  <p className="text-sm font-medium text-gray-100 truncate">
                    {displayUser.name || displayUser.email}
                  </p>
                  {isImpersonating && (
                    <p className="text-xs text-amber-400 mt-1">
                      Modo administrador activo
                    </p>
                  )}
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => signOut()}
                      className={`${
                        active ? 'bg-gray-700' : ''
                      } flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  )
}