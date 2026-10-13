import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { promotionSchema } from '@/lib/validations'
import { z } from 'zod'
import { invalidatePublicCache } from '@/lib/public-cache'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = promotionSchema.parse(body)

    const updated = await prisma.promotion.update({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      },
      data: data as Prisma.PromotionUpdateInput,
    })

    invalidatePublicCache()
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating promotion:', error)
    if (error instanceof z.ZodError) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    invalidatePublicCache()
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await prisma.promotion.delete({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      }
    })

    invalidatePublicCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    invalidatePublicCache()
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const promotion = await prisma.promotion.findFirst({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      }
    })

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(promotion)
  } catch (error) {
    console.error('Error fetching promotion:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
