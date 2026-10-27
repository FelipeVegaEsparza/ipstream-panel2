import { describe, expect, it, vi } from 'vitest'

const findUnique = vi.hoisted(() => vi.fn(async (_args: { where: { locale: string } }) => null))
const create = vi.hoisted(() =>
  vi.fn(async (args: { data: { locale: string; content: unknown; version: number } }) => ({
    id: `seed-${args.data.locale}`,
    ...args.data,
    updatedBy: 'seed',
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
)
const update = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock('./prisma', () => ({
  prisma: {
    siteContent: { findUnique, create, update },
  },
}))

const { ensureSiteContentSeeded, getSeedContent, mergeSeedContent } = await import(
  './site-content-service'
)

describe('site content seed', () => {
  it('valida el snapshot de español e inglés', () => {
    const es = getSeedContent('es')
    const en = getSeedContent('en')

    expect(es.global.siteName).toBe('CasterFly')
    expect(es.i18n['home.hero.title']).toBeTruthy()
    expect(es.collections.pillars.length).toBeGreaterThan(0)
    expect(es.collections.voiceSamples.length).toBe(4)
    expect(en.i18n['home.hero.title']).toBeTruthy()
    expect(en.collections.faq.length).toBeGreaterThan(0)
  })

  it('siembra una vez por proceso y no duplica filas', async () => {
    await ensureSiteContentSeeded()
    await ensureSiteContentSeeded()

    expect(findUnique).toHaveBeenCalledTimes(2)
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls.map((call) => call[0].data.locale)).toEqual(['es', 'en'])
  })

  it('agrega claves y colecciones nuevas sin pisar lo existente', () => {
    const seed = getSeedContent('es')
    const i18n: Record<string, string> = { ...seed.i18n, 'home.hero.title': 'Texto editado' }
    delete i18n['home.voice.title']
    const existing = {
      ...seed,
      i18n,
      collections: { ...seed.collections, voiceSamples: [] },
    }

    const merged = mergeSeedContent(existing, seed)

    expect(merged.changed).toBe(true)
    expect(merged.content.i18n['home.hero.title']).toBe('Texto editado')
    expect(merged.content.i18n['home.voice.title']).toBeTruthy()
    expect(merged.content.collections.voiceSamples.length).toBe(4)
    expect(mergeSeedContent(seed, seed).changed).toBe(false)
  })
})
