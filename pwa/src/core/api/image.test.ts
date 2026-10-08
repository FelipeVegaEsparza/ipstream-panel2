import { describe, expect, it } from 'vitest'
import { firstPublicImageUrl, isPublicImageUrl } from './index'

describe('isPublicImageUrl', () => {
  it('marca como no pública las rutas del área autenticada', () => {
    expect(isPublicImageUrl('/api/dashboard/streaming/library/trk_x/cover')).toBe(
      false
    )
  })

  it('marca como públicas las rutas de uploads y URLs absolutas', () => {
    expect(isPublicImageUrl('/api/uploads/cmx/logo.png')).toBe(true)
    expect(isPublicImageUrl('https://cdn.ejemplo.cl/x.webp')).toBe(true)
  })

  it('devuelve false ante valores vacíos', () => {
    expect(isPublicImageUrl(null)).toBe(false)
    expect(isPublicImageUrl(undefined)).toBe(false)
  })
})

describe('firstPublicImageUrl', () => {
  it('omite la portada autenticada y usa la primera pública', () => {
    expect(
      firstPublicImageUrl([
        '/api/dashboard/streaming/library/trk_x/cover',
        '/api/uploads/cmx/cover.webp',
        '/api/uploads/cmx/logo.webp'
      ])
    ).toBe('https://panelipstream.cl/api/uploads/cmx/cover.webp')
  })

  it('devuelve null si ningún candidato es público', () => {
    expect(
      firstPublicImageUrl(['/api/dashboard/streaming/library/trk_x/cover'])
    ).toBeNull()
  })
})
