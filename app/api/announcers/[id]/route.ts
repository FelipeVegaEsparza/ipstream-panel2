import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { announcerSchema } from '@/lib/validations'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = announcerSchema.parse(body)

    const announcer = await prisma.announcer.update({
      where: { id: params.id, clientId: session.user.clientId },
      data,
    })

    return NextResponse.json(announcer)
  } catch (error) {
    console.error('Error updating announcer:', error)
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.announcer.delete({
      where: { id: params.id, clientId: session.user.clientId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcer:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const announcer = await prisma.announcer.findFirst({
      where: { id: params.id, clientId: session.user.clientId },
    })

    if (!announcer) {
      return NextResponse.json({ error: 'Locutor no encontrado' }, { status: 404 })
    }

    return NextResponse.json(announcer)
  } catch (error) {
    console.error('Error fetching announcer:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
