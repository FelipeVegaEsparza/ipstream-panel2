import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rankingVideoSchema } from '@/lib/validations'
import { z } from 'zod'

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = rankingVideoSchema.parse(body)

    const updated = await prisma.rankingVideo.update({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      },
      data: data as Prisma.RankingVideoUpdateInput,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating video:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
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

    // Obtener el video a eliminar
    const videoToDelete = await prisma.rankingVideo.findFirst({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      }
    })

    if (!videoToDelete) {
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el video
    await prisma.rankingVideo.delete({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      }
    })

    // Reordenar los videos restantes para cerrar el hueco
    await prisma.rankingVideo.updateMany({
      where: {
        clientId: session.user.clientId,
        order: {
          gt: videoToDelete.order
        }
      },
      data: {
        order: {
          decrement: 1
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
