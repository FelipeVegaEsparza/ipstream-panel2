import { describe, expect, it, vi } from 'vitest'

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))

vi.mock('./prisma', () => ({
  prisma: {
    client: {
      findUnique,
    },
  },
}))

import { resolveAnalyticsQuery } from './analytics'

describe('resolveAnalyticsQuery', () => {
  it('resolves the same window for every caller of a period', async () => {
    findUnique.mockResolvedValue({ timezone: 'America/Santiago' })
    const now = new Date('2026-11-17T15:00:00.000Z')
    const query = new URLSearchParams({ period: 'week' })

    const summary = await resolveAnalyticsQuery(query, 'client-1', now)
    const series = await resolveAnalyticsQuery(query, 'client-1', now)
    const heatmap = await resolveAnalyticsQuery(query, 'client-1', now)
    const top = await resolveAnalyticsQuery(query, 'client-1', now)
    const exportQuery = await resolveAnalyticsQuery(query, 'client-1', now)

    for (const result of [series, heatmap, top, exportQuery]) {
      expect(result.tz).toBe(summary.tz)
      expect(result.range.from.toISOString()).toBe(summary.range.from.toISOString())
      expect(result.range.to.toISOString()).toBe(summary.range.to.toISOString())
      expect(result.granularity).toBe(summary.granularity)
    }
  })

  it('infers hourly granularity for the day period', async () => {
    findUnique.mockResolvedValue({ timezone: 'UTC' })
    const result = await resolveAnalyticsQuery(
      new URLSearchParams({ period: 'day' }),
      'client-1',
      new Date('2026-11-17T15:00:00.000Z')
    )

    expect(result.granularity).toBe('hour')
  })
})
