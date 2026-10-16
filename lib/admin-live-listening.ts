// =====================================================
// Admin — oyentes en vivo agregados de todos los servidores
// =====================================================
// Lee /api/admin/streaming-status de cada servidor sano y suma los
// oyentes de radio por cliente. Reemplaza el campo muerto
// radio_streams.listenerCount en las vistas de admin.

import { prisma } from '@/lib/prisma'
import { getServerTarget } from '@/lib/streaming-servers'

export async function getLiveListenersByClient(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const servers = await prisma.streamingServer.findMany({
    where: { isActive: true, isHealthy: true },
    select: { id: true },
  })

  await Promise.all(
    servers.map(async (s) => {
      const target = await getServerTarget(s.id)
      if (!target) return
      try {
        const res = await fetch(`${target.baseUrl}/api/admin/streaming-status`, {
          headers: { Authorization: `Bearer ${target.token}` },
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) return
        const data = await res.json()
        for (const r of data.radio || []) {
          map.set(r.clientId, (map.get(r.clientId) ?? 0) + (r.listeners ?? 0))
        }
      } catch {
        // servidor sin respuesta: se ignora
      }
    })
  )

  return map
}
