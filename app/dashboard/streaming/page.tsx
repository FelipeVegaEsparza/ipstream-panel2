'use client'

// =====================================================
// Page — /dashboard/streaming (vista principal)
// =====================================================

import { useState } from 'react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { NowPlayingDisplay } from '@/components/dashboard/streaming/NowPlayingDisplay'
import { StreamControls } from '@/components/dashboard/streaming/StreamControls'
import { PlayHistory } from '@/components/dashboard/streaming/PlayHistory'
import { useToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'

export default function StreamingPage() {
  const { t } = useDashboardI18n()
  const { status, refresh } = useStreamingStatus({ pollingMs: 5000 })
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const isRunning = !!status?.process?.running
  const streamUrl = status?.streamUrl || status?.icecast?.listenurl || null
  // Si streamUrl viene relativa (/radio_xxx) y tenemos dominio público,
  // la convertimos a absoluta para que sea compartible externamente.
  const absoluteStreamUrl = streamUrl && streamUrl.startsWith('/') && process.env.NEXT_PUBLIC_ICE_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_ICE_PUBLIC_URL.replace(/\/$/, '')}${streamUrl}`
    : streamUrl

  const copyUrl = () => {
    if (!streamUrl) return
    navigator.clipboard.writeText(streamUrl)
    setCopied(true)
    toast({ type: 'success', title: t('streaming.urlCopied') })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
   <DashboardPageHeader title={t('streaming.title')} description={t('streaming.subtitle')} />

      <StreamControls isRunning={isRunning} onChange={refresh} />

      {streamUrl && (
        <div className="dashboard-panel p-4">
          <div className="mb-2 text-[11px] font-medium text-muted-foreground">{t('streaming.urlTitle')}</div>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="text"
              readOnly
              value={absoluteStreamUrl ?? ''}
              className="dashboard-metric flex-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-[11px] text-foreground outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <a
              href={absoluteStreamUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary whitespace-nowrap px-4 py-2 text-center text-[12px]"
            >
              {t('streaming.listen')}
            </a>
            <button
              onClick={copyUrl}
              className="whitespace-nowrap rounded-control border border-line bg-transparent px-4 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-3"
            >
              {copied ? t('streaming.copied') : t('streaming.copy')}
            </button>
          </div>
          {isRunning && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-live">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--live)]" />
              {t('streaming.active')}
            </p>
          )}
        </div>
      )}

      <div className="dashboard-panel overflow-hidden">
        <NowPlayingDisplay />
      </div>

      <PlayHistory />
    </div>
  )
}
