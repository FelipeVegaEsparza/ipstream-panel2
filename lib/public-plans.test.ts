import { describe, expect, it } from 'vitest'
import { planUsdAmount, toPublicPlanApi } from './public-plans'

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan1',
    name: 'Plan Radio Basico',
    description: 'Una radio online',
    price: 19990,
    currency: 'CLP',
    imageUrl: '/uploads/plan.png',
    demoUrl: 'https://demo.casterfly.com',
    interval: 'monthly',
    features: JSON.stringify(['AutoDJ', 'PWA']),
    isActive: true,
    maxDjs: 4,
    services: 'radio',
    onboardingSteps: null,
    menuHiddenKeys: null,
    defaultServerId: null,
    radioStorageQuotaMB: 1024,
    videoStorageQuotaMB: null,
    aiLiveEnabled: false,
    aiMonthlyCharacters: 0,
    aiMusicMinutes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    prices: [{ currency: 'USD', amount: 20 }],
    ...overrides,
  } as any
}

describe('public plans API', () => {
  it('usa el precio USD de PlanPrice', () => {
    expect(planUsdAmount(plan())).toBe(20)
  })

  it('usa el precio base cuando la moneda del plan es USD', () => {
    expect(planUsdAmount(plan({ currency: 'USD', price: 35, prices: [] }))).toBe(35)
  })

  it('devuelve null si el plan no tiene precio USD', () => {
    expect(planUsdAmount(plan({ prices: [] }))).toBeNull()
    expect(toPublicPlanApi(plan({ prices: [] }), 'https://panel.casterfly.com')).toBeNull()
  })

  it('expone el contrato público con imagen absoluta y slug', () => {
    const api = toPublicPlanApi(plan(), 'https://panel.casterfly.com/')
    expect(api).toMatchObject({
      slug: 'plan-radio-basico',
      usdAmount: 20,
      currency: 'USD',
      imageUrl: 'https://panel.casterfly.com/uploads/plan.png',
      contractUrl: 'https://panel.casterfly.com/planes/plan-radio-basico',
      features: ['AutoDJ', 'PWA'],
    })
  })
})
