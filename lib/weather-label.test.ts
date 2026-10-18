import { describe, expect, it } from 'vitest'
import { weatherLabel, weatherPhrase } from './weather-label'

describe('weather labels', () => {
  it('traduce códigos WMO', () => {
    expect(weatherLabel(0)).toBe('Despejado')
    expect(weatherLabel(3)).toBe('Nublado')
    expect(weatherLabel(61)).toBe('Lluvia')
    expect(weatherLabel(95)).toBe('Tormenta')
    expect(weatherLabel(999)).toBeNull()
  })

  it('genera frases naturales para la locución', () => {
    expect(weatherPhrase(0)).toBe('cielo despejado')
    expect(weatherPhrase(2)).toBe('cielo parcialmente nublado')
    expect(weatherPhrase(61)).toBe('lluvia')
    expect(weatherPhrase(999)).toBe('condiciones variables')
  })
})
