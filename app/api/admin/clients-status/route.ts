import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerTarget } from '@/lib/streaming-servers'

export const dynamic = 'force-dynamic'

// Estado de streaming agregado de TODOS los servidores de streaming.
// Si un servidor no responde, sus clientes se marcan con el servidor "sin respuesta".
async function fetchServerStreamingStatus(serverId: string) {
  const target = await getServerTarget(serverId)
  if (!target) return { radio: [], video: [] }
  try {
    const res = await fetch(`${target.baseUrl}/api/admin/streaming-status`, {
      headers: { Authorization: `Bearer ${target.token}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { radio: [], video: [] }
    return await res.json()
  } catch {
    return { radio: [], video: [] }
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const [clients, servers] = await Promise.all([
      prisma.client.findMany({
        select: {
          id: true,
          name: true,
          user: { select: { email: true } },
          radioStream: { select: { id: true, status: true, icecastMount: true, serverId: true } },
          videoStream: { select: { id: true, status: true, serverId: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.streamingServer.findMany({
        select: { id: true, name: true, type: true, isHealthy: true, isActive: true },
      }),
    ])

    const serverHealth = new Map(servers.map((s) => [s.id, s.isHealthy && s.isActive]))
    const serverNames = new Map(servers.map((s) => [s.id, s.name]))
    const healthyServers = servers.filter((s) => s.isHealthy && s.isActive).map((s) => s.id)

    // Consultar streaming-status de cada servidor sano
    const perServer = await Promise.all(
      healthyServers.map(async (id) => ({ id, data: await fetchServerStreamingStatus(id) }))
    )

    const listenersByClient = new Map<string, number>()
    const viewersByClient = new Map<string, number>()
    for (const { data } of perServer) {
      for (const r of data.radio || []) listenersByClient.set(r.clientId, (listenersByClient.get(r.clientId) ?? 0) + (r.listeners ?? 0))
      for (const v of data.video || []) viewersByClient.set(v.clientId, (viewersByClient.get(v.clientId) ?? 0) + (v.viewers ?? 0))
    }

    const rows = clients.map((c) => {
      const radioServerOnline = c.radioStream?.serverId ? (serverHealth.get(c.radioStream.serverId) ?? false) : true
      const videoServerOnline = c.videoStream?.serverId ? (serverHealth.get(c.videoStream.serverId) ?? false) : true
      return {
        clientId: c.id,
        clientName: c.name,
        email: c.user.email,
        hasRadio: !!c.radioStream,
        radioStatus: c.radioStream?.status ?? null,
        radioServerId: c.radioStream?.serverId ?? null,
        radioServerName: c.radioStream?.serverId ? (serverNames.get(c.radioStream.serverId) ?? null) : null,
        radioServerOnline,
        hasVideo: !!c.videoStream,
        videoStatus: c.videoStream?.status ?? null,
        videoServerId: c.videoStream?.serverId ?? null,
        videoServerName: c.videoStream?.serverId ? (serverNames.get(c.videoStream.serverId) ?? null) : null,
        videoServerOnline,
        listeners: listenersByClient.get(c.id) ?? 0,
        viewers: viewersByClient.get(c.id) ?? 0,
      }
    })

    return NextResponse.json({ clients: rows })
  } catch (err) {
    console.error('[admin/clients-status GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
