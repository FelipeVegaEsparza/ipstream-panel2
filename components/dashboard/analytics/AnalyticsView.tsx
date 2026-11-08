'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'

type Service = 'radio' | 'tv'
type Period = 'day' | 'week' | 'month'

interface SummaryData {
  listenersAvg: number
  listenersMax: number
  listenerMinutes: number
  sessions: number
  airtimeSeconds: number
  uniqueListeners: number
  totalBuckets: number
}

interface SummaryResponse {
  granularity: 'hour' | 'day'
  timezone: string
  from: string
  to: string
  summary: SummaryData
  previous: SummaryData
}

interface SeriesPoint {
  bucket: string
  listenersAvg: number
  listenersMax: number
  listenerMinutes: number
  sessions: number
  airtimeSeconds: number
}

interface RankItem {
  label: string
  sublabel?: string | null
  count: number
  seconds?: number
}

const PERIODS: { key: Period; label: 'analytics.period.day' | 'analytics.period.week' | 'analytics.period.month' }[] = [
  { key: 'day', label: 'analytics.period.day' },
  { key: 'week', label: 'analytics.period.week' },
  { key: 'month', label: 'analytics.period.month' },
]

function fmtBucket(bucket: string, granularity: 'hour' | 'day', locale: string) {
  const d = new Date(bucket)
  if (isNaN(d.getTime())) return bucket
  if (granularity === 'hour') {
    return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-CL', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CL', { day: 'numeric', month: 'short' })
}

