'use client'

import { signOut } from 'next-auth/react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import Link from 'next/link'
import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { PanelLanguageSwitcher } from '@/components/dashboard/PanelLanguageSwitcher'

interface AdminHeaderProps {
  user: {
    name?: string | null
    email: string
  }
  setSidebarOpen?: (open: boolean) => void
}

export function AdminHeader({ user, setSidebarOpen }: AdminHeaderProps) {
  const { theme, toggle } = useTheme()
  const { t } = useDashboardI18n()
  return (
    <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b border-line bg-background px-4 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-ml-1 rounded-control p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        onClick={() => setSidebarOpen?.(true)}
      >
        <span className="sr-only">{t('adminHeader.openSidebar')}</span>
        <Bars3Icon className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          {/* Admin indicator */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--warn)]" />
            <span className="text-[11px] font-medium text-[color:var(--warn)]">{t('adminHeader.adminMode')}</span>
          </div>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <PanelLanguageSwitcher />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </button>

          {/* Quick access to client dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-control border border-line px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{t('adminHeader.viewAsClient')}</span>
          </Link>

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center rounded-control p-1 transition-colors hover:bg-surface-3">
              <span className="sr-only">{t('adminHeader.openUserMenu')}</span>
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                  <span className="text-xs font-semibold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-[13px] font-medium leading-5 text-foreground">
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-panel border border-line bg-popover py-1.5 shadow-popover focus:outline-none">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="text-sm text-muted-foreground">{t('adminHeader.administrator')}</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name || user.email}
                  </p>
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/dashboard"
                      className={`${
                        active ? 'bg-surface-3' : ''
                      } flex w-full items-center px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t('adminHeader.viewAsClient')}
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => signOut()}
                      className={`${
                        active ? 'bg-surface-3' : ''
                      } flex w-full items-center px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t('adminHeader.logout')}
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