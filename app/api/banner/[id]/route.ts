import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bannerSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { invalidatePublicCache } from '@/lib/public-cache'
import { z } from 'zod'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'banner')
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
      return NextResponse.json({ error: 'No autorizado - Sin cliente asociado' }, { status: 401 })
    }

    const banner = await prisma.banner.findFirst({
      where: { id: params.id, clientId: effectiveClient.clientId },
    })

    if (!banner) {
      return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 })
    }

    return NextResponse.json(banner)
  } catch (error) {
    console.error('Error fetching banner:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'banner')
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
      invalidatePublicCache()
      return NextResponse.json({ error: 'No autorizado - Sin cliente asociado' }, { status: 401 })
    }

    const body = await request.json()
    const data = bannerSchema.parse(body)

    const existing = await prisma.banner.findFirst({
      where: { id: params.id, clientId: effectiveClient.clientId },
      select: { id: true },
    })
    if (!existing) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 })
    }

    const banner = await prisma.banner.update({
      where: { id: params.id },
      data: {
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl ?? null,
        ...(data.order !== undefined ? { order: data.order } : {}),
      },
    })

    invalidatePublicCache(effectiveClient.clientId)
    return NextResponse.json(banner)
  } catch (error) {
    console.error('Error updating banner:', error)
    if (error instanceof z.ZodError) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    invalidatePublicCache()
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'banner')
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
      invalidatePublicCache()
      return NextResponse.json({ error: 'No autorizado - Sin cliente asociado' }, { status: 401 })
    }

    const existing = await prisma.banner.findFirst({
      where: { id: params.id, clientId: effectiveClient.clientId },
      select: { id: true },
    })
    if (!existing) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 })
    }

    await prisma.banner.delete({ where: { id: params.id } })

    invalidatePublicCache(effectiveClient.clientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting banner:', error)
    invalidatePublicCache()
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
