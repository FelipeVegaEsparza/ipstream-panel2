import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { chatStaffMessageSchema } from '@/lib/validations'
import {
  CHAT_DEFAULT_PAGE_SIZE,
  CHAT_MAX_PAGE_SIZE,
  CHAT_STAFF_NAME_FALLBACK,
  sanitizeChatBody,
  serializeMessage,
} from '@/lib/chat-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(
      CHAT_MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get('limit') || `${CHAT_DEFAULT_PAGE_SIZE}`, 10))
    )
    const q = (url.searchParams.get('q') || '').trim()

    const where: {
      clientId: string
      OR?: Array<{ name?: { contains: string }; body?: { contains: string }; email?: { contains: string } }>
    } = { clientId: effective.clientId }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { body: { contains: q } },
        { email: { contains: q } },
      ]
    }

    const [total, messages] = await Promise.all([
      prisma.chatMessage.count({ where }),
      prisma.chatMessage.findMany({
        where,
        select: {
          id: true,
          authorType: true,
          name: true,
          body: true,
          email: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      messages: messages.map(serializeMessage),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error('Error listing chat messages:', error)
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
    const parsed = chatStaffMessageSchema.safeParse(json)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Datos inválidos'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const basicData = await prisma.basicData.findUnique({
      where: { clientId: effective.clientId },
      select: { projectName: true },
    })
    const staffName = basicData?.projectName?.trim() || CHAT_STAFF_NAME_FALLBACK
    const body = sanitizeChatBody(parsed.data.body)
    if (!body) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
    }

    const created = await prisma.chatMessage.create({
      data: {
        clientId: effective.clientId,
        authorType: 'staff',
        name: staffName,
        email: null,
        body,
        ipAddress: null,
      },
      select: {
        id: true,
        authorType: true,
        name: true,
        body: true,
        email: true,
        ipAddress: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ message: serializeMessage(created) }, { status: 201 })
  } catch (error) {
    console.error('Error creating staff chat message:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
