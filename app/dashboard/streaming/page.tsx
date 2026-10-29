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
    <div className="dashboard-panel p-5">
          <div className="flex items-center gap-2 mb-3">
      <svg className="h-4 w-4 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm font-semibold text-muted-foreground">{t('streaming.urlTitle')}</span>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={absoluteStreamUrl ?? ''}
       className="dashboard-metric flex-1 rounded-control border border-line bg-surface-2 px-3 py-2.5 text-xs text-foreground outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <a
              href={absoluteStreamUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
       className="rounded-control bg-signal px-5 py-2.5 text-center text-xs font-medium text-white transition-colors hover:brightness-110 whitespace-nowrap"
            >
              {t('streaming.listen')}
            </a>
            <button
              onClick={copyUrl}
       className="rounded-control border border-line bg-surface-3 px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 whitespace-nowrap"
            >
              {copied ? t('streaming.copied') : t('streaming.copy')}
            </button>
          </div>
          {isRunning && (
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[color:var(--live)]">
       <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--live)]" />
              {t('streaming.active')}
            </p>
          )}
        </div>
      )}

      <NowPlayingDisplay />

      <PlayHistory />
    </div>
  )
}
