// =====================================================
// /api/admin/streaming/[clientId] — get + patch config
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorageUsage } from '@/lib/streaming-helpers'
import { streamingAdminConfigSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const [client, usage] = await Promise.all([
      prisma.client.findUnique({
        where: { id: params.clientId },
        include: {
          user: { select: { email: true, name: true } },
          radioStream: true,
          _count: { select: { tracks: true, playlists: true } },
        },
      }),
      getStorageUsage(params.clientId),
    ])

    if (!client) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 })
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.user.email,
        userName: client.user.name,
        createdAt: client.createdAt,
        trackCount: client._count.tracks,
        playlistCount: client._count.playlists,
      },
      radioStream: client.radioStream,
      usage,
    })
  } catch (err) {
    console.error('[admin/streaming GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = streamingAdminConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const data = parsed.data
    const cleanedData: any = {}
    if (data.enabled !== undefined) cleanedData.enabled = data.enabled
    if (data.bitrate !== undefined) cleanedData.bitrate = data.bitrate
    if (data.storageQuotaMB !== undefined) cleanedData.storageQuotaMB = data.storageQuotaMB
    if (data.maxListeners !== undefined) cleanedData.maxListeners = data.maxListeners
    if (data.maxTracksPerPlaylist !== undefined) cleanedData.maxTracksPerPlaylist = data.maxTracksPerPlaylist
    if (data.adminNotes !== undefined) cleanedData.adminNotes = data.adminNotes

    // Verificar que el cliente tiene RadioStream
    const existing = await prisma.radioStream.findUnique({
      where: { clientId: params.clientId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    // Si está bajando la cuota por debajo del uso actual, rechazar
    if (data.storageQuotaMB !== undefined && data.storageQuotaMB !== null) {
      const usage = await getStorageUsage(params.clientId)
      if (data.storageQuotaMB * 1024 * 1024 < usage.totalBytes) {
        return NextResponse.json({
          error: 'quota_below_usage',
          message: `No podés bajar la cuota a ${data.storageQuotaMB} MB: el cliente ya usa ${usage.totalMB} MB`,
        }, { status: 400 })
      }
    }

    const updated = await prisma.radioStream.update({
      where: { clientId: params.clientId },
      data: cleanedData,
    })

    // Audit log
    await prisma.streamingAuditLog.create({
      data: {
        clientId: params.clientId,
        action: 'config_update',
        payload: {
          event: 'admin_config_updated',
          adminId: session.user.id,
          changes: cleanedData,
        } as any,
      },
    })

    return NextResponse.json({ ok: true, radioStream: updated })
  } catch (err) {
    console.error('[admin/streaming PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
