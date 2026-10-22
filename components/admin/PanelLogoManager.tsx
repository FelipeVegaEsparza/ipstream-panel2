'use client'

import { useEffect, useState } from 'react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export function PanelLogoManager() {
  const { t } = useDashboardI18n()
  const [logoDarkUrl, setLogoDarkUrl] = useState('')
  const [logoLightUrl, setLogoLightUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/app-config', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setLogoDarkUrl(data.panelLogoDarkUrl || '')
          setLogoLightUrl(data.panelLogoLightUrl || '')
          setFaviconUrl(data.panelFaviconUrl || '')
        }
      } catch {}
      setLoading(false)
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelLogoDarkUrl: logoDarkUrl, panelLogoLightUrl: logoLightUrl, panelFaviconUrl: faviconUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('admin.panelLogo.loadError'))
      setLogoDarkUrl(data.panelLogoDarkUrl || '')
      setLogoLightUrl(data.panelLogoLightUrl || '')
      setFaviconUrl(data.panelFaviconUrl || '')
      window.dispatchEvent(new Event('panel-branding-updated'))
      showToast({ type: 'success', title: t('admin.panelLogo.updated') })
    } catch (err) {
      showToast({ type: 'error', title: err instanceof Error ? err.message : t('admin.panelLogo.loadError') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('admin.panelLogo.loading')}</p>

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('admin.panelLogo.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.panelLogo.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImageUpload
          label={t('admin.panelLogo.dark')}
          description={t('admin.panelLogo.darkHint')}
          value={logoDarkUrl}
          onChange={setLogoDarkUrl}
          onRemove={() => setLogoDarkUrl('')}
        />
        <ImageUpload
          label={t('admin.panelLogo.light')}
          description={t('admin.panelLogo.lightHint')}
          value={logoLightUrl}
          onChange={setLogoLightUrl}
          onRemove={() => setLogoLightUrl('')}
        />
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">{t('admin.panelLogo.favicon')}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('admin.panelLogo.faviconHint')}
        </p>
        <div className="mt-3 max-w-md">
          <ImageUpload
            label={t('admin.panelLogo.faviconLabel')}
            description={t('admin.panelLogo.faviconDescription')}
            value={faviconUrl}
            onChange={setFaviconUrl}
            onRemove={() => setFaviconUrl('')}
            preset="favicon"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[11px] text-muted-foreground">
          {t('admin.panelLogo.saveHint')}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t('admin.panelLogo.saving') : t('admin.panelLogo.save')}
        </button>
      </div>
    </div>
  )
}
