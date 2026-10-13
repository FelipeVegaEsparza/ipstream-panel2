import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { contactMessageStatusSchema } from '@/lib/validations'
import { contactMessagePublicSelect, serializeContactMessage } from '@/lib/contact-message-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = contactMessageStatusSchema.safeParse(json?.status)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const existing = await prisma.contactMessage.findFirst({
      where: { id: params.id, clientId: effective.clientId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    const updated = await prisma.contactMessage.update({
      where: { id: params.id },
      data: { status: parsed.data },
      select: contactMessagePublicSelect,
    })

    return NextResponse.json({ message: serializeContactMessage(updated) })
  } catch (error) {
    console.error('Error updating contact message:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const existing = await prisma.contactMessage.findFirst({
      where: { id: params.id, clientId: effective.clientId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    await prisma.contactMessage.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting contact message:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
