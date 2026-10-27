import { z } from 'zod'

const text = (max = 500) => z.string().trim().max(max).default('')
const longText = (max = 4000) => z.string().trim().max(max).default('')
const assetUrl = () =>
  z
    .string()
    .trim()
    .max(600)
    .refine(
      (value) => !value || /^(https?:\/\/|\/)/i.test(value),
      'Debe ser una URL absoluta o una ruta que empiece con /'
    )
    .default('')
const linkUrl = () =>
  z
    .string()
    .trim()
    .max(600)
    .refine(
      (value) => !value || /^https?:\/\//i.test(value),
      'Debe ser una URL que empiece con http:// o https://'
    )
    .default('')
const lines = (maxItems = 20, maxLength = 240) =>
  z.array(z.string().trim().max(maxLength)).max(maxItems).default([])

export const siteFeatureSchema = z.object({
  code: text(12),
  title: text(160),
  description: longText(1600),
  points: lines(16, 240),
  image: assetUrl(),
  icon: text(40),
})

export const siteStepSchema = z.object({
  code: text(12),
  title: text(160),
  description: longText(1600),
})

export const sitePlayerSchema = z.object({
  title: text(160),
  description: longText(1200),
  tags: lines(12, 80),
  image: assetUrl(),
})

export const siteSupportCardSchema = z.object({
  title: text(160),
  description: longText(1000),
  href: text(600),
  action: text(120),
})

export const siteFaqSchema = z.object({
  question: text(300),
  answer: longText(2000),
})

export const siteProFeatureSchema = z.object({
  icon: text(40),
  title: text(160),
  text: longText(1000),
})

export const siteVoiceSampleSchema = z.object({
  title: text(160),
  description: longText(1000),
  voice: text(80),
  tag: text(40),
  duration: text(16),
  audioUrl: assetUrl(),
  transcript: longText(2000),
})

export const siteSocialSchema = z.object({
  facebook: linkUrl(),
  youtube: linkUrl(),
  instagram: linkUrl(),
  tiktok: linkUrl(),
  twitter: linkUrl(),
})

const EMPTY_SOCIAL = siteSocialSchema.parse({})

export const siteGlobalSchema = z.object({
  siteName: text(80).default('CasterFly'),
  tagline: text(200).default('Radio profesional asistida por IA'),
  contactEmail: z.string().trim().email().default('contacto@casterfly.com'),
  panelUrl: linkUrl().default('https://panel.casterfly.com/'),
  demoStreamUrl: linkUrl().default('https://audio1.ipstream.cl/radio_5715de5983df'),
  social: siteSocialSchema.default(EMPTY_SOCIAL),
})

export const siteCollectionsSchema = z.object({
  pillars: z.array(siteFeatureSchema).max(20).default([]),
  highlights: z.array(siteFeatureSchema).max(30).default([]),
  aiFeatures: z.array(siteFeatureSchema).max(20).default([]),
  aiSteps: z.array(siteStepSchema).max(20).default([]),
  studioFeatures: z.array(siteFeatureSchema).max(20).default([]),
  players: z.array(sitePlayerSchema).max(20).default([]),
  supportCards: z.array(siteSupportCardSchema).max(20).default([]),
  faq: z.array(siteFaqSchema).max(50).default([]),
  proFeatures: z.array(siteProFeatureSchema).max(20).default([]),
  voiceSamples: z.array(siteVoiceSampleSchema).max(20).default([]),
})

const EMPTY_GLOBAL = siteGlobalSchema.parse({})
const EMPTY_COLLECTIONS = siteCollectionsSchema.parse({})

export const siteContentSchema = z.object({
  global: siteGlobalSchema.default(EMPTY_GLOBAL),
  i18n: z.record(z.string().max(160), longText(4000)).default({}),
  collections: siteCollectionsSchema.default(EMPTY_COLLECTIONS),
})

export type SiteContent = z.infer<typeof siteContentSchema>
export type SiteFeature = z.infer<typeof siteFeatureSchema>
export type SiteStep = z.infer<typeof siteStepSchema>
export type SitePlayer = z.infer<typeof sitePlayerSchema>
export type SiteSupportCard = z.infer<typeof siteSupportCardSchema>
export type SiteFaq = z.infer<typeof siteFaqSchema>
export type SiteProFeature = z.infer<typeof siteProFeatureSchema>
export type SiteVoiceSample = z.infer<typeof siteVoiceSampleSchema>

export const SITE_CONTENT_LOCALES = ['es', 'en'] as const
export type SiteContentLocale = (typeof SITE_CONTENT_LOCALES)[number]

export function isSiteContentLocale(value: string | null): value is SiteContentLocale {
  return value === 'es' || value === 'en'
}

export function normalizeLocale(value: string | null | undefined): SiteContentLocale {
  const normalized = value ?? null
  return isSiteContentLocale(normalized) ? normalized : 'es'
}

/** Valida y normaliza un documento guardado. Devuelve null si no se puede leer. */
export function parseSiteContent(value: unknown): SiteContent | null {
  const result = siteContentSchema.safeParse(value)
  return result.success ? result.data : null
}
