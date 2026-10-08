import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBakedClientId, getPublicApiBase } from './tenant'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('tenant', () => {
  it('construye la base URL pública de la API', () => {
    expect(getPublicApiBase('cmtezi0ci00014raq8hrhhwfp')).toBe(
      'https://panelipstream.cl/api/public/cmtezi0ci00014raq8hrhhwfp'
    )
  })

  it('lee el clientId inyectado en el build', () => {
    vi.stubEnv('VITE_CLIENT_ID', 'cmtest00000000000000001')
    expect(getBakedClientId()).toBe('cmtest00000000000000001')
  })

  it('devuelve null si no hay clientId inyectado', () => {
    vi.stubEnv('VITE_CLIENT_ID', '')
    expect(getBakedClientId()).toBeNull()
  })
})
