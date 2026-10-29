'use client'

import { useState, useEffect } from 'react'
import { X, Rocket, KeyRound, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface ProvisionNodeModalProps {
  open: boolean
  onClose: () => void
  onStarted: () => void
}

const EMPTY = {
  name: '',
  type: 'both',
  publicHostname: '',
  sshHost: '',
  sshPort: '22',
  sshUser: 'root',
  sshAuthType: 'key',
  sshPrivateKey: '',
  sshPassword: '',
}

export function ProvisionNodeModal({ open, onClose, onStarted }: ProvisionNodeModalProps) {
  const { t } = useDashboardI18n()
  const TYPE_LABEL: Record<string, string> = { radio: t('admin.serverForm.typeRadio'), tv: t('admin.serverForm.typeTv'), both: t('admin.serverForm.typeBoth') }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setError(null)
    }
  }, [open])

  if (!open) return null

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    const f = form
    if (!f.name.trim() || !f.publicHostname.trim() || !f.sshHost.trim()) {
      setError(t('admin.provisionNode.incomplete'))
      return
    }
    if (f.sshAuthType === 'key' && !f.sshPrivateKey.trim()) {
      setError(t('admin.provisionNode.keyRequired'))
      return
    }
    if (f.sshAuthType === 'password' && !f.sshPassword.trim()) {
      setError(t('admin.provisionNode.passwordRequired'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/servers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name,
          type: f.type,
          publicHostname: f.publicHostname,
          sshHost: f.sshHost,
          sshPort: Number(f.sshPort || 22),
          sshUser: f.sshUser || 'root',
          sshAuthType: f.sshAuthType,
          sshPrivateKey: f.sshAuthType === 'key' ? f.sshPrivateKey : undefined,
          sshPassword: f.sshAuthType === 'password' ? f.sshPassword : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: t('admin.provisionNode.started'), description: t('admin.provisionNode.startedHint') })
        onStarted()
        onClose()
      } else {
        setError(data?.message || data?.error || t('admin.provisionNode.startError'))
      }
    } catch {
      setError(t('admin.provisionNode.startError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 " onClick={onClose} />
      <div className="relative bg-card rounded-container  border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label={t('admin.provisionNode.close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{t('admin.provisionNode.title')}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t('admin.provisionNode.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-brand/90 bg-brand/10 border border-brand/30 rounded-lg p-3">
            <Rocket className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {t('admin.provisionNode.info')}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">{t('admin.provisionNode.serverName')}</label>
                <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Radio VPS 1" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.provisionNode.type')}</label>
                <select className="form-input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.provisionNode.publicHostname')}</label>
                <input className="form-input" value={form.publicHostname} onChange={(e) => set('publicHostname', e.target.value)} placeholder="radio1.midominio.cl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="form-group col-span-2">
                  <label className="form-label">{t('admin.provisionNode.sshHost')}</label>
                  <input className="form-input" value={form.sshHost} onChange={(e) => set('sshHost', e.target.value)} placeholder="1.2.3.4" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.provisionNode.port')}</label>
                  <input className="form-input" type="number" value={form.sshPort} onChange={(e) => set('sshPort', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.provisionNode.sshUser')}</label>
                <input className="form-input" value={form.sshUser} onChange={(e) => set('sshUser', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.provisionNode.auth')}</label>
                <select className="form-input" value={form.sshAuthType} onChange={(e) => set('sshAuthType', e.target.value)}>
                  <option value="key">{t('admin.provisionNode.keyOption')}</option>
                  <option value="password">{t('admin.provisionNode.passwordOption')}</option>
                </select>
              </div>
            </div>

            {form.sshAuthType === 'key' ? (
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> {t('admin.provisionNode.privateKey')}
                </label>
                <textarea
                  className="form-textarea font-mono text-xs h-32"
                  value={form.sshPrivateKey}
                  onChange={(e) => set('sshPrivateKey', e.target.value)}
                  placeholder={`-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----`}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('admin.provisionNode.noPassphrase')}</p>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> {t('admin.provisionNode.password')}
                </label>
                <input className="form-input" type="password" value={form.sshPassword} onChange={(e) => set('sshPassword', e.target.value)} />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" disabled={saving} onClick={handleSubmit}>
              {saving ? t('admin.provisionNode.starting') : t('admin.provisionNode.submit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
