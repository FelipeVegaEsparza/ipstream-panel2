'use client'

// =====================================================
// Page — /dashboard/streaming (vista principal)
// =====================================================

import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { StreamingStatusCard } from '@/components/dashboard/streaming/StreamingStatusCard'
import { StreamControls } from '@/components/dashboard/streaming/StreamControls'

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
    </div>
  )
}
