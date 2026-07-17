'use client'

// =====================================================
// Page — /dashboard/streaming (vista principal)
// =====================================================

import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { StreamingStatusCard } from '@/components/dashboard/streaming/StreamingStatusCard'
import { StreamControls } from '@/components/dashboard/streaming/StreamControls'
import Link from 'next/link'

export default function StreamingPage() {
  const { status, loading, refresh } = useStreamingStatus({ pollingMs: 5000 })
  const isRunning = !!status?.process?.running

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Streaming</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gestioná tu radio en vivo: AutoDJ, playlists, biblioteca musical.
        </p>
      </div>

      <StreamingStatusCard status={status} loading={loading} onRefresh={refresh} />

      <StreamControls isRunning={isRunning} onChange={refresh} />

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/streaming/library"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-5 transition block"
        >
          <div className="text-2xl">🎵</div>
          <div className="mt-2 text-white font-medium">Biblioteca</div>
          <div className="text-sm text-gray-400 mt-1">Subí y administrá tu música</div>
        </Link>
        <Link
          href="/dashboard/streaming/playlists"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-5 transition block"
        >
          <div className="text-2xl">📋</div>
          <div className="mt-2 text-white font-medium">Playlists</div>
          <div className="text-sm text-gray-400 mt-1">Creá y organizá tus listas</div>
        </Link>
        <Link
          href="/dashboard/streaming/connection"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-5 transition block"
        >
          <div className="text-2xl">🎙️</div>
          <div className="mt-2 text-white font-medium">Conexión DJ</div>
          <div className="text-sm text-gray-400 mt-1">Datos para transmitir en vivo</div>
        </Link>
      </div>
    </div>
  )
}
