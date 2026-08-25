// =====================================================
// /api/admin/servers/[id] — PATCH/DELETE servidor
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { streamingServerUpdateSchema } from '@/lib/validations'
import { invalidateServerCache } from '@/lib/streaming-servers'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = streamingServerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const data = parsed.data
    const cleaned: any = {}
    if (data.name !== undefined) cleaned.name = data.name
    if (data.type !== undefined) cleaned.type = data.type
    if (data.baseUrl !== undefined) cleaned.baseUrl = data.baseUrl.replace(/\/+$/, '')
    if (data.publicHostname !== undefined) cleaned.publicHostname = data.publicHostname
    if (data.isActive !== undefined) cleaned.isActive = data.isActive
    if (data.token !== undefined) cleaned.tokenEnc = encrypt(data.token)

    // Revocar acceso SSH: borra credenciales y estado de provisioning
    if (data.revokeSsh === true) {
      cleaned.sshHost = null
      cleaned.sshKeyEnc = null
      cleaned.sshPasswordEnc = null
      cleaned.provisionStatus = 'none'
      cleaned.provisionStep = null
      cleaned.provisionError = null
      cleaned.provisionLog = null
      cleaned.provisionStartedAt = null
      cleaned.provisionedAt = null
    }

    const existing = await prisma.streamingServer.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 })
    }

    const updated = await prisma.streamingServer.update({
      where: { id: params.id },
      data: cleaned,
    })

    // Si cambió token/URL/hostname, invalidar cache de resolución
    invalidateServerCache(params.id)

    return NextResponse.json({ ok: true, server: updated })
  } catch (err) {
    console.error('[admin/servers PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const existing = await prisma.streamingServer.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { radioStreams: true, videoStreams: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 })
    }

    const affected = existing._count.radioStreams + existing._count.videoStreams
    if (affected > 0) {
      return NextResponse.json({
        error: 'server_has_clients',
        message: `Este servidor tiene ${affected} clientes asignados (${existing._count.radioStreams} radio, ${existing._count.videoStreams} TV). Migralos antes de darlo de baja.`,
        affected,
      }, { status: 409 })
    }

    await prisma.streamingServer.delete({ where: { id: params.id } })
    invalidateServerCache(params.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/servers DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
