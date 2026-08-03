import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { pollSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'polls')
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
    const data = pollSchema.parse(body)

    const poll = await prisma.poll.create({
      data: {
        ...data,
        clientId: effectiveClient.clientId,
        options: { create: data.options.map(text => ({ text })) },
      } as Prisma.PollUncheckedCreateInput
    })

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error creating poll:', error)
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
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'polls')
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

    const polls = await prisma.poll.findMany({
      where: { clientId: effectiveClient.clientId },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(polls)
  } catch (error) {
    console.error('Error fetching polls:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