function fmtMinutes(min: number) {
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtUptime(airtimeSeconds: number, from: string, to: string) {
  const span = (new Date(to).getTime() - new Date(from).getTime()) / 1000
  if (!span || span <= 0) return '—'
  return `${Math.min(100, Math.round((airtimeSeconds / span) * 100))}%`
}

function delta(cur: number, prev: number) {
  if (!prev) return null
  return Math.round(((cur - prev) / prev) * 100)
}

export default function AnalyticsView({ hasRadio, hasTv }: { hasRadio: boolean; hasTv: boolean }) {
  const { t, locale } = useDashboardI18n()
  const dayLabels = Array.from({ length: 7 }, (_, i) => t(`analytics.day.${i}` as 'analytics.day.0' | 'analytics.day.1' | 'analytics.day.2' | 'analytics.day.3' | 'analytics.day.4' | 'analytics.day.5' | 'analytics.day.6'))
  const defaultService: Service = hasRadio ? 'radio' : 'tv'
  const [service, setService] = useState<Service>(defaultService)
  const [period, setPeriod] = useState<Period>('week')
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [points, setPoints] = useState<SeriesPoint[]>([])
  const [rankings, setRankings] = useState<{ title: string; items: RankItem[] }[]>([])
  const [heatmap, setHeatmap] = useState<{ matrix: number[][]; max: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = useCallback(
    (extra: Record<string, string> = {}) => {
      const sp = new URLSearchParams({ service, period, ...extra })
      return sp.toString()
    },
    [service, period]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, serRes, heatRes] = await Promise.all([
        fetch(`/api/dashboard/analytics/summary?${query()}`, { cache: 'no-store' }),
        fetch(`/api/dashboard/analytics/series?${query()}`, { cache: 'no-store' }),
        fetch(`/api/dashboard/analytics/heatmap?${query()}`, { cache: 'no-store' }),
      ])
      if (!sumRes.ok) throw new Error(`Error ${sumRes.status}`)
      setSummary(await sumRes.json())
      setPoints((await serRes.json()).points || [])
      setHeatmap(await heatRes.json())

      const kinds = service === 'radio' ? ['tracks', 'artists', 'djs'] : ['videos']
      const titles: Record<string, string> = {
        tracks: t('analytics.rank.tracks'),
        artists: t('analytics.rank.artists'),
        djs: t('analytics.rank.djs'),
        videos: t('analytics.rank.videos'),
      }
      const rks = await Promise.all(
        kinds.map(async (kind) => {
          const res = await fetch(`/api/dashboard/analytics/top?${query({ kind })}`, { cache: 'no-store' })
          const json = await res.json().catch(() => ({ items: [] }))
          return { title: titles[kind], items: json.items || [] }
        })
      )
      setRankings(rks.filter((r) => r.items.length > 0))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [query, service, t])

  useEffect(() => {
    load()
  }, [load])

  const exportCsv = () => {
    window.location.href = `/api/dashboard/analytics/export?${query()}`
  }

  const s = summary?.summary
  const prev = summary?.previous
  const empty = !loading && points.length === 0

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={t('analytics.title')}
        actions={
          <>
            <div className="flex items-center gap-0.5 rounded-control border border-line p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-[4px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    period === p.key
                      ? 'bg-surface-3 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(p.label)}
                </button>
              ))}
            </div>
            <button
              onClick={exportCsv}
              className="rounded-control border border-line px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3"
            >
              {t('analytics.export')}
            </button>
          </>
        }
      />

      <div className="flex gap-1.5">
        {hasRadio && (
          <button
            onClick={() => setService('radio')}
            className={`rounded-control border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              service === 'radio'
                ? 'border-[color:var(--signal)] text-foreground'
                : 'border-line text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('analytics.service.radio')}
          </button>
        )}
        {hasTv && (
          <button
            onClick={() => setService('tv')}
            className={`rounded-control border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              service === 'tv'
                ? 'border-[color:var(--signal)] text-foreground'
                : 'border-line text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('analytics.service.tv')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[10px] border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2.5 text-[12px] text-danger">
          {error}
        </div>
      )}

      {loading && !summary && (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-[color:var(--text-2)]" />
        </div>
      )}

      {empty && !error && (
        <div className="dashboard-panel p-8 text-center text-[12px] text-muted-foreground">
          {t('analytics.empty')}
        </div>
      )}

      {s && !empty && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Kpi title={t('analytics.kpi.avg')} value={String(s.listenersAvg)} delta={delta(s.listenersAvg, prev?.listenersAvg || 0)} />
            <Kpi title={t('analytics.kpi.peak')} value={String(s.listenersMax)} />
            <Kpi title={t('analytics.kpi.unique')} value={String(s.uniqueListeners)} />
            <Kpi title={t('analytics.kpi.time')} value={fmtMinutes(s.listenerMinutes)} sub={t('analytics.kpi.timeSub')} />
            <Kpi title={t('analytics.kpi.sessions')} value={String(s.sessions)} />
            <Kpi title="Uptime" value={fmtUptime(s.airtimeSeconds, summary!.from, summary!.to)} />
          </div>

          <div className="dashboard-panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-foreground">{t('analytics.audience')}</h2>
              <span className="text-[11px] text-muted-foreground">{t('analytics.timezone', { timezone: summary!.timezone })}</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="bucket" tickFormatter={(v) => fmtBucket(v, summary!.granularity, locale)} stroke="var(--text-3)" fontSize={11} />
                <YAxis stroke="var(--text-3)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    color: 'var(--text-1)',
                  }}
                  labelFormatter={(v) => fmtBucket(String(v), summary!.granularity, locale)}
                />
                <Legend />
                <Line type="monotone" dataKey="listenersAvg" name={t('analytics.kpi.avg')} stroke="var(--text-1)" strokeWidth={1.75} dot={false} />
                <Line type="monotone" dataKey="listenersMax" name={t('analytics.kpi.peak')} stroke="var(--text-3)" strokeWidth={1.75} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {rankings.map((r) => (
              <RankCard key={r.title} title={r.title} items={r.items} />
            ))}
          </div>

          {heatmap && heatmap.max > 0 && (
            <div className="dashboard-panel p-4">
              <h2 className="mb-4 text-[13px] font-medium text-foreground">{t('analytics.heatmap')}</h2>
              <div className="overflow-x-auto">
                <div className="inline-block">
                  {heatmap.matrix.map((row, d) => (
                    <div key={d} className="mb-1 flex items-center gap-1">
                      <span className="w-9 text-[11px] text-muted-foreground">{dayLabels[d]}</span>
                      {row.map((v, h) => (
                        <div
                          key={h}
                          title={`${dayLabels[d]} ${h}:00 — ${Math.round(v)} min`}
                          className="h-4 w-5 rounded-[2px]"
                          style={{ backgroundColor: `color-mix(in srgb, var(--text-3) ${Math.round((v / heatmap.max) * 60)}%, transparent)` }}
                        />
                      ))}
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-1">
                    <span className="w-9" />
                    {Array.from({ length: 24 }).map((_, h) => (
                      <span key={h} className="w-5 text-center text-[9px] text-muted-foreground">
                        {h % 3 === 0 ? h : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ title, value, sub, delta }: { title: string; value: string; sub?: string; delta?: number | null }) {
  return (
    <div className="dashboard-panel p-4">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="dashboard-metric mt-1 text-2xl font-medium text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
      {delta != null && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </p>
      )}
    </div>
  )
}

function RankCard({ title, items }: { title: string; items: RankItem[] }) {
  return (
    <div className="dashboard-panel overflow-hidden">
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
      </div>
      <ul className="divide-y divide-line">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px]">
            <span className="truncate text-foreground">
              <span className="mr-2 text-muted-foreground">{i + 1}.</span>
              {it.label}
              {it.sublabel && <span className="text-muted-foreground"> — {it.sublabel}</span>}
            </span>
            <span className="whitespace-nowrap text-muted-foreground">
              {it.seconds ? fmtMinutes(it.seconds / 60) : `${it.count}×`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
