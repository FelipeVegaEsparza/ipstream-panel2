import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { announcerSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'announcers')
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

    const body = await request.json()
    const data = announcerSchema.parse(body)

    const createData: Prisma.AnnouncerUncheckedCreateInput = {
      clientId: effectiveClient.clientId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
    }

    const announcer = await prisma.announcer.create({
      data: createData
    })

    return NextResponse.json(announcer)
  } catch (error) {
    console.error('Error creating announcer:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'announcers')
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

    const announcers = await prisma.announcer.findMany({
      where: { clientId: effectiveClient.clientId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(announcers)
  } catch (error) {
    console.error('Error fetching announcers:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
