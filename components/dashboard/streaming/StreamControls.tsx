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
    <div className="bg-card rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{t('streaming.controls.title')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => call('start')}
          disabled={isRunning || busy !== null}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-secondary disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          {busy === 'start' ? '⏳' : '▶'} {t('streaming.controls.start')}
        </button>
        <button
          onClick={() => call('stop')}
          disabled={!isRunning || busy !== null}
          className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-secondary disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          {busy === 'stop' ? '⏳' : '⏹'} {t('streaming.controls.stop')}
        </button>
        <button
          onClick={() => call('restart')}
          disabled={busy !== null}
          className="px-4 py-3 bg-brand hover:bg-brand disabled:bg-secondary disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          {busy === 'restart' ? '⏳' : '↻'} {t('streaming.controls.restart')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {t('streaming.controls.info')}
      </p>
    </div>
  )
}
