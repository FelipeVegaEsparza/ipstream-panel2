import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pollSchema } from '@/lib/validations'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const existingPoll = await prisma.poll.findFirst({
      where: { id: params.id, clientId: session.user.clientId },
    })

    if (!existingPoll) {
      return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const data = pollSchema.parse(body)

    const poll = await prisma.poll.update({
      where: { id: params.id },
      data: {
        ...data,
        options: { create: [] },
      },
      include: { options: true },
    })

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error updating poll:', error)
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.poll.delete({
      where: { id: params.id, clientId: session.user.clientId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting poll:', error)
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const poll = await prisma.poll.findFirst({
      where: { id: params.id, clientId: session.user.clientId },
      include: { options: true },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })
    }

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const poll = await prisma.poll.update({
      where: { id: params.id, clientId: session.user.clientId },
      data: { active: body.active },
      include: { options: true },
    })

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error toggling poll:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
