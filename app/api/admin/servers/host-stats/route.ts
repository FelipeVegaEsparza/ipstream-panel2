// =====================================================
// /api/admin/servers/host-stats — stats de host de TODOS los servidores
// =====================================================
// Consulta /api/admin/host-stats de cada agente de streaming (CPU, RAM,
// disco, uptime, contenedores) para mostrarlos en el monitor por servidor.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerTarget } from '@/lib/streaming-servers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const servers = await prisma.streamingServer.findMany({ orderBy: { createdAt: 'asc' } })
  const results: { serverId: string; name: string; type: string; online: boolean; stats: any }[] = []

  for (const s of servers) {
    const target = s.isActive ? await getServerTarget(s.id) : null
    let stats: any = null
    if (target) {
      try {
        const res = await fetch(`${target.baseUrl}/api/admin/host-stats`, {
          headers: { Authorization: `Bearer ${target.token}` },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) stats = await res.json()
      } catch {
        stats = null
      }
    }
    results.push({ serverId: s.id, name: s.name, type: s.type, online: !!stats, stats })
  }

  return NextResponse.json({ servers: results })
}
