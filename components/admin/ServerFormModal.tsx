'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'

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

const TYPE_LABEL: Record<string, string> = { radio: 'Solo Radio', tv: 'Solo TV', both: 'Radio + TV' }

export function ServerFormModal({ open, onClose, onSaved, editing }: ServerFormModalProps) {
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
      setError('Completá nombre, URL del agente y hostname público')
      return
    }
    if (!editing && !token.trim()) {
      setError('El token es requerido al crear un servidor')
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
        showToast({ type: 'success', title: editing ? 'Servidor actualizado' : 'Servidor creado' })
        onSaved()
        onClose()
      } else {
        setError(data?.message || data?.error || 'Error al guardar')
      }
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-lg w-full animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/15 flex items-center justify-center">
              {editing ? <Pencil className="h-5 w-5 text-cyan-400" /> : <Plus className="h-5 w-5 text-cyan-400" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{editing ? 'Editar servidor' : 'Agregar servidor (manual)'}</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {editing ? `Editando: ${editing.name}` : 'Registrá un nodo de streaming ya configurado'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Radio VPS 1" />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">URL del agente</label>
                <input className="form-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://node1.example.com:4000" />
              </div>

              <div className="form-group">
                <label className="form-label">Hostname público</label>
                <input className="form-input" value={publicHostname} onChange={(e) => setPublicHostname(e.target.value)} placeholder="stream1.example.com" />
                <p className="text-xs text-gray-400 mt-1">Lo usan los oyentes/espectadores para conectarse</p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  URL pública para oyentes <span className="text-gray-500">(opcional)</span>
                </label>
                <input className="form-input" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="https://stream.midominio.cl" />
                <p className="text-xs text-gray-400 mt-1">
                  Base que verán los oyentes. Ej: <code className="text-cyan-400">https://stream.midominio.cl</code> (vía Caddy con TLS)
                  o <code className="text-cyan-400">http://ip:8000</code> (icecast directo). Vacío = se deriva del hostname.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Token del agente {editing && <span className="text-gray-500">(vacío = no cambiar)</span>}
                </label>
                <input className="form-input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="token del STREAMING_AGENT_TOKEN" />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="flex-1" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servidor'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
