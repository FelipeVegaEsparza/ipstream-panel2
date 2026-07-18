import {
  HomeIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  UserGroupIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
  ShareIcon,
  CodeBracketIcon,
  SpeakerWaveIcon,
  PlayIcon,
  CreditCardIcon,
  PaintBrushIcon,
  BellIcon,
  PhotoIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  RadioIcon,
  MusicalNoteIcon,
  LinkIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline'

export type MenuItemKey =
  | 'dashboard'
  | 'basic-data'
  | 'social-networks'
  | 'template'
  | 'programs'
  | 'news'
  | 'podcasts'
  | 'videocasts'
  | 'videos'
  | 'galleries'
  | 'announcers'
  | 'polls'
  | 'events'
  | 'promotions'
  | 'sponsors'
  | 'notifications'
  | 'payments'
  | 'api-test'
  | 'tutorials'
  | 'support'
  | 'chat'
  | 'streaming'
  | 'streaming-library'
  | 'streaming-playlists'
  | 'streaming-jingles'
  | 'streaming-schedule'
  | 'streaming-connection'

export interface MenuItemDef {
  key: MenuItemKey
  name: string
  href: string
  section: 'Radio' | 'General' | 'Contenido' | 'Interactivos' | 'Sistema'
  icon: React.ComponentType<{ className?: string }>
  alwaysEnabled?: boolean
  children?: SubMenuItemDef[]
}

export interface SubMenuItemDef {
  key: MenuItemKey
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const MENU_ITEMS: MenuItemDef[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
  section: 'General',
  icon: HomeIcon,
  alwaysEnabled: true,
},
{
  key: 'streaming',
  name: 'Streaming',
  href: '/dashboard/streaming',
  section: 'Radio',
  icon: RadioIcon,
},
{
  key: 'streaming-library',
  name: 'Biblioteca',
  href: '/dashboard/streaming/library',
  section: 'Radio',
  icon: MusicalNoteIcon,
},
{
  key: 'streaming-playlists',
  name: 'Playlists',
  href: '/dashboard/streaming/playlists',
  section: 'Radio',
  icon: QueueListIcon,
},
{
  key: 'streaming-connection',
  name: 'Conexión DJ',
  href: '/dashboard/streaming/connection',
  section: 'Radio',
  icon: LinkIcon,
},
{
  key: 'streaming-jingles',
  name: 'Jingles',
  href: '/dashboard/streaming/jingles',
  section: 'Radio',
  icon: MusicalNoteIcon,
},
{
  key: 'streaming-schedule',
  name: 'Programación',
  href: '/dashboard/streaming/schedule',
  section: 'Radio',
  icon: CalendarDaysIcon,
},
  {
    key: 'basic-data',
    name: 'Datos Básicos',
    href: '/dashboard/basic-data',
    section: 'General',
    icon: Cog6ToothIcon,
  },
  {
    key: 'social-networks',
    name: 'Redes Sociales',
    href: '/dashboard/social-networks',
    section: 'General',
    icon: ShareIcon,
  },
  {
    key: 'template',
    name: 'Plantilla Sitio',
    href: '/dashboard/template',
    section: 'General',
    icon: PaintBrushIcon,
  },
  {
    key: 'programs',
    name: 'Programas',
    href: '/dashboard/programs',
    section: 'Contenido',
    icon: MicrophoneIcon,
  },
  {
    key: 'news',
    name: 'Noticias',
    href: '/dashboard/news',
    section: 'Contenido',
    icon: DocumentTextIcon,
  },
  {
    key: 'podcasts',
    name: 'Podcasts',
    href: '/dashboard/podcasts',
    section: 'Contenido',
    icon: SpeakerWaveIcon,
  },
  {
    key: 'videocasts',
    name: 'Videocasts',
    href: '/dashboard/videocasts',
    section: 'Contenido',
    icon: PlayIcon,
  },
  {
    key: 'videos',
    name: 'Ranking Videos',
    href: '/dashboard/videos',
    section: 'Contenido',
    icon: VideoCameraIcon,
  },
  {
    key: 'galleries',
    name: 'Galerías',
    href: '/dashboard/galleries',
    section: 'Contenido',
    icon: PhotoIcon,
  },
  {
    key: 'announcers',
    name: 'Locutores',
    href: '/dashboard/announcers',
    section: 'Contenido',
    icon: UserCircleIcon,
  },

  {
    key: 'polls',
    name: 'Encuestas',
    href: '/dashboard/polls',
    section: 'Interactivos',
    icon: ChartBarIcon,
  },
  {
    key: 'events',
    name: 'Eventos',
    href: '/dashboard/events',
    section: 'Interactivos',
    icon: CalendarDaysIcon,
  },
  {
    key: 'chat',
    name: 'Chat en Vivo',
    href: '/dashboard/chat',
    section: 'Interactivos',
    icon: ChatBubbleLeftRightIcon,
  },

  {
    key: 'promotions',
    name: 'Promociones',
    href: '/dashboard/promotions',
    section: 'Interactivos',
    icon: MegaphoneIcon,
  },

  {
    key: 'sponsors',
    name: 'Auspiciadores',
    href: '/dashboard/sponsors',
    section: 'Sistema',
    icon: UserGroupIcon,
  },
  {
    key: 'notifications',
    name: 'Notificaciones Push',
    href: '/dashboard/notifications',
    section: 'Sistema',
    icon: BellIcon,
  },
  {
    key: 'payments',
    name: 'Pagos',
    href: '/dashboard/payments',
    section: 'Sistema',
    icon: CreditCardIcon,
  },
  {
    key: 'api-test',
    name: 'Prueba API',
    href: '/dashboard/api-test',
    section: 'Sistema',
    icon: CodeBracketIcon,
  },
]

export const MENU_SECTIONS = ['General', 'Radio', 'Contenido', 'Interactivos', 'Sistema'] as const

export function getMenuItemsBySection(): Record<string, MenuItemDef[]> {
  const map: Record<string, MenuItemDef[]> = Object.fromEntries(MENU_SECTIONS.map((s) => [s, []]))
  for (const item of MENU_ITEMS) {
    map[item.section].push(item)
  }
  return map
}

export function findMenuItemByPath(path: string): MenuItemKey | null {
  for (const item of MENU_ITEMS) {
    if (path === item.href) return item.key
  }
  return null
}
