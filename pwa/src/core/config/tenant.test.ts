import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getApiOrigin,
  getBakedClientId,
  getPublicApiBase,
  resolveTenantByHost
} from './tenant'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('tenant', () => {
  it('construye la base URL pública de la API (origen por defecto)', () => {
    expect(getPublicApiBase('cmtezi0ci00014raq8hrhhwfp')).toBe(
      'https://panelipstream.cl/api/public/cmtezi0ci00014raq8hrhhwfp'
    )
  })

  it('usa VITE_API_BASE como origen del API', () => {
    vi.stubEnv('VITE_API_BASE', 'https://panel.example.com/')
    expect(getApiOrigin()).toBe('https://panel.example.com')
    expect(getPublicApiBase('abc')).toBe('https://panel.example.com/api/public/abc')
  })

  it('VITE_API_BASE vacío = same-origin', () => {
    vi.stubEnv('VITE_API_BASE', '')
    expect(getApiOrigin()).toBe('')
    expect(getPublicApiBase('abc')).toBe('/api/public/abc')
  })

  it('lee el clientId inyectado en el build', () => {
    vi.stubEnv('VITE_CLIENT_ID', 'cmtest00000000000000001')
    expect(getBakedClientId()).toBe('cmtest00000000000000001')
  })

  it('devuelve null si no hay clientId inyectado', () => {
    vi.stubEnv('VITE_CLIENT_ID', '')
    expect(getBakedClientId()).toBeNull()
  })

  it('resuelve el tenant por host contra resolve-domain', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://panel.example.com')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ found: true, clientId: 'c1', clientName: 'Radio X' })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveTenantByHost('Radio-X.panel.example.com')

    expect(result).toEqual({ clientId: 'c1', name: 'Radio X' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.com/api/public/resolve-domain?host=radio-x.panel.example.com',
      expect.anything()
    )
  })

  it('devuelve null si el host no está registrado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ found: false })))
    expect(await resolveTenantByHost('nope.example.com')).toBeNull()
  })

  it('devuelve null si la consulta falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await resolveTenantByHost('nope.example.com')).toBeNull()
  })
})
