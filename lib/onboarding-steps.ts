// =====================================================
// Onboarding — catálogo de tareas (compartido server/client)
// =====================================================

export interface OnboardingStepDef {
  key: string
  title: string
  description: string
  href: string
  actionLabel: string
  service: 'common' | 'radio' | 'tv'
}

/** Tareas disponibles, en orden canónico. */
export const ONBOARDING_STEP_DEFS: OnboardingStepDef[] = [
  {
    key: 'brand',
    title: 'Personaliza tu marca',
    description: 'Sube tu logo y completa los datos del proyecto.',
    href: '/dashboard/basic-data',
    actionLabel: 'Completar',
    service: 'common',
  },
  {
    key: 'programs',
    title: 'Crea tu primer programa',
    description: 'Arma la parrilla con horarios y días.',
    href: '/dashboard/programs',
    actionLabel: 'Crear programa',
    service: 'common',
  },
  {
    key: 'radio-library',
    title: 'Sube tu música',
    description: 'Carga canciones a tu biblioteca (MP3).',
    href: '/dashboard/streaming/library',
    actionLabel: 'Subir música',
    service: 'radio',
  },
  {
    key: 'radio-autodj',
    title: 'Inicia tu AutoDJ',
    description: 'Pon tu radio al aire con las playlists.',
    href: '/dashboard/streaming',
    actionLabel: 'Iniciar radio',
    service: 'radio',
  },
  {
    key: 'tv-library',
    title: 'Sube tus videos',
    description: 'Carga videos a tu videoteca.',
    href: '/dashboard/television/library',
    actionLabel: 'Subir videos',
    service: 'tv',
  },
  {
    key: 'tv-autodj',
    title: 'Pon tu TV al aire',
    description: 'Inicia la emisión automática de TV.',
    href: '/dashboard/television',
    actionLabel: 'Iniciar TV',
    service: 'tv',
  },
  {
    key: 'news',
    title: 'Publica una noticia',
    description: 'Suma contenido a tu sitio.',
    href: '/dashboard/news',
    actionLabel: 'Crear noticia',
    service: 'common',
  },
  {
    key: 'site',
    title: 'Comparte tu sitio',
    description: 'Tu sitio ya está online; compártelo con tus oyentes.',
    href: '/dashboard',
    actionLabel: 'Ver mi sitio',
    service: 'common',
  },
  {
    key: 'gc-bar',
    title: 'Configura la barra GC',
    description: 'Agrega mensajes a la barra de tu sitio.',
    href: '/dashboard/gc-bar',
    actionLabel: 'Configurar',
    service: 'common',
  },
]

export const ONBOARDING_STEP_KEYS = ONBOARDING_STEP_DEFS.map((s) => s.key)

/** Convierte el JSON guardado en el plan a una lista de keys válidas (o null). */
export function parseOnboardingSteps(value: string | null | undefined): string[] | null {
  if (!value) return null
  try {
    const arr = JSON.parse(value)
    if (Array.isArray(arr)) {
      const keys = arr.filter((k): k is string => typeof k === 'string' && ONBOARDING_STEP_KEYS.includes(k))
      return keys.length ? keys : null
    }
  } catch {
    // valor inválido → usar el default
  }
  return null
}
