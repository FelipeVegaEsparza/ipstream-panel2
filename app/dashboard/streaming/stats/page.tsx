'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface DailyStat {
  date: string
  snapshots: number
  avgListeners: number
  peakListeners: number
}

interface StatsResponse {
  period: string
  from: string
  to: string
  summary: {
    overallAvgListeners: number
    allTimePeakListeners: number
    totalSnapshots: number
  }
  daily: DailyStat[]
}

type Period = 'day' | 'week' | 'month'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: '24 horas' },
  { key: 'week', label: '7 días' },
  { key: 'month', label: '30 días' },
]

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function StreamingStatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('week')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/stats?period=${period}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.message || `Error ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Estadísticas de Oyentes</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Promedio de oyentes</p>
              <p className="text-3xl font-bold text-white">
                {data.summary.overallAvgListeners}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                en el período seleccionado
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Pico máximo histórico</p>
              <p className="text-3xl font-bold text-indigo-400">
                {data.summary.allTimePeakListeners}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                oyentes simultáneos
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Snapshots recolectados</p>
              <p className="text-3xl font-bold text-white">
                {data.summary.totalSnapshots}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                muestras cada 5 minutos
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Oyentes por día</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6',
                  }}
                  labelFormatter={fmtDate}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgListeners"
                  name="Promedio"
                  stroke="#818CF8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="peakListeners"
                  name="Pico"
                  stroke="#F472B6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Desglose diario</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Muestras</th>
                    <th className="px-5 py-3 font-medium">Promedio</th>
                    <th className="px-5 py-3 font-medium">Pico</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                        No hay datos en este período. Los datos empiezan a recolectarse desde el momento del despliegue.
                      </td>
                    </tr>
                  ) : (
                    data.daily.map((row) => (
                      <tr key={row.date} className="border-b border-gray-700/50 text-gray-300 hover:bg-gray-700/30">
                        <td className="px-5 py-3">{fmtDate(row.date)}</td>
                        <td className="px-5 py-3">{row.snapshots}</td>
                        <td className="px-5 py-3">{row.avgListeners}</td>
                        <td className="px-5 py-3 font-medium text-indigo-400">{row.peakListeners}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
