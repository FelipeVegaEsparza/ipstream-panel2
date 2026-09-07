import { prisma } from '@/lib/prisma'

export const CONTACT_DEFAULT_PAGE_SIZE = 20
export const CONTACT_MAX_PAGE_SIZE = 100

export const CONTACT_STATUSES = ['new', 'read', 'resolved'] as const
export type ContactMessageStatusValue = (typeof CONTACT_STATUSES)[number]

export const contactMessagePublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  ip: true,
  createdAt: true,
  updatedAt: true,
} as const

export type ContactMessageRow = {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: string
  ip: string | null
  createdAt: Date
  updatedAt: Date
}

export function serializeContactMessage(
  message: ContactMessageRow
): {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: string
  ip: string | null
  createdAt: string
  updatedAt: string
} {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone,
    message: message.message,
    status: message.status,
    ip: message.ip,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  }
}

export async function countUnreadContactMessages(clientId: string): Promise<number> {
  return prisma.contactMessage.count({
    where: { clientId, status: 'new' },
  })
}
