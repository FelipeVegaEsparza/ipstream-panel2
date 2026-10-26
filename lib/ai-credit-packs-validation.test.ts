import { describe, expect, it } from 'vitest'
import { aiCreditPackSchema } from './validations'

describe('aiCreditPackSchema', () => {
  it('acepta un paquete válido y normaliza la moneda', () => {
    const result = aiCreditPackSchema.parse({
      name: 'Pack 500',
      creditType: 'characters',
      amount: 500,
      price: 15,
      currency: 'usd',
    })

    expect(result.currency).toBe('USD')
    expect(result.amount).toBe(500)
  })

  it('rechaza paquetes sin nombre, cantidad o precio válidos', () => {
    for (const input of [
      { name: '', creditType: 'characters', amount: 100, price: 10, currency: 'USD' },
      { name: 'Pack', creditType: 'characters', amount: 0, price: 10, currency: 'USD' },
      { name: 'Pack', creditType: 'characters', amount: 100, price: 0, currency: 'USD' },
      { name: 'Pack', creditType: 'otro', amount: 100, price: 10, currency: 'USD' },
    ]) {
      expect(aiCreditPackSchema.safeParse(input).success).toBe(false)
    }
  })
})
