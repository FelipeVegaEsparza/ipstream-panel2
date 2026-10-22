import { describe, expect, it } from 'vitest'
import { shouldCachePublicApi } from './api-cache'

describe('shouldCachePublicApi', () => {
  it('cachea la API cuando el origen configurado coincide con el del sitio', () => {
    expect(
      shouldCachePublicApi(
        new URL('https://radio-x.casterfly.com/api/public/c1/basic-data'),
        'https://radio-x.casterfly.com',
        'https://radio-x.casterfly.com'
      )
    ).toBe(true)
  })

  it('con API same-origin usa el origen del propio sitio', () => {
    expect(
      shouldCachePublicApi(
        new URL('https://radio-x.casterfly.com/api/public/c1/basic-data'),
        '',
        'https://radio-x.casterfly.com'
      )
    ).toBe(true)
  })

  it('no cachea el panel viejo', () => {
    expect(
      shouldCachePublicApi(
        new URL('https://panelipstream.cl/api/public/c1/basic-data'),
        '',
        'https://radio-x.casterfly.com'
      )
    ).toBe(false)
  })

  it('no cachea un origen distinto al configurado', () => {
    expect(
      shouldCachePublicApi(
        new URL('https://otro.example.com/api/public/c1/basic-data'),
        'https://panel.casterfly.com',
        'https://radio-x.casterfly.com'
      )
    ).toBe(false)
  })

  it('cachea el panel configurado cuando la API es cross-origin', () => {
    expect(
      shouldCachePublicApi(
        new URL('https://panel.casterfly.com/api/public/c1/basic-data'),
        'https://panel.casterfly.com',
        'https://radio-x.casterfly.com'
      )
    ).toBe(true)
  })
})
