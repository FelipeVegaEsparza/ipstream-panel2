import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getEffectiveClientFromRequest: vi.fn(),
  packFindFirst: vi.fn(),
  requestFindFirst: vi.fn(),
  requestCreate: vi.fn(),
}))

vi.mock('@/lib/getEffectiveClient', () => ({
  getEffectiveClientFromRequest: mocks.getEffectiveClientFromRequest,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiCreditPack: { findFirst: mocks.packFindFirst },
    aiCreditRequest: { findFirst: mocks.requestFindFirst, create: mocks.requestCreate },
  },
}))

import { POST } from '@/app/api/dashboard/ai-credits/requests/route'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/dashboard/ai-credits/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getEffectiveClientFromRequest.mockResolvedValue({ clientId: 'client-a', isImpersonating: false })
  mocks.requestFindFirst.mockResolvedValue(null)
  mocks.requestCreate.mockResolvedValue({ id: 'req-1', status: 'pending' })
})

describe('dashboard AI credit requests', () => {
  it('rechaza paquetes inactivos o inexistentes', async () => {
    mocks.packFindFirst.mockResolvedValue(null)

    const response = await POST(request({ packId: 'pack-1' }))

    expect(response.status).toBe(404)
    expect(mocks.requestCreate).not.toHaveBeenCalled()
  })

  it('evita duplicar una solicitud pendiente', async () => {
    mocks.packFindFirst.mockResolvedValue({ id: 'pack-1', isActive: true })
    mocks.requestFindFirst.mockResolvedValue({ id: 'req-existing' })

    const response = await POST(request({ packId: 'pack-1' }))

    expect(response.status).toBe(409)
    expect(mocks.requestCreate).not.toHaveBeenCalled()
  })

  it('crea la solicitud con snapshot del paquete', async () => {
    mocks.packFindFirst.mockResolvedValue({
      id: 'pack-1',
      isActive: true,
      creditType: 'characters',
      amount: 500,
      price: 15,
      currency: 'USD',
    })

    const response = await POST(request({ packId: 'pack-1' }))

    expect(response.status).toBe(200)
    expect(mocks.requestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-a',
        packId: 'pack-1',
        status: 'pending',
        creditType: 'characters',
        amount: 500,
        price: 15,
        currency: 'USD',
      }),
      select: expect.any(Object),
    })
  })
})
