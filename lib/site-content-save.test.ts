import { describe, expect, it, vi } from 'vitest'

type Row = {
  id: string
  locale: string
  content: unknown
  version: number
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
}

const state = vi.hoisted(() => ({ rows: new Map<string, Row>() }))

const create = vi.hoisted(() =>
  vi.fn(async (args: { data: { locale: string; content: unknown; version: number; updatedBy: string | null } }) => {
    const now = new Date()
    const row: Row = {
      ...args.data,
      id: `seed-${args.data.locale}`,
      createdAt: now,
      updatedAt: now,
    }
    state.rows.set(args.data.locale, row)
    return row
  })
)

const findUnique = vi.hoisted(() =>
  vi.fn(async (args: { where: { locale: string } }) => state.rows.get(args.where.locale) ?? null)
)

const update = vi.hoisted(() =>
  vi.fn(async (args: { where: { locale: string }; data: { content: unknown; version: { increment: number }; updatedBy: string } }) => {
    const row = state.rows.get(args.where.locale)
    if (!row) throw new Error('missing row')
    const next = {
      ...row,
      content: args.data.content,
      version: row.version + args.data.version.increment,
      updatedBy: args.data.updatedBy,
      updatedAt: new Date(),
    }
    state.rows.set(args.where.locale, next)
    return next
  })
)

vi.mock('./prisma', () => ({
  prisma: { siteContent: { create, findUnique, update } },
}))

const {
  SiteContentValidationError,
  SiteContentVersionError,
  getPublicSiteContent,
  saveSiteContent,
} = await import('./site-content-service')

describe('saveSiteContent', () => {
  it('guarda contenido válido y sube la versión', async () => {
    const saved = await saveSiteContent(
      'es',
      { global: { siteName: 'CasterFly Editado' } },
      1,
      'admin@casterfly.com'
    )

    expect(saved.content?.global.siteName).toBe('CasterFly Editado')
    expect(saved.version).toBe(2)
  })

  it('rechaza una versión desactualizada sin modificar el contenido', async () => {
    const before = state.rows.get('es')?.content

    await expect(
      saveSiteContent('es', { global: { siteName: 'No debe guardar' } }, 1, 'admin@casterfly.com')
    ).rejects.toBeInstanceOf(SiteContentVersionError)

    expect(state.rows.get('es')?.content).toEqual(before)
  })

  it('devuelve contenido nulo al público si el JSON guardado no valida', async () => {
    const row = state.rows.get('es')
    if (!row) throw new Error('missing seed row')
    row.content = { global: { contactEmail: 'no-es-email' } }

    const publicData = await getPublicSiteContent('es')
    expect(publicData.content).toBeNull()
  })

  it('rechaza contenido inválido sin pisar la versión publicada', async () => {
    const before = state.rows.get('es')?.content
    const beforeVersion = state.rows.get('es')?.version

    await expect(
      saveSiteContent('es', { global: { contactEmail: 'no-es-email' } }, beforeVersion!, 'admin@casterfly.com')
    ).rejects.toBeInstanceOf(SiteContentValidationError)

    expect(state.rows.get('es')?.content).toEqual(before)
    expect(state.rows.get('es')?.version).toBe(beforeVersion)
  })
})
