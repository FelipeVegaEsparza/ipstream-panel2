// =====================================================
// Onboarding — "Primeros pasos" (progreso derivado)
// =====================================================
// El progreso se calcula del estado real del cliente (no casillas manuales).
// Qué tareas ve cada cliente depende de: los servicios del plan (radio/tv) y
// la lista de tareas elegidas para el plan (`Plan.onboardingSteps`).

import { prisma, type PrismaDb } from '@/lib/prisma'
import { ONBOARDING_STEP_DEFS, parseOnboardingSteps } from '@/lib/onboarding-steps'

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
  const [client, basic, programs, news, tracks, videotracks, gcbar, radio, video] = await Promise.all([
    db.client.findUnique({
      where: { id: clientId },
      select: {
        plan: { select: { services: true, onboardingSteps: true } },
        onboardingDismissedAt: true,
      },
    }),
    db.basicData.findUnique({ where: { clientId }, select: { logoUrl: true, websiteUrl: true } }),
    db.program.count({ where: { clientId } }),
    db.news.count({ where: { clientId } }),
    db.track.count({ where: { clientId } }),
    db.videoTrack.count({ where: { clientId } }),
    db.gcBarMessage.count({ where: { clientId } }),
    db.radioStream.findUnique({ where: { clientId }, select: { status: true } }),
    db.videoStream.findUnique({ where: { clientId }, select: { status: true } }),
  ])

  const services: ClientServices =
    client?.plan?.services === 'radio' || client?.plan?.services === 'tv'
      ? client.plan.services
      : 'both'
  const hasRadio = services === 'radio' || services === 'both'
  const hasTv = services === 'tv' || services === 'both'

  // Tareas elegidas para el plan; null = todas las que apliquen a los servicios.
  const selected = parseOnboardingSteps(client?.plan?.onboardingSteps ?? null)

  const doneByKey: Record<string, boolean> = {
    brand: Boolean(basic?.logoUrl),
    programs: programs > 0,
    'radio-library': tracks > 0,
    'radio-autodj': radio?.status === 'autodj' || radio?.status === 'live',
    'tv-library': videotracks > 0,
    'tv-autodj': video?.status === 'autodj' || video?.status === 'live',
    news: news > 0,
    site: Boolean(basic?.websiteUrl),
    'gc-bar': gcbar > 0,
  }

  const steps: OnboardingStep[] = ONBOARDING_STEP_DEFS.filter((d) => {
    if (d.service === 'radio' && !hasRadio) return false
    if (d.service === 'tv' && !hasTv) return false
    if (selected && !selected.includes(d.key)) return false
    return true
  }).map((d) => ({
    key: d.key,
    title: d.title,
    description: d.description,
    href: d.href,
    actionLabel: d.actionLabel,
    done: doneByKey[d.key] ?? false,
  }))

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
