import { describe, expect, it } from 'vitest'
import { isValidBannerLink } from './banner-link'

describe('isValidBannerLink', () => {
  it('acepta enlaces http y https válidos', () => {
    expect(isValidBannerLink('https://example.com/promo')).toBe(true)
    expect(isValidBannerLink('http://example.com')).toBe(true)
  })

  it('acepta un enlace vacío porque es opcional', () => {
    expect(isValidBannerLink('')).toBe(true)
  })

  it('rechaza esquemas ejecutables y protocolos no permitidos', () => {
    expect(isValidBannerLink('javascript:alert(1)')).toBe(false)
    expect(isValidBannerLink('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isValidBannerLink('ftp://example.com/file')).toBe(false)
  })

  it('rechaza URLs malformadas', () => {
    expect(isValidBannerLink('https://')).toBe(false)
  })
})
