// =====================================================
// /api/admin/servers — CRUD de servidores de streaming
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { streamingServerCreateSchema } from '@/lib/validations'
import { invalidateServerCache, checkServerById } from '@/lib/streaming-servers'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const servers = await prisma.streamingServer.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        baseUrl: true,
        publicHostname: true,
        isActive: true,
        isHealthy: true,
        lastHealthAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { radioStreams: true, videoStreams: true },
        },
      },
    })

    return NextResponse.json({ servers })
  } catch (err) {
    console.error('[admin/servers GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = streamingServerCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const data = parsed.data
    const server = await prisma.streamingServer.create({
      data: {
        name: data.name,
        type: data.type,
        baseUrl: data.baseUrl.replace(/\/+$/, ''),
        tokenEnc: encrypt(data.token),
        publicHostname: data.publicHostname,
      },
    })

    // Health check inicial
    await checkServerById(server.id)

    return NextResponse.json({ ok: true, server }, { status: 201 })
  } catch (err) {
    console.error('[admin/servers POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
