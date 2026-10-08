// =====================================================
// Onboarding — "Primeros pasos" (progreso derivado)
// =====================================================
// El progreso se calcula del estado real del cliente (no casillas manuales).
// Los pasos dependen de los servicios del plan (radio / tv / both).

import { prisma, type PrismaDb } from '@/lib/prisma'

export interface OnboardingStep {
  key: string
  title: string
  description: string
  href: string
  actionLabel: string
  done: boolean
}

export interface OnboardingProgress {
  steps: OnboardingStep[]
  total: number
  completed: number
  pending: number
  allDone: boolean
  dismissed: boolean
  services: ClientServices
}

export type ClientServices = 'radio' | 'tv' | 'both'

export function getServicesLabel(services: ClientServices): string {
  return services === 'radio' ? 'tu radio' : services === 'tv' ? 'tu canal' : 'tu radio y TV'
}

export async function getOnboarding(
  clientId: string,
  db: PrismaDb = prisma
): Promise<OnboardingProgress> {
  const [client, basic, programs, news, tracks, videotracks, radio, video] = await Promise.all([
    db.client.findUnique({
      where: { id: clientId },
      select: { plan: { select: { services: true } }, onboardingDismissedAt: true },
    }),
    db.basicData.findUnique({ where: { clientId }, select: { logoUrl: true, websiteUrl: true } }),
    db.program.count({ where: { clientId } }),
    db.news.count({ where: { clientId } }),
    db.track.count({ where: { clientId } }),
    db.videoTrack.count({ where: { clientId } }),
    db.radioStream.findUnique({ where: { clientId }, select: { status: true } }),
    db.videoStream.findUnique({ where: { clientId }, select: { status: true } }),
  ])

  const services: ClientServices =
    client?.plan?.services === 'radio' || client?.plan?.services === 'tv'
      ? client.plan.services
      : 'both'
  const hasRadio = services === 'radio' || services === 'both'
  const hasTv = services === 'tv' || services === 'both'

  const steps: OnboardingStep[] = [
    {
      key: 'brand',
      title: 'Personalizá tu marca',
      description: 'Subí tu logo y completá los datos del proyecto.',
      href: '/dashboard/basic-data',
      actionLabel: 'Completar',
      done: Boolean(basic?.logoUrl),
    },
    {
      key: 'programs',
      title: 'Creá tu primer programa',
      description: 'Armá la parrilla con horarios y días.',
      href: '/dashboard/programs',
      actionLabel: 'Crear programa',
      done: programs > 0,
    },
  ]

  if (hasRadio) {
    steps.push(
      {
        key: 'radio-library',
        title: 'Subí tu música',
        description: 'Cargá canciones a tu biblioteca (MP3).',
        href: '/dashboard/streaming/library',
        actionLabel: 'Subir música',
        done: tracks > 0,
      },
      {
        key: 'radio-autodj',
        title: 'Iniciá tu AutoDJ',
        description: 'Poné tu radio al aire con las playlists.',
        href: '/dashboard/streaming',
        actionLabel: 'Iniciar radio',
        done: radio?.status === 'autodj' || radio?.status === 'live',
      }
    )
  }

  if (hasTv) {
    steps.push(
      {
        key: 'tv-library',
        title: 'Subí tus videos',
        description: 'Cargá videos a tu videoteca.',
        href: '/dashboard/television/library',
        actionLabel: 'Subir videos',
        done: videotracks > 0,
      },
      {
        key: 'tv-autodj',
        title: 'Poné tu TV al aire',
        description: 'Iniciá la emisión automática de TV.',
        href: '/dashboard/television',
        actionLabel: 'Iniciar TV',
        done: video?.status === 'autodj' || video?.status === 'live',
      }
    )
  }

  steps.push(
    {
      key: 'news',
      title: 'Publicá una noticia',
      description: 'Sumá contenido a tu sitio.',
      href: '/dashboard/news',
      actionLabel: 'Crear noticia',
      done: news > 0,
    },
    {
      key: 'site',
      title: 'Compartí tu sitio',
      description: 'Tu sitio ya está online; compartilo con tus oyentes.',
      href: '/dashboard',
      actionLabel: 'Ver mi sitio',
      done: Boolean(basic?.websiteUrl),
    }
  )

  const completed = steps.filter((s) => s.done).length
  return {
    steps,
    total: steps.length,
    completed,
    pending: steps.length - completed,
    allDone: completed === steps.length,
    dismissed: Boolean(client?.onboardingDismissedAt),
    services,
  }
}

export interface IntroTutorial {
  id: string
  title: string
  description: string | null
  youtubeUrl: string
}

/**
 * Devuelve el video de bienvenida: el primer tutorial publicado cuya categoría
 * sea de "Primeros pasos". Se gestiona desde el admin de tutoriales.
 */
export async function getOnboardingIntro(
  db: PrismaDb = prisma
): Promise<IntroTutorial | null> {
  const t = await db.tutorial.findFirst({
    where: {
      isPublished: true,
      category: { name: { contains: 'Primeros pasos' } },
    },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, description: true, youtubeUrl: true },
  })
  return t ?? null
}
