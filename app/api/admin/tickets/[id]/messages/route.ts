import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supportTicketMessageSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = supportTicketMessageSchema.parse(body)

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'No se puede responder un ticket cerrado' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'admin',
          authorName: session.user.name || 'Soporte',
          authorId: session.user.id,
          body: data.body,
        },
      })

      if (data.attachmentIds.length > 0) {
        await tx.supportTicketAttachment.updateMany({
          where: {
            id: { in: data.attachmentIds },
            ticketId: ticket.id,
            messageId: null,
          },
          data: { messageId: message.id },
        })
      }

      // Si el ticket está abierto, pasa a in_progress
      const newStatus = ticket.status === 'open' ? 'in_progress' : ticket.status
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      })

      return message
    })

    return NextResponse.json({ ok: true, message: result }, { status: 201 })
  } catch (error) {
    console.error('Error al crear mensaje:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
