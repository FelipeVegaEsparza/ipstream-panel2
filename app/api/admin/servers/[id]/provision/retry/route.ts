// =====================================================
// /api/admin/servers/[id]/provision/retry — reintenta el provisioning
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startNodeProvisioning } from '@/lib/node-provisioner'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const server = await prisma.streamingServer.findUnique({ where: { id: params.id } })
    if (!server) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 })
    }
    if (!server.sshHost) {
      return NextResponse.json({ error: 'no_ssh_access', message: 'Este servidor no tiene acceso SSH configurado' }, { status: 400 })
    }

    await startNodeProvisioning(server.id)
    return NextResponse.json({ ok: true, status: 'provisioning' })
  } catch (err) {
    console.error('[admin/servers/provision/retry POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
