import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gcBarMessageSchema } from '@/lib/validations'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { z } from 'zod'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const message = await prisma.gcBarMessage.findFirst({
      where: { id: params.id, clientId: effectiveClient.clientId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error fetching gc bar message:', error)
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

    const existing = await prisma.gcBarMessage.findFirst({
      where: { id: params.id, clientId: effectiveClient.clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    const message = await prisma.gcBarMessage.update({
      where: { id: params.id },
      data: {
        text: data.text.trim(),
        ...(data.order !== undefined ? { order: data.order } : {}),
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error updating gc bar message:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
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

    const existing = await prisma.gcBarMessage.findFirst({
      where: { id: params.id, clientId: effectiveClient.clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    await prisma.gcBarMessage.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting gc bar message:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
