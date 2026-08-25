'use client'

import { useState, useEffect } from 'react'
import { X, Rocket, KeyRound, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'

interface ProvisionNodeModalProps {
  open: boolean
  onClose: () => void
  onStarted: () => void
}

const TYPE_LABEL: Record<string, string> = { radio: 'Solo Radio', tv: 'Solo TV', both: 'Radio + TV' }

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
      setError('Completá nombre, hostname público y host SSH')
      return
    }
    if (f.sshAuthType === 'key' && !f.sshPrivateKey.trim()) {
      setError('Pegá la clave privada SSH')
      return
    }
    if (f.sshAuthType === 'password' && !f.sshPassword.trim()) {
      setError('Ingresá el password SSH')
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
        showToast({ type: 'success', title: 'Provisioning iniciado', description: 'Se ejecuta en segundo plano' })
        onStarted()
        onClose()
      } else {
        setError(data?.message || data?.error || 'Error al iniciar provisioning')
      }
    } catch {
      setError('Error al iniciar provisioning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Provisionar nodo de streaming</h3>
              <p className="text-sm text-gray-400 mt-0.5">El panel configura el VPS nuevo automáticamente por SSH</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-cyan-300/90 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
            <Rocket className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Se instalará Docker, se subirá el código, se escribirá el .env y se levantará el stack.
              La clave SSH se guarda encriptada. Después podés quitarla desde este panel.
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Nombre del servidor</label>
                <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Radio VPS 1" />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hostname público (oyentes)</label>
                <input className="form-input" value={form.publicHostname} onChange={(e) => set('publicHostname', e.target.value)} placeholder="radio1.midominio.cl" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="form-group col-span-2">
                  <label className="form-label">Host SSH (IP)</label>
                  <input className="form-input" value={form.sshHost} onChange={(e) => set('sshHost', e.target.value)} placeholder="1.2.3.4" />
                </div>
                <div className="form-group">
                  <label className="form-label">Puerto</label>
                  <input className="form-input" type="number" value={form.sshPort} onChange={(e) => set('sshPort', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Usuario SSH</label>
                <input className="form-input" value={form.sshUser} onChange={(e) => set('sshUser', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Autenticación</label>
                <select className="form-input" value={form.sshAuthType} onChange={(e) => set('sshAuthType', e.target.value)}>
                  <option value="key">Clave privada</option>
                  <option value="password">Password</option>
                </select>
              </div>
            </div>

            {form.sshAuthType === 'key' ? (
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-gray-400" /> Clave privada SSH
                </label>
                <textarea
                  className="form-textarea font-mono text-xs h-32"
                  value={form.sshPrivateKey}
                  onChange={(e) => set('sshPrivateKey', e.target.value)}
                  placeholder={`-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----`}
                />
                <p className="text-xs text-gray-400 mt-1">Sin passphrase (SSH no puede pedirla interactivamente)</p>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-gray-400" /> Password SSH
                </label>
                <input className="form-input" type="password" value={form.sshPassword} onChange={(e) => set('sshPassword', e.target.value)} />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Iniciando...' : 'Provisionar nodo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
