import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rankingVideoSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'videos')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user.clientId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = rankingVideoSchema.parse(body)

    // Obtener el siguiente número de orden
    const lastVideo = await prisma.rankingVideo.findFirst({
      where: { clientId: session.user.clientId },
      orderBy: { order: 'desc' }
    })

    const nextOrder = lastVideo ? lastVideo.order + 1 : 1

    const video = await prisma.rankingVideo.create({
      data: {
        ...data,
        order: nextOrder,
        clientId: session.user.clientId,
      } as Prisma.RankingVideoUncheckedCreateInput
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error creating video:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
