import { prisma } from '@/lib/prisma'
import { aiPeriod, getAiLiveAccess } from '@/lib/ai-live'
import { getAiMusicAccess } from '@/lib/ai-music'

export const AI_USAGE_FEATURES = [
  'live-locution',
  'live-announce',
  'autodj-presenter',
  'ai-capsule',
  'ai-jingle',
] as const

export type AiUsageFeature = (typeof AI_USAGE_FEATURES)[number]
export const AI_USAGE_UNATTRIBUTED = 'unattributed'
export type AiUsageFeatureKey = AiUsageFeature | typeof AI_USAGE_UNATTRIBUTED

export interface AiUsageTotals {
  characters: number
  musicSeconds: number
  requests: number
}

export interface AiUsageFeatureTotals extends AiUsageTotals {
  feature: string
}

export interface AiUsageFeatureUsage extends AiUsageTotals {
  feature: AiUsageFeatureKey
}

export interface AiUsageMonth extends AiUsageTotals {
  period: string
}

export interface AiUsageQuota {
  enabled: boolean
  limit: number
  used: number
  remaining: number
}

export interface AiMusicQuota {
  enabled: boolean
  limitSeconds: number
  usedSeconds: number
  remainingSeconds: number
}

export interface ClientAiUsageOverview {
  currentPeriod: string
  periods: string[]
  quotas: {
    characters: AiUsageQuota
    music: AiMusicQuota
  }
  current: AiUsageTotals & {
    breakdown: AiUsageFeatureUsage[]
  }
  history: AiUsageMonth[]
}

export interface AdminAiUsageClient extends AiUsageTotals {
  clientId: string
  name: string
}

export interface AdminAiUsageOverview {
  currentPeriod: string
  periods: string[]
  current: AiUsageTotals & {
    breakdown: AiUsageFeatureUsage[]
  }
  clients: AdminAiUsageClient[]
  history: AiUsageMonth[]
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function emptyAiUsageTotals(): AiUsageTotals {
  return { characters: 0, musicSeconds: 0, requests: 0 }
}

/** Devuelve el mes actual y los `count - 1` meses anteriores, en orden descendente. */
export function buildPeriodRange(currentPeriod: string, count = 7): string[] {
  if (!PERIOD_PATTERN.test(currentPeriod) || count < 1) return [currentPeriod]
  const [year, month] = currentPeriod.split('-').map(Number)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1))
    return date.toISOString().slice(0, 7)
  })
}

export function buildFeatureBreakdown(
  totals: AiUsageTotals,
  rows: AiUsageFeatureTotals[]
): AiUsageFeatureUsage[] {
  const byFeature = new Map(rows.map((row) => [row.feature, row]))
  const breakdown: AiUsageFeatureUsage[] = AI_USAGE_FEATURES.map((feature) => {
    const row = byFeature.get(feature)
    return {
      feature,
      characters: row?.characters ?? 0,
      musicSeconds: row?.musicSeconds ?? 0,
      requests: row?.requests ?? 0,
    }
  })

  const detailed = breakdown.reduce(
    (acc, row) => ({
      characters: acc.characters + row.characters,
      musicSeconds: acc.musicSeconds + row.musicSeconds,
      requests: acc.requests + row.requests,
    }),
    emptyAiUsageTotals()
  )

  const unattributed: AiUsageFeatureUsage = {
    feature: AI_USAGE_UNATTRIBUTED,
    characters: Math.max(0, totals.characters - detailed.characters),
    musicSeconds: Math.max(0, totals.musicSeconds - detailed.musicSeconds),
    requests: Math.max(0, totals.requests - detailed.requests),
  }

  if (
    unattributed.characters > 0 ||
    unattributed.musicSeconds > 0 ||
    unattributed.requests > 0
  ) {
    breakdown.push(unattributed)
  }

  return breakdown
}

export function aggregateMonthlyTotals(
  rows: Array<{ period: string } & AiUsageTotals>,
  periods: string[]
): AiUsageMonth[] {
  const byPeriod = new Map<string, AiUsageTotals>()
  for (const row of rows) {
    const current = byPeriod.get(row.period) ?? emptyAiUsageTotals()
    byPeriod.set(row.period, {
      characters: current.characters + row.characters,
      musicSeconds: current.musicSeconds + row.musicSeconds,
      requests: current.requests + row.requests,
    })
  }

  return periods.map((period) => ({
    period,
    ...(byPeriod.get(period) ?? emptyAiUsageTotals()),
  }))
}

