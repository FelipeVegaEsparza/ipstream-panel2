import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { chatBanSchema } from '@/lib/validations'
import { normalizeEmail } from '@/lib/chat-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const bans = await prisma.chatBan.findMany({
      where: { clientId: effective.clientId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ bans })
  } catch (error) {
    console.error('Error listing chat bans:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = chatBanSchema.safeParse(json)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Datos inválidos'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const email = parsed.data.email ? normalizeEmail(parsed.data.email) : null
    const ipAddress = parsed.data.ipAddress?.trim() || null
    const reason = parsed.data.reason?.trim() || null

    if (!email && !ipAddress) {
      return NextResponse.json({ error: 'Email o IP requerido' }, { status: 400 })
    }

    // Evitar duplicados: si ya existe el mismo ban, no crear
    const orConditions: Array<{ email?: string; ipAddress?: string }> = []
    if (email) orConditions.push({ email })
    if (ipAddress) orConditions.push({ ipAddress })

    const existing = await prisma.chatBan.findFirst({
      where: {
        clientId: effective.clientId,
        OR: orConditions.length > 0 ? orConditions : undefined,
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un ban para este identificador' }, { status: 409 })
    }

    const ban = await prisma.chatBan.create({
      data: {
        clientId: effective.clientId,
        email,
        ipAddress,
        reason,
      },
    })

    return NextResponse.json({ ban }, { status: 201 })
  } catch (error) {
    console.error('Error creating chat ban:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
