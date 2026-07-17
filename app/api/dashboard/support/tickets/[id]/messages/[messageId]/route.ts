import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
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

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: params.id, clientId: effective.clientId },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const message = await prisma.supportTicketMessage.findFirst({
      where: { id: params.messageId, ticketId: params.id },
    })
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { attachmentIds } = body

    if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
      return NextResponse.json({ ok: true })
    }

    await prisma.supportTicketAttachment.updateMany({
      where: {
        id: { in: attachmentIds },
        ticketId: params.id,
        messageId: null,
      },
      data: { messageId: params.messageId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al vincular adjuntos:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
