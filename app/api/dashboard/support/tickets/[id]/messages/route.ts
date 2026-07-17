import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { supportTicketMessageSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const body = await request.json()
    const data = supportTicketMessageSchema.parse(body)

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: params.id, clientId: effective.clientId },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Este ticket está cerrado. Si necesitás ayuda con un tema relacionado, abrí uno nuevo.' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'client',
          authorName: session.user.name || effective.impersonationData?.clientName || 'Cliente',
          authorId: effective.clientId,
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

      // Si el ticket estaba en in_progress, no lo tocamos. Si está en open, se mantiene.
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
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
