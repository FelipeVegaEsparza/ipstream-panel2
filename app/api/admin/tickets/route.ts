import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') where.status = status
    if (priority && priority !== 'all') where.priority = priority
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    const [tickets, stats] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          client: { select: { id: true, name: true, user: { select: { email: true } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, authorType: true, createdAt: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.groupBy({
        by: ['status', 'priority'],
        _count: { _all: true },
      }),
    ])

    const summary = {
      open: 0,
      in_progress: 0,
      closed: 0,
      urgent: 0,
    }
    for (const row of stats) {
      if (row.status === 'open') summary.open += row._count._all
      if (row.status === 'in_progress') summary.in_progress += row._count._all
      if (row.status === 'closed') summary.closed += row._count._all
      if (row.priority === 'urgent' && row.status !== 'closed') summary.urgent += row._count._all
    }

    return NextResponse.json({ tickets, summary })
  } catch (error) {
    console.error('Error al listar tickets:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
