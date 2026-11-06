import { describe, expect, it } from 'vitest'
import { planClpAmount, planUsdAmount, toPublicPlanApi } from './public-plans'

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

  it('usa el precio CLP de PlanPrice o de la moneda base', () => {
    expect(planClpAmount(plan())).toBe(19990)
    expect(planClpAmount(plan({ prices: [{ currency: 'CLP', amount: 17990 }] }))).toBe(17990)
  })

  it('devuelve null si el plan no tiene precio en ninguna moneda', () => {
    const noPrices = plan({ currency: 'EUR', price: 0, prices: [] })
    expect(planUsdAmount(noPrices)).toBeNull()
    expect(planClpAmount(noPrices)).toBeNull()
    expect(toPublicPlanApi(noPrices, 'https://panel.casterfly.com')).toBeNull()
  })

  it('incluye un plan con precio solo en CLP', () => {
    const api = toPublicPlanApi(
      plan({ prices: [{ currency: 'CLP', amount: 19990 }] }),
      'https://panel.casterfly.com'
    )
    expect(api).toMatchObject({
      usdAmount: null,
      clpAmount: 19990,
      currency: 'CLP',
    })
  })

  it('expone el contrato público con imagen absoluta y slug', () => {
    const api = toPublicPlanApi(plan(), 'https://panel.casterfly.com/')
    expect(api).toMatchObject({
      slug: 'plan-radio-basico',
      usdAmount: 20,
      clpAmount: 19990,
      currency: 'USD',
      imageUrl: 'https://panel.casterfly.com/uploads/plan.png',
      contractUrl: 'https://panel.casterfly.com/planes/plan-radio-basico',
      features: ['AutoDJ', 'PWA'],
      aiLiveEnabled: false,
      aiMonthlyCharacters: 0,
      aiMusicMinutes: 0,
    })
  })
})
