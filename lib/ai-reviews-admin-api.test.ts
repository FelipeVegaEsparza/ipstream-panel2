import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  radioStream: { findUnique: vi.fn(), update: vi.fn() },
  client: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  getSession: vi.fn(),
  getStorageUsage: vi.fn(),
  getLiveListenersByClient: vi.fn(),
  restart: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    radioStream: mocks.radioStream,
    client: mocks.client,
    streamingAuditLog: mocks.auditLog,
  },
}))

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/streaming-helpers', () => ({ getStorageUsage: mocks.getStorageUsage }))
vi.mock('@/lib/admin-live-listening', () => ({
  getLiveListenersByClient: mocks.getLiveListenersByClient,
}))
vi.mock('@/lib/streaming-client', () => ({
  streamingClient: { restart: mocks.restart },
}))

import { PATCH as patchStreamingConfig } from '@/app/api/admin/streaming/[clientId]/route'

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/streaming/client-a', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.getStorageUsage.mockResolvedValue({ totalBytes: 0, totalMB: 0 })
  mocks.radioStream.findUnique.mockResolvedValue({ clientId: 'client-a' })
  mocks.radioStream.update.mockResolvedValue({ clientId: 'client-a', aiReviewAdminEnabled: false })
  mocks.auditLog.create.mockResolvedValue({})
  mocks.restart.mockResolvedValue(undefined)
})

describe('kill switch de reseñas por radio', () => {
  it('apaga las reseñas y reinicia el AutoDJ', async () => {
    const response = await patchStreamingConfig(
      jsonRequest({ aiReviewAdminEnabled: false }),
      { params: { clientId: 'client-a' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.radioStream.update).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      data: { aiReviewAdminEnabled: false },
    })
    expect(mocks.restart).toHaveBeenCalledWith('client-a')
  })

  it('al volver a habilitar solo cambia el interruptor y respeta la config previa', async () => {
    mocks.radioStream.update.mockResolvedValue({ clientId: 'client-a', aiReviewAdminEnabled: true })

    const response = await patchStreamingConfig(
      jsonRequest({ aiReviewAdminEnabled: true }),
      { params: { clientId: 'client-a' } }
    )

    expect(response.status).toBe(200)
    const data = mocks.radioStream.update.mock.calls[0][0].data
    expect(data).toEqual({ aiReviewAdminEnabled: true })
    expect(data).not.toHaveProperty('aiReviewEveryTracks')
    expect(mocks.restart).toHaveBeenCalledWith('client-a')
  })

  it('rechaza a quien no es admin', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', role: 'CLIENT' } })

    const response = await patchStreamingConfig(
      jsonRequest({ aiReviewAdminEnabled: false }),
      { params: { clientId: 'client-a' } }
    )

    expect(response.status).toBe(403)
    expect(mocks.radioStream.update).not.toHaveBeenCalled()
  })
})
