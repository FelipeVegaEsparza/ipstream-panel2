import { z } from 'zod'
import { getSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { promotionSchema } from '@/lib/validations'
import { invalidatePublicCache } from '@/lib/public-cache'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'promotions')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getSession()
    
    if (!session?.user.clientId) {
      invalidatePublicCache()
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = promotionSchema.parse(body)

    const promotion = await prisma.promotion.create({
      data: {
        ...data,
        clientId: session.user.clientId,
      } as Prisma.PromotionUncheckedCreateInput
    })

    invalidatePublicCache()
    return NextResponse.json(promotion)
  } catch (error) {
    console.error('Error creating promotion:', error)
    if (error instanceof z.ZodError) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    invalidatePublicCache()
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
