import type { NewsCategory, Pagination } from '@/core/types'

const SPANISH_DAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
] as const

const ENGLISH_TO_SPANISH: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado'
}

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function asObject<T extends object>(
  value: T | null | undefined
): T | null {
  return value && typeof value === 'object' ? value : null
}

export function normalizePagination(
  pagination: Partial<Pagination> | null | undefined
): Pagination {
  const page = Number(pagination?.page) || 1
  const limit = Number(pagination?.limit) || 10
  const total = Number(pagination?.total) || 0
  const pages =
    Number(pagination?.pages) ||
    Number(pagination?.totalPages) ||
    Math.max(1, Math.ceil(total / limit))
  const hasMore =
    pagination?.hasMore ?? (page < pages)
  return { page, limit, total, pages, hasMore, totalPages: pages }
}

export function normalizeWeekDay(
  day: number | string | null | undefined
): string {
  if (day === null || day === undefined) return ''
  if (typeof day === 'number') {
    return SPANISH_DAYS[day] ?? String(day)
  }
  const normalized = day.trim().toLowerCase()
  if (normalized in ENGLISH_TO_SPANISH) {
    return ENGLISH_TO_SPANISH[normalized]
  }
  return day
}

export function getNewsCategory(
  category: NewsCategory | null | undefined
): NewsCategory | null {
  return asObject(category)
}
