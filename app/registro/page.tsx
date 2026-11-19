import { permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { planSlug } from '@/lib/plans'

export const dynamic = 'force-dynamic'

/**
 * Compatibilidad: `/registro` fue la entrada general histórica. Ahora el único
 * formulario de alta vive en `/planes/<slug>`; esta ruta redirige 308
 * conservando el referido (`ref`) y, si se pidió un plan, su slug.
 */
export default async function RegistroRedirect({
  searchParams,
}: {
  searchParams: { plan?: string; ref?: string }
}) {
  const ref = (searchParams.ref || '').trim()
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const requested = (searchParams.plan || '').trim()

  if (requested) {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    const normalized = requested.toLowerCase()
    const match = plans.find(
      (plan) =>
        plan.id === requested ||
        planSlug(plan.name) === normalized ||
        plan.name.toLowerCase() === normalized
    )
    if (match) {
      permanentRedirect(`/planes/${planSlug(match.name)}${refQuery}`)
    }
  }

  permanentRedirect(`/planes${refQuery}`)
}
