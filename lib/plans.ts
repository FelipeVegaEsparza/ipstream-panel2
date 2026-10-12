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

export type PlanPriceItem = { currency: string; amount: number }

/**
 * Lista de precios de un plan: la moneda base (`Plan.currency`/`Plan.price`)
 * primero, más las monedas adicionales (`PlanPrice`), sobreescribiendo la base
 * si coincide. Así la web pública muestra SIEMPRE la moneda base aunque no
 * exista una fila `PlanPrice` para ella.
 */
export function planPriceList(
  plan: Pick<Plan, 'currency' | 'price'> & { prices?: PlanPriceItem[] | null }
): PlanPriceItem[] {
  const map = new Map<string, number>()
  map.set(plan.currency, plan.price)
  for (const p of plan.prices ?? []) {
    if (p && p.currency) map.set(p.currency, p.amount)
  }
  return Array.from(map, ([currency, amount]) => ({ currency, amount }))
}

export function toPublicPlan(
  plan: Plan & { prices?: Array<{ currency: string; amount: number }> }
): PublicPlan {
  const prices = planPriceList(plan)

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
