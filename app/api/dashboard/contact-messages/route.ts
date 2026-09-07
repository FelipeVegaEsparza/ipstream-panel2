import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import {
  CONTACT_DEFAULT_PAGE_SIZE,
  CONTACT_MAX_PAGE_SIZE,
  CONTACT_STATUSES,
  contactMessagePublicSelect,
  serializeContactMessage,
} from '@/lib/contact-message-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      CONTACT_MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get('limit') || `${CONTACT_DEFAULT_PAGE_SIZE}`, 10) || 1)
    )
    const statusParam = (url.searchParams.get('status') || '').trim()

    const where: { clientId: string; status?: string } = { clientId: effective.clientId }
    if (statusParam) {
      if (!(CONTACT_STATUSES as readonly string[]).includes(statusParam)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
      }
      where.status = statusParam
    }

    const [total, messages] = await Promise.all([
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.findMany({
        where,
        select: contactMessagePublicSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      messages: messages.map((m) => serializeContactMessage(m)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error('Error listing contact messages:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
