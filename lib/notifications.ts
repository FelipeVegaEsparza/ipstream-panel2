// =====================================================
// Centro de notificaciones in-app del panel
// =====================================================

import { prisma } from '@/lib/prisma'

export interface ClientNotificationInput {
  type: string
  title: string
  message: string
  link?: string | null
  eventKey: string
}

export async function notifyClient(
  clientId: string | null | undefined,
  input: ClientNotificationInput,
  db: any = prisma
) {
  if (!clientId) return { created: false, reason: 'no_client' }
  try {
    const result = await db.clientNotification.createMany({
      data: [
        {
          clientId,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link ?? null,
          eventKey: input.eventKey,
        },
      ],
      skipDuplicates: true,
    })
    return { created: (result?.count ?? 0) > 0 }
  } catch (error) {
    console.error('[notifications] No se pudo crear la notificación:', error)
    return { created: false, reason: 'error' }
  }
}

export async function listNotifications(
  clientId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
  db: any = prisma
) {
  const rawLimit = Number(opts.limit ?? 50)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50
  return db.clientNotification.findMany({
    where: {
      clientId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getUnreadNotificationCount(
  clientId: string,
  db: any = prisma
): Promise<number> {
  return db.clientNotification.count({ where: { clientId, readAt: null } })
}

export async function markNotificationRead(
  clientId: string,
  notificationId: string,
  db: any = prisma
) {
  return db.clientNotification.updateMany({
    where: { id: notificationId, clientId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function markAllRead(clientId: string, db: any = prisma) {
  return db.clientNotification.updateMany({
    where: { clientId, readAt: null },
    data: { readAt: new Date() },
  })
}
