// =====================================================
// /api/admin/emails/clients — clientes con correo (para el compositor)
// =====================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
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
