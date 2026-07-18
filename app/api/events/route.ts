import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'events')
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
    const data = eventSchema.parse(body)

    const event = await prisma.event.create({
      data: {
        ...data,
        clientId: effectiveClient.clientId,
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating event:', error)
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
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'events')
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

    const events = await prisma.event.findMany({
      where: { clientId: effectiveClient.clientId },
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
