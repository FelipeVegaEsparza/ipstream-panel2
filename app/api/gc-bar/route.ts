import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { gcBarMessageSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'gc-bar')
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
    const data = gcBarMessageSchema.parse(body)

    const createData: Prisma.GcBarMessageUncheckedCreateInput = {
      clientId: effectiveClient.clientId,
      text: data.text.trim(),
      order: data.order ?? 0,
    }

    const message = await prisma.gcBarMessage.create({
      data: createData,
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error creating gc bar message:', error)
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
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'gc-bar')
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

    const messages = await prisma.gcBarMessage.findMany({
      where: { clientId: effectiveClient.clientId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching gc bar messages:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
