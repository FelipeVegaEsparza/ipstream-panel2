import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllCache,
  getCache,
  setCache
} from './cache'

describe('caché en memoria', () => {
  beforeEach(() => {
    clearAllCache()
  })

  it('devuelve datos cacheados dentro del TTL', () => {
    setCache('tenantA', '/basic-data', { projectName: 'Radio A' }, 60_000)
    expect(getCache('tenantA', '/basic-data')).toEqual({
      projectName: 'Radio A'
    })
  })

  it('expira una entrada tras su TTL', async () => {
    setCache('tenantA', '/basic-data', { projectName: 'Radio A' }, 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(getCache('tenantA', '/basic-data')).toBeUndefined()
  })

  it('no cruza datos entre tenants con la misma clave', () => {
    setCache('tenantA', '/programs', [{ name: 'A' }], 60_000)
    setCache('tenantB', '/programs', [{ name: 'B' }], 60_000)

    expect(getCache('tenantA', '/programs')).toEqual([{ name: 'A' }])
    expect(getCache('tenantB', '/programs')).toEqual([{ name: 'B' }])
  })

  it('devuelve undefined para claves inexistentes', () => {
    expect(getCache('tenantA', '/nada')).toBeUndefined()
  })
})
