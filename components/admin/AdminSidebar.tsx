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
  EnvelopeIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
  SparklesIcon,
  GiftIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { APP_VERSION, APP_NAME } from '@/lib/version'
import { PanelLogo } from '@/components/ui/PanelLogo'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { adminMenuName, adminSectionName } from '@/lib/dashboard-i18n'

const navigationGroups = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard Admin', href: '/admin', icon: HomeIcon },
    ],
  },
  {
    label: 'Clientes y Pagos',
    items: [
      { name: 'Gestión de Usuarios', href: '/admin/users', icon: UserGroupIcon },
      { name: 'Planes y Pagos', href: '/admin/billing', icon: CreditCardIcon },
      { name: 'Tickets de soporte', href: '/admin/tickets', icon: LifebuoyIcon },
      { name: 'Consumo IA', href: '/admin/consumo-ia', icon: SparklesIcon },
      { name: 'Paquetes IA', href: '/admin/paquetes-ia', icon: GiftIcon },
      { name: 'Impersonar Cliente', href: '/admin/impersonate', icon: ArrowPathRoundedSquareIcon },
    ],
  },
  {
    label: 'Streaming',
    items: [
      { name: 'Streaming', href: '/admin/streaming', icon: RadioIcon },
      { name: 'Efectos de sonido', href: '/admin/sound-effects', icon: SpeakerWaveIcon },
      { name: 'Música para jingles', href: '/admin/music', icon: MusicalNoteIcon },
      { name: 'Cápsulas informativas', href: '/admin/info-capsules', icon: SpeakerWaveIcon },
      { name: 'Servidores de Streaming', href: '/admin/servers', icon: ServerStackIcon },
      { name: 'Monitor', href: '/admin/monitor', icon: SignalIcon },
      { name: 'Comunicaciones', href: '/admin/comunicaciones', icon: EnvelopeIcon },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { name: 'Sitio público', href: '/admin/sitio', icon: GlobeAltIcon },
      { name: 'Plantillas Sitio', href: '/admin/templates', icon: PaintBrushIcon },
      { name: 'Noticias Genéricas', href: '/admin/news-global', icon: NewspaperIcon },
      { name: 'Categorías Noticias', href: '/admin/news-categories', icon: TagIcon },
      { name: 'Tutoriales', href: '/admin/tutorials', icon: PlayCircleIcon },
      { name: 'Categorías Tutoriales', href: '/admin/tutorial-categories', icon: RectangleStackIcon },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { name: 'Estadísticas Globales', href: '/admin/stats', icon: ChartBarIcon },
      { name: 'Menú Global', href: '/admin/menu', icon: EyeSlashIcon },
      { name: 'Configuración Sistema', href: '/admin/settings', icon: Cog6ToothIcon },
      { name: 'Logs de Actividad', href: '/admin/logs', icon: DocumentTextIcon },
      { name: 'Acerca del Sistema', href: '/admin/about', icon: InformationCircleIcon },
    ],
  },
]

interface AdminSidebarProps {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

function AdminSidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()
  const { locale, t } = useDashboardI18n()
  const label = (name: string) => adminMenuName(locale, name)
  const sectionLabel = (name: string) => adminSectionName(locale, name)

  return (
    <div className="flex grow flex-col gap-y-4 overflow-y-auto bg-surface-1 px-3 pb-4 border-r border-line">
      <div className="flex h-16 shrink-0 items-center px-1">
        <PanelLogo className="h-8 w-auto" />
      </div>
      
      {/* Admin Badge */}
      <div className="rounded-control border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <div className="flex items-center justify-center space-x-2">
          <svg className="h-4 w-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span className="text-[11px] font-medium text-amber-300">{locale === 'en' ? 'ADMINISTRATOR' : 'ADMINISTRADOR'}</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-6">
          {navigationGroups.map((group) => (
            <li key={group.label}>
              <p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground">
                {sectionLabel(group.label)}
              </p>
              <ul role="list" className="space-y-1">
                {group.items.map((item) => {
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
                          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                            isActive ? 'text-signal' : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{label(item.name)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer del sidebar */}
      <div className="border-t border-line px-2 pb-1 pt-3">
        <p className="text-[11px] font-medium text-muted-foreground">{APP_NAME} Admin</p>
        <p className="dashboard-metric text-[10px] text-muted-foreground/70">v{APP_VERSION}</p>
      </div>
    </div>
  )
}

export function AdminSidebar({ sidebarOpen = false, setSidebarOpen }: AdminSidebarProps) {
  const { t } = useDashboardI18n()
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
            <div className="fixed inset-0 bg-background/80" />
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
              <Dialog.Panel className="relative mr-16 flex w-full max-w-[280px] flex-1">
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
                      <span className="sr-only">{t('adminSidebar.close')}</span>
                      <XMarkIcon className="h-6 w-6 text-foreground" aria-hidden="true" />
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[248px] lg:flex-col">
        <AdminSidebarContent />
      </div>
    </>
  )
}