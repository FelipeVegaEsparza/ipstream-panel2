import { describe, expect, it, vi } from 'vitest'

const upsert = vi.hoisted(() =>
  vi.fn(async (_args: { where: { locale: string } }) => ({}))
)

vi.mock('./prisma', () => ({
  prisma: {
    siteContent: { upsert },
  },
}))

const { ensureSiteContentSeeded, getSeedContent } = await import('./site-content-service')

describe('site content seed', () => {
  it('valida el snapshot de español e inglés', () => {
    const es = getSeedContent('es')
    const en = getSeedContent('en')

    expect(es.global.siteName).toBe('CasterFly')
    expect(es.i18n['home.hero.title']).toBeTruthy()
    expect(es.collections.pillars.length).toBeGreaterThan(0)
    expect(en.i18n['home.hero.title']).toBeTruthy()
    expect(en.collections.faq.length).toBeGreaterThan(0)
  })

  it('siembra una vez por proceso y no duplica filas', async () => {
    await ensureSiteContentSeeded()
    await ensureSiteContentSeeded()

    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert.mock.calls.map((call) => call[0].where.locale)).toEqual(['es', 'en'])
  })
})
