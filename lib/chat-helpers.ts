import { prisma } from '@/lib/prisma'
import { sanitizeText } from '@/lib/text-sanitizer'

export const CHAT_MESSAGE_RETENTION_HOURS = 48
export const CHAT_DEFAULT_PAGE_SIZE = 50
export const CHAT_MAX_PAGE_SIZE = 200
export const CHAT_STAFF_NAME_FALLBACK = 'Estación'

/**
 * Sanitiza un mensaje de chat (texto plano, sin HTML)
 */
export function sanitizeChatBody(body: string): string {
  return sanitizeText(body)
}

/**
 * Sanitiza el nombre de un oyente
 */
export function sanitizeChatName(name: string): string {
  return sanitizeText(name).slice(0, 60)
}

/**
 * Sanitiza el email (lowercase + trim)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 120)
}

/**
 * Verifica si un email o IP está baneado para un cliente
 */
export async function isBanned(
  clientId: string,
  identifiers: { email?: string | null; ipAddress?: string | null }
): Promise<boolean> {
  if (!identifiers.email && !identifiers.ipAddress) return false

  const where: {
    clientId: string
    OR: Array<{ email?: string; ipAddress?: string }>
  } = {
    clientId,
    OR: [],
  }

  if (identifiers.email) {
    where.OR.push({ email: identifiers.email })
  }
  if (identifiers.ipAddress) {
    where.OR.push({ ipAddress: identifiers.ipAddress })
  }

  const ban = await prisma.chatBan.findFirst({
    where,
    select: { id: true },
  })

  return !!ban
}

/**
 * Obtiene la IP del cliente desde el request
 */
export function getClientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}

/**
 * Serializa un mensaje para respuesta JSON
 */
export function serializeMessage(
  msg: {
    id: string
    authorType: string
    name: string
    body: string
    email: string | null
    ipAddress: string | null
    createdAt: Date
  },
  options?: { includePrivate?: boolean }
) {
  const base = {
    id: msg.id,
    authorType: msg.authorType,
    name: msg.name,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
  }

  if (options?.includePrivate) {
    return {
      ...base,
      email: msg.email,
      ipAddress: msg.ipAddress,
    }
  }

  return base
}

/**
 * Calcula estadísticas del chat
 */
export async function getChatStats(clientId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [lastHour, last24h, totalActive, activeBans, listenerCount] = await Promise.all([
    prisma.chatMessage.count({
      where: { clientId, createdAt: { gte: oneHourAgo } },
    }),
    prisma.chatMessage.count({
      where: { clientId, createdAt: { gte: oneDayAgo } },
    }),
    prisma.chatMessage.findMany({
      where: { clientId, createdAt: { gte: oneDayAgo } },
      select: { email: true, name: true, authorType: true },
    }),
    prisma.chatBan.count({ where: { clientId } }),
    prisma.chatMessage.findMany({
      where: { clientId, createdAt: { gte: oneHourAgo }, authorType: 'listener' },
      distinct: ['email'],
      select: { email: true, name: true },
    }),
  ])

  return {
    lastHourMessages: lastHour,
    last24hMessages: last24h,
    activeUsersLastHour: listenerCount.length,
    activeBans,
  }
}
