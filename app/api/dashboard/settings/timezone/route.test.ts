import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getEffectiveClient: vi.fn(),
  update: vi.fn(),
  recompute: vi.fn(),
}))

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/getEffectiveClient', () => ({ getEffectiveClient: mocks.getEffectiveClient }))
vi.mock('@/lib/prisma', () => ({ prisma: { client: { update: mocks.update } } }))
vi.mock('@/lib/streaming-client', () => ({
  streamingClient: { recomputeAnalyticsDaily: mocks.recompute },
}))

import { PATCH } from './route'

function request(timezone = 'America/Santiago'): NextRequest {
  return {
    json: async () => ({ timezone }),
  } as unknown as NextRequest
}

describe('PATCH /api/dashboard/settings/timezone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } })
    mocks.getEffectiveClient.mockResolvedValue({ clientId: 'c1' })
    mocks.update.mockResolvedValue({})
  })

  it('saves the timezone and reports a successful recalculation', async () => {
    mocks.recompute.mockResolvedValue({ ok: true })

    const res = await PATCH(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      timezone: 'America/Santiago',
      analyticsRecomputed: true,
    })
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { timezone: 'America/Santiago' },
    })
    expect(mocks.recompute).toHaveBeenCalledWith('c1')
  })

  it('propagates a recalculation failure without reverting the saved timezone', async () => {
    mocks.recompute.mockRejectedValue(new Error('agent down'))

    const res = await PATCH(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      timezone: 'America/Santiago',
      analyticsRecomputed: false,
      warning: 'analytics_recompute_failed',
    })
    expect(mocks.update).toHaveBeenCalled()
    expect(mocks.recompute).toHaveBeenCalledWith('c1')
  })
})
