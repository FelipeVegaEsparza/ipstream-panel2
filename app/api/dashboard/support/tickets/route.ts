import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { supportTicketSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { clientId: effective.clientId },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, authorType: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error al listar tickets:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const data = supportTicketSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          clientId: effective.clientId,
          subject: data.subject,
          priority: data.priority,
          status: 'open',
        },
      })

      const msg = await tx.supportTicketMessage.create({
        data: {
          ticketId: t.id,
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
            ticketId: t.id,
            messageId: null,
          },
          data: { messageId: msg.id },
        })
      }

      return { ticket: t, firstMessageId: msg.id }
    })

    return NextResponse.json({ ticket: result.ticket, firstMessageId: result.firstMessageId }, { status: 201 })
  } catch (error) {
    console.error('Error al crear ticket:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
