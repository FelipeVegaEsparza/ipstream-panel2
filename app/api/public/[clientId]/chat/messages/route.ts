import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { chatMessageSchema } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import {
  CHAT_DEFAULT_PAGE_SIZE,
  CHAT_MAX_PAGE_SIZE,
  CHAT_MESSAGE_RETENTION_HOURS,
  getClientIp,
  isBanned,
  normalizeEmail,
  sanitizeChatBody,
  sanitizeChatName,
  serializeMessage,
} from '@/lib/chat-helpers'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params
    const url = new URL(request.url)
    const sinceParam = url.searchParams.get('since')
    const limitParam = parseInt(url.searchParams.get('limit') || `${CHAT_DEFAULT_PAGE_SIZE}`, 10)

    const limit = Math.min(
      Math.max(1, isNaN(limitParam) ? CHAT_DEFAULT_PAGE_SIZE : limitParam),
      CHAT_MAX_PAGE_SIZE
    )

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const where: { clientId: string; createdAt?: { gt: Date } } = { clientId }
    if (sinceParam) {
      const sinceDate = new Date(sinceParam)
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate }
      }
    }

    const messages = await prisma.chatMessage.findMany({
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
      orderBy: { createdAt: 'asc' },
      take: limit,
    })

    return createCorsResponse({
      messages: messages.map(msg => serializeMessage(msg)),
      serverTime: new Date().toISOString(),
      retentionHours: CHAT_MESSAGE_RETENTION_HOURS,
    })
  } catch (error) {
    console.error('Error getting chat messages:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const body = await request.json().catch(() => null)
    const parsed = chatMessageSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Datos inválidos'
      return createCorsErrorResponse(firstError, 400)
    }

    const name = sanitizeChatName(parsed.data.name)
    const email = normalizeEmail(parsed.data.email)
    const messageBody = sanitizeChatBody(parsed.data.body)
    const ipAddress = getClientIp(request)

    if (!name || !email || !messageBody) {
      return createCorsErrorResponse('Datos inválidos', 400)
    }

    // Rate limit por IP+email: 5 mensajes por minuto
    const rlIdentifier = `chat:${clientId}:${ipAddress || 'noip'}:${email}`
    const rl = rateLimit({ maxRequests: 5, windowMs: 60_000, identifier: rlIdentifier })
    if (!rl.allowed) {
      return createCorsErrorResponse('Demasiados mensajes. Esperá un momento.', 429)
    }

    // Verificar ban
    const banned = await isBanned(clientId, { email, ipAddress })
    if (banned) {
      return createCorsErrorResponse('No podés escribir en este chat', 403)
    }

    const created = await prisma.chatMessage.create({
      data: {
        clientId,
        authorType: 'listener',
        name,
        email,
        body: messageBody,
        ipAddress,
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

    return createCorsResponse(serializeMessage(created), 201)
  } catch (error) {
    console.error('Error creating chat message:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
