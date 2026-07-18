import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { videocastSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'

export async function POST(request: NextRequest) {
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
    console.log('🎥 Creating videocast - Start')
    
    const effectiveClient = await getEffectiveClientFromRequest(request)
    
    if (!effectiveClient) {
      console.log('🎥 No effective client found')
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = videocastSchema.parse(body)

    const videocast = await prisma.podcast.create({
      data: {
        ...data,
        clientId: effectiveClient.clientId,
        fileType: 'video',
      }
    })

    console.log('🎥 Videocast created successfully:', videocast.id)
    return NextResponse.json(videocast)
  } catch (error) {
    console.error('🎥 Error creating videocast:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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
    console.log('🎥 Getting videocasts - Start')
    
    // Usar la función helper para obtener el cliente efectivo
    const effectiveClient = await getEffectiveClientFromRequest(request)
    
    if (!effectiveClient) {
      console.log('🎥 No effective client found')
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    console.log('🎥 Effective client:', effectiveClient)

    const videocasts = await prisma.podcast.findMany({
      where: {
        clientId: effectiveClient.clientId,
        fileType: 'video' // Solo videos
      },
      orderBy: [
        { episodeNumber: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    console.log('🎥 Found', videocasts.length, 'videocasts')
    return NextResponse.json(videocasts)
  } catch (error) {
    console.error('🎥 Error getting videocasts:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}