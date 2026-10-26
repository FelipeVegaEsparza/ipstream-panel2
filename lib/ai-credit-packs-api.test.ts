import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  packFindMany: vi.fn(),
  packFindUnique: vi.fn(),
  packCreate: vi.fn(),
  packUpdate: vi.fn(),
  packDelete: vi.fn(),
  requestCount: vi.fn(),
  grantCount: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpdate: vi.fn(),
  clientFindUnique: vi.fn(),
  paymentCreate: vi.fn(),
  grantCreate: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiCreditPack: {
      findMany: mocks.packFindMany,
      findUnique: mocks.packFindUnique,
      create: mocks.packCreate,
      update: mocks.packUpdate,
      delete: mocks.packDelete,
    },
    aiCreditRequest: {
      findUnique: mocks.requestFindUnique,
      update: mocks.requestUpdate,
    },
    aiCreditGrant: { count: mocks.grantCount, create: mocks.grantCreate },
    client: { findUnique: mocks.clientFindUnique },
    payment: { create: mocks.paymentCreate },
    $transaction: mocks.transaction,
  },
}))

import { POST as createPack } from '@/app/api/admin/ai-credit-packs/route'
import { POST as resolveRequest } from '@/app/api/admin/ai-credit-requests/[id]/route'
import { POST as directGrant } from '@/app/api/admin/ai-credit-grants/route'

const adminSession = { user: { id: 'admin-1', role: 'ADMIN' } }

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function tx(overrides: Record<string, unknown> = {}) {
  return {
    aiCreditRequest: { findUnique: mocks.requestFindUnique, update: mocks.requestUpdate },
    aiCreditPack: { findUnique: mocks.packFindUnique },
    aiCreditGrant: { create: mocks.grantCreate },
    payment: { create: mocks.paymentCreate },
    client: { findUnique: mocks.clientFindUnique },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue(adminSession)
  mocks.paymentCreate.mockResolvedValue({ id: 'pay-1' })
  mocks.grantCreate.mockResolvedValue({ id: 'grant-1' })
  mocks.requestUpdate.mockResolvedValue({ id: 'req-1', status: 'approved' })
  mocks.requestFindUnique.mockResolvedValue(null)
  mocks.clientFindUnique.mockResolvedValue({ id: 'client-a' })
  mocks.packFindUnique.mockResolvedValue(null)
  mocks.transaction.mockImplementation(async (fn: (client: ReturnType<typeof tx>) => Promise<unknown>) => fn(tx()))
})

describe('admin AI credit packs API', () => {
  it('rechaza a usuarios que no son admin', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', role: 'CLIENT' } })

    const response = await createPack(
      jsonRequest('http://localhost/api/admin/ai-credit-packs', {
        name: 'Pack',
        creditType: 'characters',
        amount: 100,
        price: 10,
        currency: 'USD',
      })
    )

    expect(response.status).toBe(401)
    expect(mocks.packCreate).not.toHaveBeenCalled()
  })

  it('crea un paquete válido', async () => {
    mocks.packCreate.mockResolvedValue({ id: 'pack-1' })

    const response = await createPack(
      jsonRequest('http://localhost/api/admin/ai-credit-packs', {
        name: 'Pack 500',
        creditType: 'characters',
        amount: 500,
        price: 15,
        currency: 'usd',
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.packCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Pack 500', currency: 'USD', amount: 500 }),
    })
  })
})

describe('admin AI credit request resolution', () => {
  beforeEach(() => {
    mocks.requestFindUnique.mockResolvedValue({
      id: 'req-1',
      clientId: 'client-a',
      packId: 'pack-1',
      status: 'pending',
      creditType: 'characters',
      amount: 500,
      price: 15,
      currency: 'USD',
      note: null,
      pack: { name: 'Pack 500' },
    })
  })

  it('aprueba una solicitud creando pago y otorgamiento', async () => {
    const response = await resolveRequest(
      jsonRequest('http://localhost/api/admin/ai-credit-requests/req-1', {
        action: 'approve',
        paymentMethod: 'bank_transfer',
      }),
      { params: { id: 'req-1' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-a',
        subscriptionId: null,
        status: 'completed',
        amount: 15,
        currency: 'USD',
        description: 'Paquete IA: Pack 500',
      }),
      select: { id: true },
    })
    expect(mocks.grantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-a',
        packId: 'pack-1',
        requestId: 'req-1',
        source: 'request',
        characters: 500,
        musicSeconds: 0,
        remainingCharacters: 500,
        paymentId: 'pay-1',
      }),
    })
    expect(mocks.requestUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: expect.objectContaining({ status: 'approved', paymentId: 'pay-1' }),
    })
  })

  it('rechaza una solicitud sin crear pago ni saldo', async () => {
    mocks.requestUpdate.mockResolvedValue({ id: 'req-1', status: 'rejected' })

    const response = await resolveRequest(
      jsonRequest('http://localhost/api/admin/ai-credit-requests/req-1', {
        action: 'reject',
      }),
      { params: { id: 'req-1' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
    expect(mocks.grantCreate).not.toHaveBeenCalled()
    expect(mocks.requestUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: expect.objectContaining({ status: 'rejected' }),
    })
  })
})

describe('admin direct AI credit grant', () => {
  it('registra pago y saldo sin solicitud', async () => {
    mocks.packFindUnique.mockResolvedValue({
      id: 'pack-1',
      name: 'Pack Música',
      creditType: 'music',
      amount: 10,
      price: 20,
      currency: 'USD',
      isActive: true,
    })

    const response = await directGrant(
      jsonRequest('http://localhost/api/admin/ai-credit-grants', {
        clientId: 'client-a',
        packId: 'pack-1',
        paymentMethod: 'cash',
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-a',
        subscriptionId: null,
        status: 'completed',
        amount: 20,
        description: 'Paquete IA: Pack Música',
      }),
      select: { id: true },
    })
    expect(mocks.grantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: 'admin',
        characters: 0,
        musicSeconds: 600,
        remainingMusicSeconds: 600,
      }),
    })
  })
})
