import type { Plan } from '@prisma/client'
import { parsePlanFeatures, planSlug } from './plans'

export interface PublicPlanApi {
  id: string
  slug: string
  name: string
  description: string
  interval: string
  services: string
  usdAmount: number
  currency: 'USD'
  features: string[]
  maxDjs: number
  aiLiveEnabled: boolean
  aiMonthlyCharacters: number
  aiMusicMinutes: number
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
  imageUrl: string | null
  demoUrl: string | null
  contractUrl: string
}

type PlanWithPrices = Plan & {
  prices: Array<{ currency: string; amount: number }>
}

function absoluteImageUrl(value: string | null, origin: string): string | null {
  const raw = (value || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${origin.replace(/\/+$/, '')}${raw}`
  return null
}

export function planUsdAmount(plan: PlanWithPrices): number | null {
  const usd = plan.prices.find((price) => price.currency.toUpperCase() === 'USD')
  if (usd) return usd.amount
  if (plan.currency.toUpperCase() === 'USD') return plan.price
  return null
}

/** Convierte un Plan de Prisma al contrato público que consume el sitio. */
export function toPublicPlanApi(
  plan: PlanWithPrices,
  origin: string
): PublicPlanApi | null {
  const usdAmount = planUsdAmount(plan)
  if (usdAmount === null) return null

  const slug = planSlug(plan.name)
  const base = origin.replace(/\/+$/, '')

  return {
    id: plan.id,
    slug,
    name: plan.name,
    description: plan.description,
    interval: plan.interval,
    services: plan.services || 'both',
    usdAmount,
    currency: 'USD',
    features: parsePlanFeatures(plan.features),
    maxDjs: plan.maxDjs,
    aiLiveEnabled: plan.aiLiveEnabled,
    aiMonthlyCharacters: plan.aiMonthlyCharacters,
    aiMusicMinutes: plan.aiMusicMinutes,
    radioStorageQuotaMB: plan.radioStorageQuotaMB,
    videoStorageQuotaMB: plan.videoStorageQuotaMB,
    imageUrl: absoluteImageUrl(plan.imageUrl, base),
    demoUrl: plan.demoUrl,
    contractUrl: `${base}/planes/${slug}`,
  }
}
