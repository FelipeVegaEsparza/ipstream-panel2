import { describe, expect, it } from 'vitest'
import {
  normalizeLocale,
  parseSiteContent,
  siteContentSchema,
  siteFeatureSchema,
} from './site-content'

describe('site content schema', () => {
  it('aplica defaults seguros cuando el contenido está vacío', () => {
    const parsed = siteContentSchema.parse({})

    expect(parsed.global.siteName).toBe('CasterFly')
    expect(parsed.global.contactEmail).toBe('contacto@casterfly.com')
    expect(parsed.global.social.facebook).toBe('')
    expect(parsed.i18n).toEqual({})
    expect(parsed.collections.pillars).toEqual([])
    expect(parsed.collections.faq).toEqual([])
  })

  it('completa un documento parcial sin perder los valores enviados', () => {
    const parsed = siteContentSchema.parse({
      global: { siteName: 'Mi Radio' },
      i18n: { 'home.hero.title': 'Hola' },
    })

    expect(parsed.global.siteName).toBe('Mi Radio')
    expect(parsed.global.contactEmail).toBe('contacto@casterfly.com')
    expect(parsed.i18n['home.hero.title']).toBe('Hola')
  })

  it('rechaza URLs inválidas en redes y assets', () => {
    const result = siteContentSchema.safeParse({
      global: { social: { facebook: 'no-es-url' } },
    })
    expect(result.success).toBe(false)

    const asset = siteFeatureSchema.safeParse({ image: 'javascript:alert(1)' })
    expect(asset.success).toBe(false)
  })

  it('normaliza locales desconocidos a español', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('es')).toBe('es')
    expect(normalizeLocale('fr')).toBe('es')
    expect(normalizeLocale(null)).toBe('es')
  })

  it('parseSiteContent devuelve null ante datos corruptos', () => {
    expect(parseSiteContent({ global: { contactEmail: 'no-email' } })).toBeNull()
    expect(parseSiteContent(null)).toBeNull()
  })
})
