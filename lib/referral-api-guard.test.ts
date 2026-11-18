import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession }))

import { GET as listRoute } from '@/app/api/admin/referrals/route'
import { GET as detailRoute } from '@/app/api/admin/referrals/[id]/route'
import { POST as flagRoute } from '@/app/api/admin/referrals/[id]/flag/route'
import { POST as voidRoute } from '@/app/api/admin/referral-rewards/[id]/void/route'
import { GET as auditRoute } from '@/app/api/admin/referrals/audit/route'
import { POST as refundRoute } from '@/app/api/admin/payments/[id]/refund/route'

const params = { params: { id: 'x1' } }

function request(
  path: string,
  init?: ConstructorParameters<typeof NextRequest>[1]
) {
  return new NextRequest(`http://localhost${path}`, init)
}

beforeEach(() => {
  getSession.mockReset()
})

describe('guards de APIs admin de referidos', () => {
  it('rechaza listado sin sesión admin', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1', role: 'CLIENT' } })
    const res = await listRoute(request('/api/admin/referrals'))
    expect(res.status).toBe(401)
  })

  it('rechaza detalle sin sesión admin', async () => {
    getSession.mockResolvedValue(null)
    const res = await detailRoute(request('/api/admin/referrals/x1'), params)
    expect(res.status).toBe(401)
  })

  it('rechaza flag sin sesión admin', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1', role: 'CLIENT' } })
    const res = await flagRoute(request('/api/admin/referrals/x1/flag', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('rechaza anulación sin sesión admin', async () => {
    getSession.mockResolvedValue(null)
    const res = await voidRoute(request('/api/admin/referral-rewards/x1/void', {
      method: 'POST',
      body: JSON.stringify({ reason: 'test' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('rechaza auditoría sin sesión admin', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1', role: 'CLIENT' } })
    const res = await auditRoute(request('/api/admin/referrals/audit'))
    expect(res.status).toBe(401)
  })

  it('rechaza reembolso sin sesión admin', async () => {
    getSession.mockResolvedValue(null)
    const res = await refundRoute(request('/api/admin/payments/x1/refund', {
      method: 'POST',
      body: JSON.stringify({}),
    }), params)
    expect(res.status).toBe(401)
  })
})

describe('validación de motivos', () => {
  it('exige motivo para rechazar un referido', async () => {
    getSession.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } })
    const res = await flagRoute(request('/api/admin/referrals/x1/flag', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', reason: '   ' }),
    }), params)
    expect(res.status).toBe(400)
  })

  it('exige motivo para anular una recompensa', async () => {
    getSession.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } })
    const res = await voidRoute(request('/api/admin/referral-rewards/x1/void', {
      method: 'POST',
      body: JSON.stringify({ reason: '' }),
    }), params)
    expect(res.status).toBe(400)
  })
})
