import type { Prisma } from '@prisma/client'
import seedData from '@/prisma/seed/site-content.json'
import { prisma } from './prisma'
import {
  SITE_CONTENT_LOCALES,
  parseSiteContent,
  siteContentSchema,
  type SiteContent,
  type SiteContentLocale,
} from './site-content'

type SeedFile = Record<SiteContentLocale, unknown>

const seed = seedData as SeedFile
let seedPromise: Promise<void> | null = null

export class SiteContentValidationError extends Error {
  constructor(public readonly issues: unknown) {
    super('El contenido del sitio no es válido')
    this.name = 'SiteContentValidationError'
  }
}

export class SiteContentVersionError extends Error {
  constructor(public readonly currentVersion: number) {
    super('La versión del contenido está desactualizada')
    this.name = 'SiteContentVersionError'
  }
}

export function getSeedContent(locale: SiteContentLocale): SiteContent {
  const parsed = siteContentSchema.safeParse(seed[locale])
  if (!parsed.success) {
    throw new SiteContentValidationError(parsed.error.flatten())
  }
  return parsed.data
}

async function seedSiteContent() {
  for (const locale of SITE_CONTENT_LOCALES) {
    const content = getSeedContent(locale)
    await prisma.siteContent.upsert({
      where: { locale },
      create: {
        locale,
        content: content as unknown as Prisma.InputJsonValue,
        version: 1,
        updatedBy: 'seed',
      },
      update: {},
    })
  }
}

/** Crea es/en desde el snapshot solo si aún no existen. Es idempotente. */
export async function ensureSiteContentSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedSiteContent().catch((error) => {
      seedPromise = null
      throw error
    })
  }
  return seedPromise
}

export interface SiteContentVersionInfo {
  locale: SiteContentLocale
  content: SiteContent | null
  version: number
  updatedAt: string
}

function toVersionInfo(
  row: {
    locale: string
    content: Prisma.JsonValue
    version: number
    updatedAt: Date
  },
  strict: boolean
): SiteContentVersionInfo {
  let content: SiteContent | null
  if (strict) {
    const result = siteContentSchema.safeParse(row.content)
    content = result.success ? result.data : null
  } else {
    content = parseSiteContent(row.content)
  }

  return {
    locale: row.locale === 'en' ? 'en' : 'es',
    content,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getSiteContentForAdmin(
  locale: SiteContentLocale
): Promise<SiteContentVersionInfo> {
  await ensureSiteContentSeeded()
  const row = await prisma.siteContent.findUnique({ where: { locale } })
  if (!row) {
    return { locale, content: null, version: 0, updatedAt: new Date(0).toISOString() }
  }
  return toVersionInfo(row, false)
}

export async function getPublicSiteContent(
  locale: SiteContentLocale
): Promise<SiteContentVersionInfo> {
  await ensureSiteContentSeeded()
  const row = await prisma.siteContent.findUnique({ where: { locale } })
  if (!row) {
    return { locale, content: null, version: 0, updatedAt: new Date(0).toISOString() }
  }
  return toVersionInfo(row, true)
}

export async function saveSiteContent(
  locale: SiteContentLocale,
  content: unknown,
  expectedVersion: number,
  updatedBy: string
): Promise<SiteContentVersionInfo> {
  const parsed = siteContentSchema.safeParse(content)
  if (!parsed.success) {
    throw new SiteContentValidationError(parsed.error.flatten())
  }

  await ensureSiteContentSeeded()
  const existing = await prisma.siteContent.findUnique({ where: { locale } })

  if (!existing) {
    const created = await prisma.siteContent.create({
      data: {
        locale,
        content: parsed.data as unknown as Prisma.InputJsonValue,
        version: 1,
        updatedBy,
      },
    })
    return toVersionInfo(created, false)
  }

  if (expectedVersion !== existing.version) {
    throw new SiteContentVersionError(existing.version)
  }

  const updated = await prisma.siteContent.update({
    where: { locale },
    data: {
      content: parsed.data as unknown as Prisma.InputJsonValue,
      version: { increment: 1 },
      updatedBy,
    },
  })

  return toVersionInfo(updated, false)
}