export function buildClientRanking(
  rows: Array<{ clientId: string } & AiUsageTotals>,
  names: Map<string, string>
): AdminAiUsageClient[] {
  const byClient = new Map<string, AiUsageTotals>()
  for (const row of rows) {
    const current = byClient.get(row.clientId) ?? emptyAiUsageTotals()
    byClient.set(row.clientId, {
      characters: current.characters + row.characters,
      musicSeconds: current.musicSeconds + row.musicSeconds,
      requests: current.requests + row.requests,
    })
  }

  return Array.from(byClient.entries())
    .map(([clientId, totals]) => ({
      clientId,
      name: names.get(clientId) ?? clientId,
      ...totals,
    }))
    .filter(
      (client) =>
        client.characters > 0 || client.musicSeconds > 0 || client.requests > 0
    )
    .sort(
      (a, b) =>
        b.characters - a.characters ||
        b.musicSeconds - a.musicSeconds ||
        a.name.localeCompare(b.name)
    )
}

type FeatureGroupRow = {
  feature: string
  _sum: { characters: number | null; musicSeconds: number | null }
  _count: { _all: number }
}

function mapFeatureGroups(rows: FeatureGroupRow[]): AiUsageFeatureTotals[] {
  return rows.map((row) => ({
    feature: row.feature,
    characters: row._sum.characters ?? 0,
    musicSeconds: row._sum.musicSeconds ?? 0,
    requests: row._count._all ?? 0,
  }))
}

async function loadClientNames(clientIds: string[]): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map()
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: {
      id: true,
      name: true,
      basicData: { select: { projectName: true } },
    },
  })

  return new Map(
    clients.map((client) => [
      client.id,
      client.basicData?.projectName?.trim() || client.name,
    ])
  )
}

export async function getClientAiUsage(clientId: string): Promise<ClientAiUsageOverview> {
  const currentPeriod = aiPeriod()
  const periods = buildPeriodRange(currentPeriod)
  const [rows, featureGroups, charAccess, musicAccess] = await Promise.all([
    prisma.aiTtsUsage.findMany({
      where: { clientId, period: { in: periods } },
      select: {
        period: true,
        characters: true,
        musicSeconds: true,
        requests: true,
      },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ['feature'],
      where: { clientId, period: currentPeriod },
      _sum: { characters: true, musicSeconds: true },
      _count: { _all: true },
    }),
    getAiLiveAccess(clientId),
    getAiMusicAccess(clientId),
  ])

  const currentRow = rows.find((row) => row.period === currentPeriod)
  const currentTotals: AiUsageTotals = currentRow
    ? {
        characters: currentRow.characters,
        musicSeconds: currentRow.musicSeconds,
        requests: currentRow.requests,
      }
    : emptyAiUsageTotals()

  return {
    currentPeriod,
    periods,
    quotas: {
      characters: {
        enabled: charAccess.enabled,
        limit: charAccess.limit,
        used: charAccess.used,
        remaining: charAccess.remaining,
      },
      music: {
        enabled: musicAccess.enabled,
        limitSeconds: musicAccess.limitSeconds,
        usedSeconds: musicAccess.usedSeconds,
        remainingSeconds: musicAccess.remainingSeconds,
      },
    },
    current: {
      ...currentTotals,
      breakdown: buildFeatureBreakdown(currentTotals, mapFeatureGroups(featureGroups)),
    },
    history: aggregateMonthlyTotals(rows, periods),
  }
}

export async function getAdminAiUsage(): Promise<AdminAiUsageOverview> {
  const currentPeriod = aiPeriod()
  const periods = buildPeriodRange(currentPeriod)
  const [totalsRows, featureGroups] = await Promise.all([
    prisma.aiTtsUsage.findMany({
      where: { period: { in: periods } },
      select: {
        clientId: true,
        period: true,
        characters: true,
        musicSeconds: true,
        requests: true,
      },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ['feature'],
      where: { period: currentPeriod },
      _sum: { characters: true, musicSeconds: true },
      _count: { _all: true },
    }),
  ])

  const currentRows = totalsRows.filter((row) => row.period === currentPeriod)
  const currentTotals = currentRows.reduce<AiUsageTotals>(
    (acc, row) => ({
      characters: acc.characters + row.characters,
      musicSeconds: acc.musicSeconds + row.musicSeconds,
      requests: acc.requests + row.requests,
    }),
    emptyAiUsageTotals()
  )
  const names = await loadClientNames(
    Array.from(new Set(currentRows.map((row) => row.clientId)))
  )

  return {
    currentPeriod,
    periods,
    current: {
      ...currentTotals,
      breakdown: buildFeatureBreakdown(currentTotals, mapFeatureGroups(featureGroups)),
    },
    clients: buildClientRanking(currentRows, names),
    history: aggregateMonthlyTotals(totalsRows, periods),
  }
}
