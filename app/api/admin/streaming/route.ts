// =====================================================
// /api/admin/streaming — lista de clientes con streaming
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStorageUsage } from '@/lib/streaming-helpers'
import { getLiveListenersByClient } from '@/lib/admin-live-listening'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET(_request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    // Todos los clients con su RadioStream (si lo tienen)
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        radioStream: {
          select: {
            id: true,
            icecastMount: true,
            status: true,
            bitrate: true,
            enabled: true,
            storageQuotaMB: true,
            maxListeners: true,
            maxTracksPerPlaylist: true,
            adminNotes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { tracks: true, playlists: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calcular usage para cada uno (en paralelo)
    const result = await Promise.all(
      clients.map(async (c) => {
        if (!c.radioStream) {
          return {
            clientId: c.id,
            clientName: c.name,
            email: c.user.email,
            userName: c.user.name,
            hasRadioStream: false,
            trackCount: c._count.tracks,
            playlistCount: c._count.playlists,
            createdAt: c.createdAt,
          }
        }
        const usage = await getStorageUsage(c.id)
        return {
          clientId: c.id,
          clientName: c.name,
          email: c.user.email,
          userName: c.user.name,
          hasRadioStream: true,
          // Config
          ...c.radioStream,
          // Usage
          usage: {
            totalMB: usage.totalMB,
            quotaMB: usage.quotaMB,
            percentUsed: usage.percentUsed,
            remainingMB: usage.remainingMB,
            exceeded: usage.exceeded,
            trackCount: usage.trackCount,
            playlistCount: usage.playlistCount,
          },
        }
      })
    )

    // Oyentes en vivo por cliente (estado real de Icecast, no el campo cacheado muerto).
    const liveListeners = await getLiveListenersByClient()
    for (const row of result) {
      if ((row as any).hasRadioStream) {
        ;(row as any).listenerCount = liveListeners.get((row as any).clientId) ?? 0
      }
    }

    return NextResponse.json({ count: result.length, clients: result })
  } catch (err) {
    console.error('[admin/streaming GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
