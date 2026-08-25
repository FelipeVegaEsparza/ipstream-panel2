// =====================================================
// /api/admin/clients/[clientId]/migrate — migración manual
// =====================================================
// GET: opciones de migración del cliente (servicios, servidores disponibles)
// POST: ejecuta la migración (SIEMPRE iniciada por el admin)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { runClientMigration, MigrationError } from '@/lib/migration'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

const migrateSchema = z.object({
  services: z.array(z.enum(['radio', 'video'])).min(1),
  targetServerId: z.string().min(1),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const [radio, video, servers, client] = await Promise.all([
      prisma.radioStream.findUnique({ where: { clientId: params.id }, select: { serverId: true, id: true } }),
      prisma.videoStream.findUnique({ where: { clientId: params.id }, select: { serverId: true, id: true } }),
      prisma.streamingServer.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, type: true, publicHostname: true },
      }),
      prisma.client.findUnique({ where: { id: params.id }, select: { id: true, name: true } }),
    ])

    if (!client) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 })
    }

    const canMigrate = Boolean(radio || video)

    return NextResponse.json({
      client: { id: client.id, name: client.name },
      radioServerId: radio?.serverId ?? null,
      videoServerId: video?.serverId ?? null,
      hasRadio: Boolean(radio),
      hasVideo: Boolean(video),
      servers,
      canMigrate,
    })
  } catch (err) {
    console.error('[admin/migrate GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = migrateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })
    }

    const { services, targetServerId } = parsed.data
    const result = await runClientMigration(params.id, services, targetServerId, session.user.id)

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof MigrationError) {
      return NextResponse.json({ error: 'migration_failed', message: err.message }, { status: err.status })
    }
    console.error('[admin/migrate POST]', err)
    return NextResponse.json({ error: 'internal_error', message: (err as Error).message }, { status: 500 })
  }
}
