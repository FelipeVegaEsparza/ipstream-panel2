'use client'

import { useState, useEffect } from 'react'

export function PwaSubscribersCard() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/pwa-stats')
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  return (
    <div className="stat-card bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <dt className="truncate text-sm font-medium text-indigo-400 mb-2">
            Instalaciones PWA
          </dt>
          <dd className="text-3xl font-bold tracking-tight text-white">
            {loading ? (
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : error || count === null ? (
              <span className="text-lg font-normal text-gray-500">—</span>
            ) : (
              count
            )}
          </dd>
          <p className="text-xs text-gray-400 mt-1">
            {count === 0 && !loading
              ? 'Sin instalaciones registradas'
              : count === 1
                ? 'dispositivo instaló la PWA'
                : 'dispositivos instalaron la PWA'}
          </p>
        </div>
        <div className="text-indigo-400 opacity-60">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/5 transform rotate-45" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 rounded-full bg-white/5" />
    </div>
  )
}
