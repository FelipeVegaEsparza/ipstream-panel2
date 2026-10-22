'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export interface EditableServer {
  id: string
  name: string
  type: string
  baseUrl: string
  publicHostname: string
  publicUrl?: string | null
}

interface ServerFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: EditableServer | null
}

export function ServerFormModal({ open, onClose, onSaved, editing }: ServerFormModalProps) {
  const { t } = useDashboardI18n()
  const TYPE_LABEL: Record<string, string> = { radio: t('admin.serverForm.typeRadio'), tv: t('admin.serverForm.typeTv'), both: t('admin.serverForm.typeBoth') }
  const [name, setName] = useState('')
  const [type, setType] = useState('both')
  const [baseUrl, setBaseUrl] = useState('')
  const [publicHostname, setPublicHostname] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(editing?.name || '')
      setType(editing?.type || 'both')
      setBaseUrl(editing?.baseUrl || '')
      setPublicHostname(editing?.publicHostname || '')
      setPublicUrl(editing?.publicUrl || '')
      setToken('')
      setError(null)
    }
  }, [open, editing])

  if (!open) return null

  const handleSubmit = async () => {
    if (!name.trim() || !baseUrl.trim() || !publicHostname.trim()) {
      setError(t('admin.serverForm.incomplete'))
      return
    }
    if (!editing && !token.trim()) {
      setError(t('admin.serverForm.tokenRequired'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/admin/servers/${editing.id}` : '/api/admin/servers'
      const body: any = {
        name: name.trim(),
        type,
        baseUrl: baseUrl.trim(),
        publicHostname: publicHostname.trim(),
      }
      if (publicUrl.trim()) body.publicUrl = publicUrl.trim()
      if (token.trim()) body.token = token.trim()
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: editing ? t('admin.serverForm.updated') : t('admin.serverForm.created') })
        onSaved()
        onClose()
      } else {
        setError(data?.message || data?.error || t('admin.serverForm.saveError'))
      }
    } catch {
      setError(t('admin.serverForm.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border max-w-lg w-full animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label={t('admin.serverForm.close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center">
              {editing ? <Pencil className="h-5 w-5 text-brand" /> : <Plus className="h-5 w-5 text-brand" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{editing ? t('admin.serverForm.editTitle') : t('admin.serverForm.addTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {editing ? t('admin.serverForm.editing', { name: editing.name }) : t('admin.serverForm.addHint')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label className="form-label">{t('admin.serverForm.name')}</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Radio VPS 1" />
              </div>

              <div className="form-group">
                <label className="form-label">{t('admin.serverForm.type')}</label>
                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('admin.serverForm.agentUrl')}</label>
                <input className="form-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://node1.example.com:4000" />
              </div>

              <div className="form-group">
                <label className="form-label">{t('admin.serverForm.publicHostname')}</label>
                <input className="form-input" value={publicHostname} onChange={(e) => setPublicHostname(e.target.value)} placeholder="stream1.example.com" />
                <p className="text-xs text-muted-foreground mt-1">{t('admin.serverForm.publicHostnameHint')}</p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('admin.serverForm.publicUrl')} <span className="text-muted-foreground">{t('admin.serverForm.optional')}</span>
                </label>
                <input className="form-input" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="https://stream.midominio.cl" />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.serverForm.publicUrlHint1')} <code className="text-brand">https://stream.example.com</code> {t('admin.serverForm.publicUrlHint2')}
                  <code className="text-brand">http://ip:8000</code> {t('admin.serverForm.publicUrlHint3')}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('admin.serverForm.token')} {editing && <span className="text-muted-foreground">{t('admin.serverForm.tokenUnchanged')}</span>}
                </label>
                <input className="form-input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="token del STREAMING_AGENT_TOKEN" />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" disabled={saving} onClick={handleSubmit}>
              {saving ? t('common.saving') : editing ? t('admin.serverForm.saveChanges') : t('admin.serverForm.create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
