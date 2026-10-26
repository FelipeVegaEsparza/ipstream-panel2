import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clientFindUnique: vi.fn(),
  messageFindMany: vi.fn(),
  messageCount: vi.fn(),
  banCount: vi.fn(),
  getSession: vi.fn(),
  getEffectiveClient: vi.fn(),
  isMenuItemEnabled: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: mocks.clientFindUnique },
    chatMessage: { findMany: mocks.messageFindMany, count: mocks.messageCount },
    chatBan: { count: mocks.banCount },
  },
}))

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/getEffectiveClient', () => ({ getEffectiveClient: mocks.getEffectiveClient }))
vi.mock('@/lib/menu-permissions', () => ({ isMenuItemEnabled: mocks.isMenuItemEnabled }))

import { GET as getPublicMessages } from '@/app/api/public/[clientId]/chat/messages/route'
import { GET as getPublicOnline } from '@/app/api/public/[clientId]/chat/online/route'
import { GET as getDashboardMessages } from '@/app/api/dashboard/chat/messages/route'
import { getChatStats } from '@/lib/chat-helpers'

function message(id: string, createdAt: string) {
  return {
    id,
    authorType: 'listener',
    name: `Oyente ${id}`,
    body: `Mensaje ${id}`,
    email: `${id}@example.com`,
    ipAddress: '127.0.0.1',
    createdAt: new Date(createdAt),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.clientFindUnique.mockResolvedValue({ id: 'client-a' })
  mocks.isMenuItemEnabled.mockResolvedValue(true)
  mocks.getSession.mockResolvedValue({ user: { id: 'admin', role: 'CLIENT' } })
  mocks.getEffectiveClient.mockResolvedValue({ clientId: 'client-a', isImpersonating: false })
  mocks.messageCount.mockResolvedValue(0)
  mocks.banCount.mockResolvedValue(0)
})

describe('public chat messages API', () => {
  it('devuelve los últimos mensajes en orden ascendente sin since', async () => {
    mocks.messageFindMany.mockResolvedValue([
      message('nuevo', '2025-01-01T00:00:02.000Z'),
      message('viejo', '2025-01-01T00:00:01.000Z'),
    ])

    const response = await getPublicMessages(
      new NextRequest('http://localhost/api/public/client-a/chat/messages?limit=2'),
      { params: { clientId: 'client-a' } }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['viejo', 'nuevo'])
    expect(body.nextCursor).toBe('2025-01-01T00:00:02.000Z')
    expect(body.hasMore).toBe(false)
  })

  it('usa since y devuelve nextCursor/hasMore', async () => {
    mocks.messageFindMany.mockResolvedValue([
      message('nuevo-1', '2025-01-01T00:00:03.000Z'),
      message('nuevo-2', '2025-01-01T00:00:04.000Z'),
    ])

    const response = await getPublicMessages(
      new NextRequest(
        'http://localhost/api/public/client-a/chat/messages?since=2025-01-01T00:00:02.000Z&limit=1'
      ),
      { params: { clientId: 'client-a' } }
    )
    const body = await response.json()

    expect(mocks.messageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gt: new Date('2025-01-01T00:00:02.000Z') },
        }),
        take: 2,
      })
    )
    expect(body.messages).toHaveLength(1)
    expect(body.hasMore).toBe(true)
    expect(body.nextCursor).toBe('2025-01-01T00:00:03.000Z')
  })

  it('bloquea el chat deshabilitado', async () => {
    mocks.isMenuItemEnabled.mockResolvedValue(false)

    const response = await getPublicMessages(
      new NextRequest('http://localhost/api/public/client-a/chat/messages'),
      { params: { clientId: 'client-a' } }
    )

    expect(response.status).toBe(403)
    expect(mocks.messageFindMany).not.toHaveBeenCalled()
  })
})

describe('dashboard chat messages API', () => {
  it('aplica since en lugar de devolver la página completa', async () => {
    mocks.messageFindMany.mockResolvedValue([
      message('nuevo', '2025-01-01T00:00:03.000Z'),
      message('nuevo-2', '2025-01-01T00:00:04.000Z'),
    ])

    const response = await getDashboardMessages(
      new NextRequest(
        'http://localhost/api/dashboard/chat/messages?since=2025-01-01T00:00:02.000Z&limit=1'
      )
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.messageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gt: new Date('2025-01-01T00:00:02.000Z') },
        }),
        take: 2,
      })
    )
    expect(body.messages).toHaveLength(1)
    expect(body.hasMore).toBe(true)
    expect(body.nextCursor).toBe('2025-01-01T00:00:03.000Z')
  })

  it('bloquea el dashboard si el chat está deshabilitado', async () => {
    mocks.isMenuItemEnabled.mockResolvedValue(false)

    const response = await getDashboardMessages(
      new NextRequest('http://localhost/api/dashboard/chat/messages')
    )

    expect(response.status).toBe(403)
    expect(mocks.messageFindMany).not.toHaveBeenCalled()
  })
})


describe('chat online y estadísticas', () => {
  it('cuenta solo oyentes únicos y excluye staff', async () => {
    mocks.messageFindMany.mockResolvedValue([
      { name: 'Ana', email: 'ana@example.com' },
      { name: 'Ana repetida', email: 'ana@example.com' },
      { name: 'Beto', email: 'beto@example.com' },
    ])

    const response = await getPublicOnline(
      new NextRequest('http://localhost/api/public/client-a/chat/online'),
      { params: { clientId: 'client-a' } }
    )
    const body = await response.json()

    expect(mocks.messageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorType: 'listener' }),
      })
    )
    expect(body.count).toBe(2)
  })

  it('getChatStats excluye staff del conteo de oyentes activos', async () => {
    mocks.messageCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(10)
    mocks.banCount.mockResolvedValue(2)
    mocks.messageFindMany.mockResolvedValue([
      { name: 'Ana', email: 'ana@example.com' },
      { name: 'Beto', email: 'beto@example.com' },
    ])

    const stats = await getChatStats('client-a')

    expect(stats).toEqual({
      lastHourMessages: 5,
      last24hMessages: 10,
      activeUsersLastHour: 2,
      activeBans: 2,
    })
    expect(mocks.messageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorType: 'listener' }),
      })
    )
  })
})
