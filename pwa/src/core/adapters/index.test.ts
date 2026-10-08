import { describe, expect, it } from 'vitest'
import {
  asArray,
  asObject,
  normalizePagination,
  normalizeWeekDay
} from './index'

describe('adapters', () => {
  it('asArray devuelve arrays vacíos ante null o indefinido', () => {
    expect(asArray(null)).toEqual([])
    expect(asArray(undefined)).toEqual([])
    expect(asArray([1, 2])).toEqual([1, 2])
  })

  it('asObject devuelve null ante null o indefinido', () => {
    expect(asObject(null)).toBeNull()
    expect(asObject(undefined)).toBeNull()
    expect(asObject({ a: 1 })).toEqual({ a: 1 })
  })

  it('normalizePagination calcula totalPages y hasMore', () => {
    const result = normalizePagination({ page: 1, limit: 10, total: 25, pages: 3 })
    expect(result).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      pages: 3,
      totalPages: 3,
      hasMore: true
    })
  })

  it('normalizePagination soporta el shape alternativo totalPages', () => {
    const result = normalizePagination({ page: 2, limit: 10, total: 25, totalPages: 3 })
    expect(result.totalPages).toBe(3)
    expect(result.pages).toBe(3)
  })

  it('normalizePagination devuelve defaults vacíos ante null', () => {
    const result = normalizePagination(null)
    expect(result).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1,
      totalPages: 1,
      hasMore: false
    })
  })

  it('normalizeWeekDay convierte números 0=Domingo … 6=Sábado', () => {
    expect(normalizeWeekDay(0)).toBe('Domingo')
    expect(normalizeWeekDay(3)).toBe('Miércoles')
    expect(normalizeWeekDay(6)).toBe('Sábado')
  })

  it('normalizeWeekDay convierte strings en inglés', () => {
    expect(normalizeWeekDay('monday')).toBe('Lunes')
    expect(normalizeWeekDay('SUNDAY')).toBe('Domingo')
  })
})
