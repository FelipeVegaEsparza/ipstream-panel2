'use client'

// =====================================================
// StreamControls — start / stop / restart
// =====================================================

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  isRunning: boolean
  onChange: () => void  // refresca el status
}

export function StreamControls({ isRunning, onChange }: Props) {
  const { t } = useDashboardI18n()
  const { toast } = useToast()
  const [busy, setBusy] = useState<'start' | 'stop' | 'restart' | null>(null)

  async function call(action: 'start' | 'stop' | 'restart') {
    setBusy(action)
    try {
      const res = await fetch('/api/dashboard/streaming/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error')
      toast({ type: 'success', title: action === 'start' ? t('streaming.controls.started') : action === 'stop' ? t('streaming.controls.stopped') : t('streaming.controls.restarted') })
      onChange()
    } catch (err: any) {
      console.error(err)
      toast({ type: 'error', title: t('streaming.controls.error'), description: err.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="dashboard-panel p-4">
      <h3 className="text-[13px] font-medium text-foreground">{t('streaming.controls.title')}</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={() => call('start')}
          disabled={isRunning || busy !== null}
          className="btn-primary h-9 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('streaming.controls.start')}
        </button>
        <button
          onClick={() => call('stop')}
          disabled={!isRunning || busy !== null}
          className="rounded-control border border-line px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-[color:var(--danger)]/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('streaming.controls.stop')}
        </button>
        <button
          onClick={() => call('restart')}
          disabled={busy !== null}
          className="rounded-control border border-line px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('streaming.controls.restart')}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t('streaming.controls.info')}
      </p>
    </div>
  )
}
