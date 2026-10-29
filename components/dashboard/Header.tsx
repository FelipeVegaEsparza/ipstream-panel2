'use client'

import { signOut } from 'next-auth/react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bars3Icon, SunIcon, MoonIcon, PlayCircleIcon, LifebuoyIcon, GlobeAltIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { useImpersonationSession } from '@/lib/useImpersonationSession'
import { useTheme } from '@/components/providers/ThemeProvider'
import { getTicketLastRead } from '@/lib/ticket-read-state'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { MENU_ITEMS } from '@/lib/menu-items'
import { menuName } from '@/lib/dashboard-i18n'
import { PanelLanguageSwitcher } from './PanelLanguageSwitcher'

interface HeaderProps {
  user: {
    name?: string | null
    email: string
  }
  setSidebarOpen?: (open: boolean) => void
  websiteUrl?: string | null
}

export function Header({ user, setSidebarOpen, websiteUrl }: HeaderProps) {
  const { t, locale } = useDashboardI18n()
  const pathname = usePathname()
  const { effectiveUser, isImpersonating } = useImpersonationSession()

  const currentItem = MENU_ITEMS
    .flatMap((item) => [item, ...(item.children ?? [])])
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const currentLabel = currentItem ? menuName(locale, currentItem.name) : t('header.controlRoom')

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
    <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b border-line bg-background px-4 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-ml-1 rounded-control p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        onClick={() => setSidebarOpen?.(true)}
      >
        <span className="sr-only">{t('header.openSidebar')}</span>
        <Bars3Icon className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="dashboard-label hidden sm:inline">Control Room</span>
        <span className="hidden text-muted-foreground/40 sm:inline">/</span>
        <span className="truncate text-[13px] font-medium text-foreground">{currentLabel}</span>
      </div>

      <div className="flex items-center gap-x-1.5 lg:gap-x-2">
          {/* Ir a mi sitio Web */}
          {websiteUrl && (
            <>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-control border border-signal/30 px-2.5 py-1.5 text-xs text-signal transition-colors hover:bg-signal/10"
              >
                <GlobeAltIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('header.myWebsite')}</span>
              </a>
              <div className="hidden sm:block h-4 w-px bg-line" />
            </>
          )}

          {/* Quick nav */}
          <Link
            href="/dashboard/tutorials"
            className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
          >
            <PlayCircleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.tutorials')}</span>
          </Link>
          <div className="hidden sm:block h-4 w-px bg-line" />
          <Link
            href="/dashboard/support"
            className="relative flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
          >
            <LifebuoyIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.support')}</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <div className="h-4 w-px bg-line" />

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

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center rounded-control p-1 transition-colors hover:bg-surface-3">
              <span className="sr-only">{t('header.openUserMenu')}</span>
              <div className="flex items-center space-x-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  isImpersonating
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-line bg-surface-3 text-foreground'
                }`}>
                  <span className="text-xs font-semibold">
                    {(displayUser.name || displayUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-[13px] font-medium leading-5 text-foreground">
                    {displayUser.name || displayUser.email}
                  </span>
                  {isImpersonating && (
                    <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      {t('header.impersonating')}
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-panel border border-line bg-popover py-1.5 shadow-popover focus:outline-none">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    {isImpersonating ? t('header.impersonatingAs') : t('header.connectedAs')}
                  </p>
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {displayUser.name || displayUser.email}
                  </p>
                  {isImpersonating && (
                    <p className="text-xs text-amber-400 mt-1">
                      {t('header.adminModeActive')}
                    </p>
                  )}
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/dashboard/sound-effects"
                      className={`${
                        active ? 'bg-surface-3' : ''
                      } flex w-full items-center px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground`}
                    >
                      <SpeakerWaveIcon className="mr-3 h-4 w-4" />
                      {t('header.soundEffects')}
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
                      {t('header.logout')}
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
    </div>
  )
}
