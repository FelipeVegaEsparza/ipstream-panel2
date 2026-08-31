// =====================================================
// /api/admin/emails/logs — historial de envíos con filtros
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || undefined
  const templateKey = searchParams.get('templateKey') || undefined
  const status = searchParams.get('status') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))

  const where: any = {}
  if (clientId) where.clientId = clientId
  if (templateKey) where.templateKey = templateKey
  if (status && status !== 'all') where.status = status
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [logs, total, stats] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.emailLog.count({ where }),
    prisma.emailLog.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  return NextResponse.json({ logs, total, page, limit, stats })
}
