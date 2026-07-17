import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ tickets: [] })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ tickets: [] })
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { clientId: effective.clientId },
      select: {
        id: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { authorType: true },
        },
      },
    })

    const summary = tickets.map((t) => ({
      id: t.id,
      updatedAt: t.updatedAt.toISOString(),
      lastMessageAuthorType: t.messages[0]?.authorType ?? null,
    }))

    return NextResponse.json({ tickets: summary })
  } catch (error) {
    console.error('Error al obtener resumen de tickets:', error)
    return NextResponse.json({ tickets: [] })
  }
}
