import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCachedCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { getPanelOrigin } from '@/lib/streaming-helpers'
import { toPublicPlanApi } from '@/lib/public-plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/public/plans
 *
 * Fuente pública de planes para el sitio de CasterFly. Solo expone planes
 * activos con precio en USD (PlanPrice) y el contrato en el panel.
 */
export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: { prices: true },
    })

    const origin = getPanelOrigin() || request.nextUrl.origin
    const data = plans
      .map((plan) => toPublicPlanApi(plan, origin))
      .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan))
      .sort((a, b) => a.usdAmount - b.usdAmount)

    return createCachedCorsResponse({ plans: data })
  } catch (error) {
    console.error('Error listing public plans:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
