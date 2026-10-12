import type { Plan } from '@prisma/client'
import type { PublicPlan } from '@/components/public/SignupForm'

export function planSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parsePlanFeatures(features: string | null | undefined): string[] {
  if (!features) return []
  try {
    const parsed = JSON.parse(features)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {}
  return []
}

export function toPublicPlan(
  plan: Plan & { prices?: Array<{ currency: string; amount: number }> }
): PublicPlan {
  const prices =
    plan.prices && plan.prices.length > 0
      ? plan.prices.map((p) => ({ currency: p.currency, amount: p.amount }))
      : [{ currency: plan.currency, amount: plan.price }]

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    prices,
    interval: plan.interval,
    features: parsePlanFeatures(plan.features),
    maxDjs: plan.maxDjs,
    services: plan.services || 'both',
    radioStorageQuotaMB: plan.radioStorageQuotaMB,
    videoStorageQuotaMB: plan.videoStorageQuotaMB,
    imageUrl: plan.imageUrl,
    demoUrl: plan.demoUrl,
  }
}
