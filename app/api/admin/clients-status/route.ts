import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamingClient } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const [clients, live] = await Promise.all([
      prisma.client.findMany({
        select: {
          id: true,
          name: true,
          user: { select: { email: true } },
          radioStream: { select: { id: true, status: true, icecastMount: true } },
          videoStream: { select: { id: true, status: true } },
        },
        orderBy: { name: 'asc' },
      }),
      streamingClient.getStreamingStatus().catch(() => null),
    ])

    const listenersByClient = new Map<string, number>()
    const viewersByClient = new Map<string, number>()
    if (live) {
      for (const r of live.radio || []) listenersByClient.set(r.clientId, r.listeners ?? 0)
      for (const v of live.video || []) viewersByClient.set(v.clientId, v.viewers ?? 0)
    }

    const rows = clients.map((c) => ({
      clientId: c.id,
      clientName: c.name,
      email: c.user.email,
      hasRadio: !!c.radioStream,
      radioStatus: c.radioStream?.status ?? null,
      hasVideo: !!c.videoStream,
      videoStatus: c.videoStream?.status ?? null,
      listeners: listenersByClient.get(c.id) ?? 0,
      viewers: viewersByClient.get(c.id) ?? 0,
    }))

    return NextResponse.json({ clients: rows })
  } catch (err) {
    console.error('[admin/clients-status GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
