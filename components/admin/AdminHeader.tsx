'use client'

import { signOut } from 'next-auth/react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import Link from 'next/link'
import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/components/providers/ThemeProvider'

interface AdminHeaderProps {
  user: {
    name?: string | null
    email: string
  }
  setSidebarOpen?: (open: boolean) => void
}

export function AdminHeader({ user, setSidebarOpen }: AdminHeaderProps) {
  const { theme, toggle } = useTheme()
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
        <div className="flex flex-1 items-center">
          {/* Admin indicator */}
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-amber-300 font-medium">Modo Administrador</span>
          </div>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
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

          {/* Quick access to client dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors text-sm text-gray-300 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Ver como Cliente</span>
          </Link>

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center p-2 rounded-xl hover:bg-gray-700/50 transition-colors">
              <span className="sr-only">Abrir menú de usuario</span>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-semibold leading-6 text-gray-100">
                    {user.name || user.email}
                  </span>
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
                  <p className="text-sm text-gray-300">Administrador</p>
                  <p className="text-sm font-medium text-gray-100 truncate">
                    {user.name || user.email}
                  </p>
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/dashboard"
                      className={`${
                        active ? 'bg-gray-700' : ''
                      } flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Ver como Cliente
                    </Link>
                  )}
                </Menu.Item>
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