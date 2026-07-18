import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gallerySchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'galleries')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const effectiveClient = await getEffectiveClientFromRequest(request)
    if (!effectiveClient) {
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = gallerySchema.parse(body)

    const gallery = await prisma.gallery.create({
      data: {
        ...data,
        clientId: effectiveClient.clientId,
        images: undefined,
      }
    })

    return NextResponse.json(gallery)
  } catch (error) {
    console.error('Error creating gallery:', error)
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
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'galleries')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const effectiveClient = await getEffectiveClientFromRequest(request)

    if (!effectiveClient) {
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    const galleries = await prisma.gallery.findMany({
      where: { clientId: effectiveClient.clientId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(galleries)
  } catch (error) {
    console.error('Error fetching galleries:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
