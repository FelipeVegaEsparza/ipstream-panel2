'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowPathRoundedSquareIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  PaintBrushIcon,
  NewspaperIcon,
  TagIcon,
  PlayCircleIcon,
  RectangleStackIcon,
  LifebuoyIcon,
  EyeSlashIcon,
  RadioIcon,
  SignalIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import { APP_VERSION, APP_NAME } from '@/lib/version'

const navigation = [
  { name: 'Dashboard Admin', href: '/admin', icon: HomeIcon },
  { name: 'Gestión de Usuarios', href: '/admin/users', icon: UserGroupIcon },
  { name: 'Estadísticas Globales', href: '/admin/stats', icon: ChartBarIcon },
  { name: 'Planes y Pagos', href: '/admin/billing', icon: CreditCardIcon },
  { name: 'Streaming', href: '/admin/streaming', icon: RadioIcon },
  { name: 'Servidores de Streaming', href: '/admin/servers', icon: ServerStackIcon },
  { name: 'Monitor', href: '/admin/monitor', icon: SignalIcon },
  { name: 'Tickets de soporte', href: '/admin/tickets', icon: LifebuoyIcon },
  { name: 'Plantillas Sitio', href: '/admin/templates', icon: PaintBrushIcon },
  { name: 'Noticias Genéricas', href: '/admin/news-global', icon: NewspaperIcon },
  { name: 'Categorías Noticias', href: '/admin/news-categories', icon: TagIcon },
  { name: 'Tutoriales', href: '/admin/tutorials', icon: PlayCircleIcon },
  { name: 'Categorías Tutoriales', href: '/admin/tutorial-categories', icon: RectangleStackIcon },
  { name: 'Impersonar Cliente', href: '/admin/impersonate', icon: ArrowPathRoundedSquareIcon },
  { name: 'Menú Global', href: '/admin/menu', icon: EyeSlashIcon },
  { name: 'Configuración Sistema', href: '/admin/settings', icon: Cog6ToothIcon },
  { name: 'Logs de Actividad', href: '/admin/logs', icon: DocumentTextIcon },
  { name: 'Acerca del Sistema', href: '/admin/about', icon: InformationCircleIcon },
]

interface AdminSidebarProps {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

function AdminSidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto gradient-bg px-6 pb-4 shadow-2xl border-r border-gray-700">
      <div className="flex h-20 shrink-0 items-center justify-center">
        <img
          src="/logo-ipstream.png"
          alt="IPStream Panel"
          className="h-12 w-auto filter drop-shadow-lg"
        />
      </div>
      
      {/* Admin Badge */}
      <div className="glass-effect rounded-xl p-3 text-center border border-amber-500/30">
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span className="text-amber-300 font-semibold text-sm">ADMINISTRADOR</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      className={`sidebar-item group ${
                        isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                      }`}
                    >
                      <item.icon
                        className={`h-6 w-6 shrink-0 transition-colors ${
                          isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-full"></div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        </ul>
      </nav>
      
      {/* Footer del sidebar */}
      <div className="glass-effect rounded-xl p-4 text-center">
        <p className="text-xs text-gray-400">{APP_NAME} Admin</p>
        <p className="text-xs text-gray-500">v{APP_VERSION}</p>
      </div>
    </div>
  )
}

export function AdminSidebar({ sidebarOpen = false, setSidebarOpen }: AdminSidebarProps) {
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
                <AdminSidebarContent onLinkClick={() => setSidebarOpen?.(false)} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <AdminSidebarContent />
      </div>
    </>
  )
}