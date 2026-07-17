import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supportTicketUpdateSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            user: { select: { email: true, name: true } },
            plan: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: { orderBy: { createdAt: 'asc' } },
          },
        },
        attachments: {
          where: { messageId: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error al obtener ticket:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = supportTicketUpdateSchema.parse(body)

    const existing = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (data.status) {
      updateData.status = data.status
      if (data.status === 'closed' && !existing.closedAt) {
        updateData.closedAt = new Date()
      }
      if (data.status !== 'closed' && existing.closedAt) {
        // Reabrir (no debería pasar porque decidimos no permitir, pero por seguridad)
        updateData.closedAt = null
      }
    }
    if (data.priority) {
      updateData.priority = data.priority
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ message: 'Ticket actualizado', ticket })
  } catch (error) {
    console.error('Error al actualizar ticket:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
