'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TvStatus {
  status: string // "off" | "autodj" | "live"
  streamKey: string
  encoder: { status: string; startedAt: string | null; currentTrack: string | null }
  dj: { active: boolean; streamKey: string | null; connectedAt: string | null }
}

function formatDuration(startedAt: string | null | undefined): string | null {
  if (!startedAt) return null
  const ts = new Date(startedAt).getTime()
  if (isNaN(ts)) return null
  const elapsed = Math.floor((Date.now() - ts) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  return `${h}h ${m}m`
}

export function NowPlayingTvDisplay() {
  const [status, setStatus] = useState<TvStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/dashboard/television/status', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (active) setStatus(data)
        }
      } catch {
        // silencioso
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (loading && !status) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-6 md:p-8 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-32 mb-6" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-700 rounded w-16" />
            <div className="h-5 bg-gray-700 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  // Ocultar si no hay transmisión (igual que radio cuando el AutoDJ está off)
  if (!status || status.status === 'off') return null

  const isLive = status.dj?.active || status.status === 'live'
  const currentTrack = status.encoder?.currentTrack
  const duration = formatDuration(status.encoder?.startedAt)
  const djDuration = formatDuration(status.dj?.connectedAt)

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        {isLive ? (
          <span className="relative flex w-4 h-4">
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
            <span className="relative rounded-full w-4 h-4 bg-green-500" />
          </span>
        ) : (
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20" />
        )}
        <span className={`${isLive ? 'text-green-400' : 'text-gray-300'} font-semibold text-sm uppercase tracking-wider`}>
          {isLive ? 'EN VIVO · TV' : 'AutoDJ · TV'}
        </span>
        {!isLive && duration && <span className="text-gray-500 text-xs font-mono">{duration} al aire</span>}
        {isLive && djDuration && <span className="text-gray-500 text-xs font-mono">desde hace {djDuration}</span>}
        <Link href="/dashboard/television" className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 shrink-0">
          Ver TV →
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-lg bg-gray-900 shrink-0 ring-1 ring-white/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zm6 2h-2m-2 0h2" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium mb-1">Ahora en TV</div>
          <p className="text-white font-semibold truncate text-sm md:text-base">
            {currentTrack || (isLive ? 'Transmisión en vivo' : 'Iniciando...')}
          </p>
          {isLive && <p className="text-gray-400 text-xs truncate mt-0.5">Señal en vivo (OBS)</p>}
        </div>
      </div>
    </div>
  )
}
