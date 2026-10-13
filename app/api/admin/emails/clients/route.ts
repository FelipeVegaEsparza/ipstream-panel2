// =====================================================
// /api/admin/emails/clients — clientes con correo (para el compositor)
// =====================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const clients = await prisma.client.findMany({
    where: { user: { email: { not: '' } } },
    select: {
      id: true,
      name: true,
      user: { select: { email: true } },
      basicData: { select: { projectName: true } },
    },
    orderBy: { name: 'asc' },
  })

  const rows = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.user.email,
    projectName: c.basicData?.projectName || c.name,
  }))

  return NextResponse.json({ clients: rows })
}
