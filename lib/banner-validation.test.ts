import { describe, expect, it } from 'vitest'
import { bannerSchema } from './validations'

describe('bannerSchema', () => {
  it('exige la imagen', () => {
    const result = bannerSchema.safeParse({ imageUrl: '   ' })
    expect(result.success).toBe(false)
  })

  it('acepta un enlace https válido', () => {
    const result = bannerSchema.parse({
      imageUrl: '/api/uploads/client/banner.webp',
      linkUrl: 'https://example.com/promo',
    })

    expect(result.linkUrl).toBe('https://example.com/promo')
  })

  it('normaliza el enlace vacío a null', () => {
    const result = bannerSchema.parse({
      imageUrl: '/api/uploads/client/banner.webp',
      linkUrl: '   ',
    })

    expect(result.linkUrl).toBeNull()
  })

  it('acepta un banner sin enlace', () => {
    const result = bannerSchema.parse({
      imageUrl: '/api/uploads/client/banner.webp',
    })

    expect(result.linkUrl).toBeUndefined()
  })

  it('rechaza esquemas ejecutables', () => {
    for (const linkUrl of [
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'ftp://example.com/file',
    ]) {
      const result = bannerSchema.safeParse({
        imageUrl: '/api/uploads/client/banner.webp',
        linkUrl,
      })
      expect(result.success).toBe(false)
    }
  })

  it('rechaza URLs malformadas', () => {
    const result = bannerSchema.safeParse({
      imageUrl: '/api/uploads/client/banner.webp',
      linkUrl: 'https://',
    })

    expect(result.success).toBe(false)
  })
})
