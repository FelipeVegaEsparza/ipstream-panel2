'use client'

import { useEffect, useState } from 'react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { showToast } from '@/components/ui/toast'

export function PanelLogoManager() {
  const [logoDarkUrl, setLogoDarkUrl] = useState('')
  const [logoLightUrl, setLogoLightUrl] = useState('')
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
        body: JSON.stringify({ panelLogoDarkUrl: logoDarkUrl, panelLogoLightUrl: logoLightUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudieron guardar los logos')
      setLogoDarkUrl(data.panelLogoDarkUrl || '')
      setLogoLightUrl(data.panelLogoLightUrl || '')
      window.dispatchEvent(new Event('panel-branding-updated'))
      showToast({ type: 'success', title: 'Logo del panel actualizado' })
    } catch (err) {
      showToast({ type: 'error', title: err instanceof Error ? err.message : 'No se pudieron guardar los logos' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando logos…</p>

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Logo del panel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se usa en el panel de administración y en el dashboard de clientes. La imagen cambia
          automáticamente según el tema oscuro o claro del usuario. No afecta los logos de los sitios de radio.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImageUpload
          label="Logo para modo oscuro"
          description="Idealmente blanco o claro para destacar sobre el fondo oscuro."
          value={logoDarkUrl}
          onChange={setLogoDarkUrl}
          onRemove={() => setLogoDarkUrl('')}
        />
        <ImageUpload
          label="Logo para modo claro"
          description="Idealmente oscuro o a color para destacar sobre el fondo claro."
          value={logoLightUrl}
          onChange={setLogoLightUrl}
          onRemove={() => setLogoLightUrl('')}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[11px] text-muted-foreground">
          Si falta uno de los dos, se usa el otro o el logo histórico del panel.
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar logos'}
        </button>
      </div>
    </div>
  )
}
