import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { prisma } from '@/lib/prisma'
import { getOnboarding } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const effective = await getEffectiveClientFromRequest(request)
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const progress = await getOnboarding(effective.clientId)
  return NextResponse.json(progress)
}

export async function PATCH(request: NextRequest) {
  const effective = await getEffectiveClientFromRequest(request)
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (typeof body?.dismissed === 'boolean') {
    await prisma.client.update({
      where: { id: effective.clientId },
      data: { onboardingDismissedAt: body.dismissed ? new Date() : null },
    })
  }
  return NextResponse.json({ ok: true })
}
