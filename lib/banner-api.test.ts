import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  banner: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
  },
  getEffectiveClient: vi.fn(),
  getEffectiveClientFromRequest: vi.fn(),
  isMenuItemEnabled: vi.fn(),
  invalidatePublicCache: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    banner: mocks.banner,
    client: mocks.client,
  },
}))

vi.mock('@/lib/getEffectiveClient', () => ({
  getEffectiveClient: mocks.getEffectiveClient,
  getEffectiveClientFromRequest: mocks.getEffectiveClientFromRequest,
}))

vi.mock('@/lib/menu-permissions', () => ({
  isMenuItemEnabled: mocks.isMenuItemEnabled,
}))

vi.mock('@/lib/public-cache', () => ({
  invalidatePublicCache: mocks.invalidatePublicCache,
  withPublicContentCache: (handler: unknown) => handler,
}))

import { GET as getBanners, POST as createBanner } from '@/app/api/banner/route'
import { PUT as updateBanner } from '@/app/api/banner/[id]/route'
import { GET as getPublicBanners } from '@/app/api/public/[clientId]/banner/route'

const effectiveClient = { clientId: 'client-a', isImpersonating: false }

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getEffectiveClient.mockResolvedValue(effectiveClient)
  mocks.getEffectiveClientFromRequest.mockResolvedValue(effectiveClient)
  mocks.isMenuItemEnabled.mockResolvedValue(true)
})

describe('banner management API', () => {
  it('lista solo los banners del cliente efectivo', async () => {
    mocks.banner.findMany.mockResolvedValue([])

    const response = await getBanners(jsonRequest('http://localhost/api/banner', 'GET'))

    expect(response.status).toBe(200)
    expect(mocks.banner.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  })

  it('crea un banner con el clientId efectivo e invalida la caché', async () => {
    mocks.banner.create.mockResolvedValue({ id: 'b1' })

    const response = await createBanner(
      jsonRequest('http://localhost/api/banner', 'POST', {
        imageUrl: '/api/uploads/client-a/banner.webp',
        linkUrl: 'https://example.com',
        order: 1,
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.banner.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-a',
        imageUrl: '/api/uploads/client-a/banner.webp',
        linkUrl: 'https://example.com',
        order: 1,
      },
    })
    expect(mocks.invalidatePublicCache).toHaveBeenCalledWith('client-a')
  })

  it('responde 403 cuando el menú Banner está deshabilitado', async () => {
    mocks.isMenuItemEnabled.mockResolvedValue(false)

    const response = await getBanners(jsonRequest('http://localhost/api/banner', 'GET'))

    expect(response.status).toBe(403)
    expect(mocks.banner.findMany).not.toHaveBeenCalled()
  })

  it('no actualiza banners de otro cliente', async () => {
    mocks.banner.findFirst.mockResolvedValue(null)

    const response = await updateBanner(
      jsonRequest('http://localhost/api/banner/b1', 'PUT', {
        imageUrl: '/api/uploads/client-b/banner.webp',
        linkUrl: null,
      }),
      { params: { id: 'b1' } }
    )

    expect(response.status).toBe(404)
    expect(mocks.banner.findFirst).toHaveBeenCalledWith({
      where: { id: 'b1', clientId: 'client-a' },
      select: { id: true },
    })
    expect(mocks.banner.update).not.toHaveBeenCalled()
  })
})

describe('public banner API', () => {
  it('devuelve solo los banners del cliente solicitado', async () => {
    mocks.client.findUnique.mockResolvedValue({ id: 'client-a' })
    mocks.banner.findMany.mockResolvedValue([])

    const response = await getPublicBanners(
      jsonRequest('http://localhost/api/public/client-a/banner', 'GET'),
      { params: { clientId: 'client-a' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.banner.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      select: {
        id: true,
        imageUrl: true,
        linkUrl: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  })

  it('responde 404 si el cliente no existe', async () => {
    mocks.client.findUnique.mockResolvedValue(null)

    const response = await getPublicBanners(
      jsonRequest('http://localhost/api/public/otro/banner', 'GET'),
      { params: { clientId: 'otro' } }
    )

    expect(response.status).toBe(404)
    expect(mocks.banner.findMany).not.toHaveBeenCalled()
  })
})
