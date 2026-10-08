import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider, useTenant } from './TenantContext'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

function Probe() {
  const tenant = useTenant()
  return (
    <div data-testid="state">
      {tenant.status}:{tenant.clientId ?? '-'}:{tenant.baseUrl ?? '-'}
    </div>
  )
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

afterEach(() => {
  baked.clientId = null
  vi.unstubAllGlobals()
})

describe('TenantProvider', () => {
  it('usa el clientId horneado si existe, sin consultar el host', () => {
    baked.clientId = 'baked1'
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <TenantProvider>
        <Probe />
      </TenantProvider>
    )

    expect(screen.getByTestId('state').textContent).toContain('ready:baked1')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('resuelve el tenant por host cuando no hay clientId horneado', async () => {
    baked.clientId = null
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ found: true, clientId: 'host1', clientName: 'Radio Host' }))
    )

    render(
      <TenantProvider>
        <Probe />
      </TenantProvider>
    )

    expect(screen.getByTestId('state').textContent).toContain('resolving')
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toContain('ready:host1')
    )
  })

  it('queda notFound si no hay horneado ni resolución por host', async () => {
    baked.clientId = null
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ found: false })))

    render(
      <TenantProvider>
        <Probe />
      </TenantProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toContain('notFound')
    )
  })
})
