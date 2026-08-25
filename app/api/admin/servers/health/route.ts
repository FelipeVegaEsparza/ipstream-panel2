// =====================================================
// /api/admin/servers/health — health check de todos los servidores
// =====================================================
// Ejecuta el check en vivo y devuelve el estado de cada servidor con la
// cantidad de clientes afectados. Es SOLO informativo: nunca migra clientes.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAllServers } from '@/lib/streaming-servers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const servers = await checkAllServers()
    const down = servers.filter((s) => s.server.isActive && !s.online)
    return NextResponse.json({
      servers,
      downCount: down.length,
      down,
    })
  } catch (err) {
    console.error('[admin/servers/health GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
