import { describe, expect, it } from 'vitest'
import { weatherLabel } from './label'

describe('weatherLabel', () => {
  it('mapea rangos WMO a español', () => {
    expect(weatherLabel(0)).toBe('Despejado')
    expect(weatherLabel(3)).toBe('Nublado')
    expect(weatherLabel(45)).toBe('Niebla')
    expect(weatherLabel(61)).toBe('Lluvia')
    expect(weatherLabel(71)).toBe('Nieve')
    expect(weatherLabel(95)).toBe('Tormenta')
  })

  it('devuelve null para códigos desconocidos o vacíos', () => {
    expect(weatherLabel(999)).toBeNull()
    expect(weatherLabel(null)).toBeNull()
    expect(weatherLabel(undefined)).toBeNull()
  })
})
