'use client'

import { useEffect, useState } from 'react'
import { Headphones, HardDrive, Crown } from 'lucide-react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'

interface OverviewPlan {
  name: string
  services: string
  interval: string
  price: number
  currency: string
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
}

interface OverviewStorage {
  totalMB: number
  quotaMB: number | null
  percentUsed: number | null
  exceeded: boolean
}

interface DashboardOverviewCardsProps {
  plan: OverviewPlan | null
  usageRadio: OverviewStorage | null
  usageVideo: OverviewStorage | null
}

interface TvStatusWithViewers {
  status?: string
  viewers?: number
}

function fmtMB(mb: number | null | undefined) {
  if (mb === null || mb === undefined) return 'Ilimitado'
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

function fmtCurrency(price: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

export function DashboardOverviewCards({ plan, usageRadio, usageVideo }: DashboardOverviewCardsProps) {
  const { status } = useStreamingStatus({ pollingMs: 5000 })
  const [tvViewers, setTvViewers] = useState<number>(0)

  const hasRadio = plan?.services === 'radio' || plan?.services === 'both'
  const hasTv = plan?.services === 'tv' || plan?.services === 'both'

  useEffect(() => {
    if (!hasTv) return
    let active = true
    const fetchTv = async () => {
      try {
        const res = await fetch('/api/dashboard/television/status', { cache: 'no-store' })
        if (res.ok) {
          const data: TvStatusWithViewers = await res.json()
          if (active) setTvViewers(data.viewers ?? 0)
        }
      } catch {
        // silencioso
      }
    }
    fetchTv()
    const id = setInterval(fetchTv, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [hasTv])

  const radioListeners = status?.icecast?.listeners ?? 0
  const planLabel = plan
    ? plan.services === 'radio'
      ? 'Solo Radio'
      : plan.services === 'tv'
        ? 'Solo TV'
        : 'Radio + TV'
    : null

  const storageItems: { label: string; used: OverviewStorage | null; quota: number | null }[] = []
  if (hasRadio) storageItems.push({ label: 'Radio', used: usageRadio, quota: plan?.radioStorageQuotaMB ?? null })
  if (hasTv) storageItems.push({ label: 'TV', used: usageVideo, quota: plan?.videoStorageQuotaMB ?? null })

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Oyentes en vivo */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl border border-gray-700/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Headphones className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-white">Oyentes en vivo</h3>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-2xl font-bold text-white">{radioListeners}</div>
            <div className="text-xs text-gray-400">Radio</div>
          </div>
          {hasTv && (
            <div>
              <div className="text-2xl font-bold text-white">{tvViewers}</div>
              <div className="text-xs text-gray-400">TV</div>
            </div>
          )}
        </div>
        {!hasRadio && !hasTv && <p className="text-xs text-gray-500 mt-1">Tu plan no incluye streaming</p>}
      </div>

      {/* Almacenamiento */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl border border-gray-700/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-white">Almacenamiento</h3>
        </div>
        {storageItems.length === 0 ? (
          <p className="text-xs text-gray-500">Tu plan no incluye almacenamiento</p>
        ) : (
          <div className="space-y-3">
            {storageItems.map((item) => {
              const usedMB = item.used?.totalMB ?? 0
              const quotaMB = item.quota ?? item.used?.quotaMB ?? null
              const pct = item.used?.percentUsed ?? (quotaMB ? Math.min(100, (usedMB / quotaMB) * 100) : null)
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-medium">
                      {fmtMB(usedMB)} / {fmtMB(quotaMB)}
                    </span>
                  </div>
                  {quotaMB !== null && pct !== null && (
                    <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.used?.exceeded ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Plan contratado */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl border border-gray-700/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-white">Mi Plan</h3>
        </div>
        {plan ? (
          <>
            <div className="text-2xl font-bold text-white">{plan.name}</div>
            <div className="text-xs text-gray-400 mt-1">
              {plan.interval === 'monthly' ? 'Mensual' : 'Anual'}
              {planLabel ? ` · ${planLabel}` : ''}
            </div>
            <div className="text-sm text-cyan-300 font-semibold mt-2">
              {fmtCurrency(plan.price, plan.currency)}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">
            Sin plan asignado.{' '}
            <span className="text-cyan-400">Contactá al soporte para activar tu plan.</span>
          </p>
        )}
      </div>
    </div>
  )
}
