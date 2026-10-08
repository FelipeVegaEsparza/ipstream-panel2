import { describe, expect, it } from 'vitest'
import { episodeMeta, formatDuration, toFiniteNumber } from './format'

describe('format helpers', () => {
  it('formatDuration nunca devuelve NaN', () => {
    expect(formatDuration('abc')).toBe('')
    expect(formatDuration(null)).toBe('')
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(45)).toBe('45 min')
  })

  it('toFiniteNumber filtra no numéricos', () => {
    expect(toFiniteNumber('abc')).toBeNull()
    expect(toFiniteNumber(NaN)).toBeNull()
    expect(toFiniteNumber('2')).toBe(2)
  })

  it('episodeMeta no imprime NaN', () => {
    const meta = episodeMeta('abc', null, 'abc')
    expect(meta).toBe('')
    expect(meta).not.toContain('NaN')
    expect(episodeMeta(2, 5, 45)).toBe('Temporada 2 · Ep. 5 · 45 min')
  })
})
