'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Config {
  deepseekKeySet: boolean
  deepseekKeySource: 'db' | 'env' | null
}

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

export function DeepSeekSettings() {
  const { t } = useDashboardI18n()
  const [config, setConfig] = useState<Config | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/app-config', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || t('admin.ai.error'))
      setConfig({
        deepseekKeySet: Boolean(data.deepseekKeySet),
        deepseekKeySource: data.deepseekKeySource === 'db' || data.deepseekKeySource === 'env'
          ? data.deepseekKeySource
          : null,
      })
    } catch (err) {
      showToast({
        type: 'error',
        title: err instanceof Error ? err.message : t('admin.ai.error'),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deepseekApiKey: apiKey.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || t('admin.ai.error'))
      setConfig({
        deepseekKeySet: Boolean(data.deepseekKeySet),
        deepseekKeySource: data.deepseekKeySource === 'db' || data.deepseekKeySource === 'env'
          ? data.deepseekKeySource
          : null,
      })
      setApiKey('')
      showToast({ type: 'success', title: t('admin.ai.saved') })
    } catch (err) {
      showToast({
        type: 'error',
        title: err instanceof Error ? err.message : t('admin.ai.error'),
      })
    } finally {
      setSaving(false)
    }
  }

  const clear = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearDeepSeekApiKey: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || t('admin.ai.error'))
      setConfig({
        deepseekKeySet: Boolean(data.deepseekKeySet),
        deepseekKeySource: data.deepseekKeySource === 'db' || data.deepseekKeySource === 'env'
          ? data.deepseekKeySource
          : null,
      })
      showToast({ type: 'success', title: t('admin.ai.cleared') })
    } catch (err) {
      showToast({
        type: 'error',
        title: err instanceof Error ? err.message : t('admin.ai.error'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('admin.ai.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.ai.subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('admin.ai.loading')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                config?.deepseekKeySet
                  ? 'bg-brand/10 text-brand'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {config?.deepseekKeySet ? t('admin.ai.keySet') : t('admin.ai.keyMissing')}
            </span>
            {config?.deepseekKeySource && (
              <span className="text-muted-foreground">
                {config.deepseekKeySource === 'db'
                  ? t('admin.ai.sourceDb')
                  : t('admin.ai.sourceEnv')}
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('admin.ai.key')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('admin.ai.placeholder')}
              className={input}
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.ai.keyHint')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !apiKey.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t('admin.ai.saving') : t('admin.ai.save')}
            </button>
            {config?.deepseekKeySet && (
              <button
                type="button"
                onClick={() => void clear()}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-brand hover:text-brand disabled:opacity-50"
              >
                {t('admin.ai.clear')}
              </button>
            )}
          </div>

          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
            {t('admin.ai.note')}
          </p>
        </>
      )}
    </div>
  )
}
