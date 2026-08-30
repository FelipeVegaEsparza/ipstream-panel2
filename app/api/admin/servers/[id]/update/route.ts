// =====================================================
// /api/admin/servers/[id]/update — actualiza un nodo provisionado
// =====================================================
// Re-descarga el código del repo, lo copia al nodo y levanta el stack
// con --build. Se usa para llevar un nodo ya provisionado a la versión
// actual del panel (p.ej. cuando cambian los agentes/scripts).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startNodeUpdate, isProvisioning } from '@/lib/node-provisioner'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
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
    if (isProvisioning(server.id)) {
      return NextResponse.json({ error: 'already_running', message: 'Ya hay un job de provisioning/actualización en curso' }, { status: 409 })
    }

    await startNodeUpdate(server.id)
    return NextResponse.json({ ok: true, status: 'updating' })
  } catch (err) {
    console.error('[admin/servers/update POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
