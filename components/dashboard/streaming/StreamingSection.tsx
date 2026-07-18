'use client'

import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { StreamingStatusCard } from './StreamingStatusCard'
import { StreamControls } from './StreamControls'

export function StreamingSection() {
  const { status, loading, refresh } = useStreamingStatus({ pollingMs: 5000 })
  const isRunning = !!status?.process?.running

  if (!status?.hasRadioStream) return null

  return (
    <div className="space-y-6">
      <StreamingStatusCard status={status} loading={loading} onRefresh={refresh} />
      <StreamControls isRunning={isRunning} onChange={refresh} />
    </div>
  )
}
