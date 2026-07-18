'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import {
  MENU_ITEMS,
  MENU_SECTIONS,
  type MenuItemKey,
} from '@/lib/menu-items'
import { filterMenuItems } from '@/lib/menu-permissions'

import { APP_VERSION, APP_NAME } from '@/lib/version'

interface NavSection {
  name: string
  items: typeof MENU_ITEMS
}

const STORAGE_KEY = 'sidebar-sections'
const CHILDREN_STORAGE_KEY = 'sidebar-children'

function getInitialOpenSections(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    return Object.fromEntries(MENU_SECTIONS.map((s) => [s, true]))
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...Object.fromEntries(MENU_SECTIONS.map((s) => [s, true])), ...JSON.parse(stored) }
    }
  } catch {}
  return Object.fromEntries(MENU_SECTIONS.map((s) => [s, true]))
}

function getInitialOpenChildren(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(CHILDREN_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return {}
}

interface SidebarProps {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
  disabledItems?: Set<MenuItemKey>
}

export function Sidebar({ sidebarOpen = false, setSidebarOpen, disabledItems }: SidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(getInitialOpenSections)
  const [openChildren, setOpenChildren] = useState<Record<string, boolean>>(getInitialOpenChildren)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections))
    } catch {}
  }, [openSections])

  useEffect(() => {
    try {
      localStorage.setItem(CHILDREN_STORAGE_KEY, JSON.stringify(openChildren))
    } catch {}
  }, [openChildren])

  const toggleSection = useCallback((name: string) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }))
  }, [])

  const toggleChildren = useCallback((key: string) => {
    setOpenChildren((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const visibleItems = useMemo(
    () => filterMenuItems(disabledItems ?? new Set<MenuItemKey>()),
    [disabledItems]
  )

  const disabledSet = useMemo(() => disabledItems ?? new Set<MenuItemKey>(), [disabledItems])

  const sections: NavSection[] = useMemo(() => {
    const map: Record<string, typeof MENU_ITEMS> = Object.fromEntries(MENU_SECTIONS.map((s) => [s, []]))
    for (const item of visibleItems) {
      if (item.children) {
        map[item.section].push({
          ...item,
          children: item.children.filter((c) => !disabledSet.has(c.key)),
        })
      } else {
        map[item.section].push(item)
      }
    }
    return MENU_SECTIONS.map((name) => ({ name, items: map[name] })).filter(
      (s) => s.items.length > 0
    )
  }, [visibleItems, disabledSet])

  const isChildActive = (child: { href: string }) =>
    pathname === child.href || pathname.startsWith(child.href + '/')

  const hasActiveChild = (item: typeof MENU_ITEMS[number]) =>
    item.children?.some((c) => isChildActive(c)) ?? false

  const renderNavContent = (onLinkClick?: () => void) => (
    <div className="flex min-h-0 grow flex-col gap-y-5 overflow-y-auto gradient-bg px-6 pb-4 shadow-2xl border-r border-gray-700">
      <div className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-center gradient-bg -mx-6 px-6">
        <img
          src="/logo-ipstream.png"
          alt="IPStream Panel"
          className="h-12 w-auto filter drop-shadow-lg"
        />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-6">
          {sections.map((section) => {
            const isOpen = openSections[section.name] ?? true
            return (
              <li key={section.name}>
                <button
                  onClick={() => toggleSection(section.name)}
                  className="flex w-full items-center justify-between px-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {section.name}
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <ul role="list" className="space-y-1 pt-1">
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href
                      const hasChildren = item.children && item.children.length > 0
                      const isChildGroupOpen = openChildren[item.key] ?? hasActiveChild(item)

                      return (
                        <li key={item.key}>
                          {hasChildren ? (
                            <>
                              <div className="relative flex items-center">
                                  <Link
                                    href={item.href}
                                    onClick={(e) => {
                                      onLinkClick?.()
                                      if (!isChildGroupOpen) toggleChildren(item.key)
                                    }}
                                    className={`sidebar-item group flex-1 ${
                                      isActive
                                        ? 'sidebar-item-active'
                                        : 'sidebar-item-inactive'
                                    }`}
                                  >
                                    <item.icon
                                      className={`h-6 w-6 shrink-0 transition-colors ${
                                        isActive
                                          ? 'text-cyan-400'
                                          : 'text-gray-400 group-hover:text-cyan-400'
                                      }`}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate flex-1">{item.name}</span>
                                    {isActive && (
                                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-full"></div>
                                    )}
                                  </Link>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleChildren(item.key) }}
                                  className="flex items-center justify-center w-8 h-8 mr-1 rounded hover:bg-gray-700/50 transition-colors"
                                  title={isChildGroupOpen ? 'Contraer' : 'Expandir'}
                                >
                                  <ChevronDownIcon
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                      isChildGroupOpen ? 'rotate-0' : '-rotate-90'
                                    }`}
                                  />
                                </button>
                              </div>
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  isChildGroupOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                              >
                                <ul className="space-y-0.5 pt-0.5 pl-3">
                                  {item.children!.map((child) => {
                                    const childActive = isChildActive(child)
                                    return (
                                      <li key={child.key}>
                                        <Link
                                          href={child.href}
                                          onClick={onLinkClick}
                                          className={`sidebar-item group pl-4 ${
                                            childActive
                                              ? 'sidebar-item-active'
                                              : 'sidebar-item-inactive'
                                          }`}
                                        >
                                          <child.icon
                                            className={`h-5 w-5 shrink-0 transition-colors ${
                                              childActive
                                                ? 'text-cyan-400'
                                                : 'text-gray-400 group-hover:text-cyan-400'
                                            }`}
                                            aria-hidden="true"
                                          />
                                          <span className="truncate text-sm">{child.name}</span>
                                          {childActive && (
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-full"></div>
                                          )}
                                        </Link>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            </>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={onLinkClick}
                              className={`sidebar-item group ${
                                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                              }`}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <item.icon
                                className={`h-6 w-6 shrink-0 transition-colors ${
                                  isActive
                                    ? 'text-cyan-400'
                                    : 'text-gray-400 group-hover:text-cyan-400'
                                }`}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.name}</span>
                              {isActive && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-full"></div>
                              )}
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="glass-effect rounded-xl p-4 text-center">
        <p className="text-xs text-gray-400">{APP_NAME}</p>
        <p className="text-xs text-gray-500">v{APP_VERSION}</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={() => setSidebarOpen?.(false)}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen?.(false)}
                    >
                      <span className="sr-only">Cerrar sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                {renderNavContent(() => setSidebarOpen?.(false))}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col min-h-0">
        {renderNavContent()}
      </div>
    </>
  )
}
