'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/ui/toast'
import { X, ArrowRightLeft, Radio, MonitorPlay, AlertTriangle } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface MigrateOptions {
  client: { id: string; name: string }
  radioServerId: string | null
  videoServerId: string | null
  hasRadio: boolean
  hasVideo: boolean
  servers: { id: string; name: string; type: string }[]
  canMigrate: boolean
}

interface ClientMigrateModalProps {
  clientId: string
  clientName: string
  open: boolean
  onClose: () => void
  onMigrated?: () => void
}

export function ClientMigrateModal({ clientId, clientName, open, onClose, onMigrated }: ClientMigrateModalProps) {
  const { t } = useDashboardI18n()
  const TYPE_LABEL: Record<string, string> = { radio: t('admin.migrate.typeRadio'), tv: t('admin.migrate.typeTv'), both: t('admin.migrate.typeBoth') }
  const [options, setOptions] = useState<MigrateOptions | null>(null)
  const [services, setServices] = useState<string[]>([])
  const [targetServerId, setTargetServerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setOptions(null)
    setServices([])
    setTargetServerId('')
    setRunning(false)
    setProgress('')
    setError(null)
    fetch(`/api/admin/clients/${clientId}/migrate`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setOptions(d)
        const available: string[] = []
        if (d.hasRadio) available.push('radio')
        if (d.hasVideo) available.push('video')
        setServices(available)
      })
      .catch(() => setError(t('admin.migrate.loadError')))
  }, [open, clientId])

  const serverName = (id: string | null) => {
    if (!id) return '—'
    return options?.servers.find((s) => s.id === id)?.name || t('admin.migrate.unknownServer')
  }

  const targetOptions = options?.servers || []

  const toggleService = (s: string) => {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const run = async () => {
    if (!targetServerId) {
      setError(t('admin.migrate.chooseTarget'))
      return
    }
    if (services.length === 0) {
      setError(t('admin.migrate.chooseService'))
      return
    }
    if (!confirm(t('admin.migrate.confirm'))) return

    setRunning(true)
    setError(null)
    setProgress(t('admin.migrate.copying'))
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services, targetServerId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || data?.error || t('admin.migrate.error'))
      }
      setProgress('')
      showToast({ type: 'success', title: t('admin.migrate.completed'), description: t('admin.migrate.copied', { count: data.copied ?? 0 }) })
      onMigrated?.()
      onClose()
    } catch (err: any) {
      setError(err.message || t('admin.migrate.error'))
      setProgress('')
    } finally {
      setRunning(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-panel border border-border bg-background p-6 ">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-brand" /> {t('admin.migrate.title', { name: clientName })}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!options ? (
          <div className="text-muted-foreground py-6 text-center">{error || t('admin.migrate.loading')}</div>
        ) : !options.canMigrate ? (
          <div className="text-muted-foreground py-6 text-center">
            {t('admin.migrate.notPossible')}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-sm text-muted-foreground">
              {t('admin.migrate.currentRadio')} <span className="text-brand">{serverName(options.radioServerId)}</span>
              <br />
              {t('admin.migrate.currentTv')} <span className="text-brand">{serverName(options.videoServerId)}</span>
            </div>

            <div>
              <p className="text-sm text-foreground font-medium mb-2">{t('admin.migrate.services')}</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={services.includes('radio')}
                    disabled={!options.hasRadio}
                    onChange={() => toggleService('radio')}
                    className="rounded"
                  />
                  <Radio className="h-4 w-4 text-brand" /> Radio {!options.hasRadio && t('admin.migrate.noRadio')}
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={services.includes('video')}
                    disabled={!options.hasVideo}
                    onChange={() => toggleService('video')}
                    className="rounded"
                  />
                  <MonitorPlay className="h-4 w-4 text-brand" /> TV {!options.hasVideo && t('admin.migrate.noTv')}
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm text-foreground font-medium mb-2">{t('admin.migrate.target')}</p>
              <select
                value={targetServerId}
                onChange={(e) => setTargetServerId(e.target.value)}
                className="w-full form-input"
              >
                <option value="">{t('admin.migrate.selectServer')}</option>
                {targetOptions.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === options.radioServerId && s.id === options.videoServerId}>
                    {s.name} ({TYPE_LABEL[s.type] || s.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {t('admin.migrate.warning')}
              </span>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {progress && <p className="text-sm text-brand">{progress}...</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} disabled={running} className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded text-sm">
                {t('common.cancel')}
              </button>
              <button
                onClick={run}
                disabled={running}
                className="px-4 py-2 bg-brand hover:bg-brand disabled:bg-secondary text-white rounded text-sm"
              >
                {running ? t('admin.migrate.migrating') : t('admin.migrate.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
