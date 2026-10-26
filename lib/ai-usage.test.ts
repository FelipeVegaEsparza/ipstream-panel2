import { describe, expect, it } from 'vitest'
import { buildPeriodRange } from './ai-usage'
import { formatAiMusic, formatAiNumber, formatAiPeriod } from './ai-usage-format'

describe('buildPeriodRange', () => {
  it('incluye el mes actual y los 6 anteriores en orden descendente', () => {
    expect(buildPeriodRange('2026-10')).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
      '2026-06',
      '2026-05',
      '2026-04',
    ])
  })

  it('cruza correctamente el cambio de año', () => {
    expect(buildPeriodRange('2026-02', 3)).toEqual(['2026-02', '2026-01', '2025-12'])
  })

  it('usa el período recibido si es inválido', () => {
    expect(buildPeriodRange('2026-13')).toEqual(['2026-13'])
    expect(buildPeriodRange('octubre')).toEqual(['octubre'])
  })

  it('permite pedir un solo período', () => {
    expect(buildPeriodRange('2026-10', 1)).toEqual(['2026-10'])
  })
})


describe('formato de consumo IA', () => {
  it('formatea números y duraciones', () => {
    expect(formatAiNumber(1234, 'en')).toBe('1,234')
    expect(formatAiMusic(0)).toBe('0 s')
    expect(formatAiMusic(45)).toBe('45 s')
    expect(formatAiMusic(60)).toBe('1 min')
    expect(formatAiMusic(90)).toBe('1 min 30 s')
  })

  it('formatea el período mensual', () => {
    expect(formatAiPeriod('2026-10', 'en')).toContain('2026')
    expect(formatAiPeriod('inválido', 'es')).toBe('inválido')
  })
})
