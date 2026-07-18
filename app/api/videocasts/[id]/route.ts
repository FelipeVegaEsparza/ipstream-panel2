import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { videocastSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'

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
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'videocasts')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    console.log('🎥 Updating videocast:', params.id)
    
    const effectiveClient = await getEffectiveClientFromRequest(request)
    
    if (!effectiveClient) {
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    const existingVideocast = await prisma.podcast.findFirst({
      where: {
        id: params.id,
        clientId: effectiveClient.clientId,
        fileType: 'video'
      }
    })

    if (!existingVideocast) {
      return NextResponse.json(
        { error: 'Episodio no encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = videocastSchema.parse(body)

    const videocast = await prisma.podcast.update({
      where: { id: params.id },
      data: {
        ...data,
        fileType: 'video',
      }
    })

    console.log('🎥 Videocast updated successfully:', videocast.id)
    return NextResponse.json(videocast)
  } catch (error) {
    console.error('🎥 Error updating videocast:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
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
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'videocasts')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    console.log('🎥 Deleting videocast - Start')
    
    const effectiveClient = await getEffectiveClientFromRequest(request)
    
    if (!effectiveClient) {
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    // Verificar que el videocast existe y pertenece al cliente
    const existingVideocast = await prisma.podcast.findFirst({
      where: {
        id: params.id,
        clientId: effectiveClient.clientId,
        fileType: 'video'
      }
    })

    if (!existingVideocast) {
      return NextResponse.json(
        { error: 'Episodio no encontrado' },
        { status: 404 }
      )
    }

    await prisma.podcast.delete({
      where: { id: params.id }
    })

    console.log('🎥 Videocast deleted successfully:', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🎥 Error deleting videocast:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}