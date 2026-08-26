'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/components/ui/toast'
import { MailWarning, Save, Pencil, X, Plus } from 'lucide-react'

interface Template {
  id: string
  key: string
  name: string
  description: string | null
  subject: string
  htmlBody: string
  isActive: boolean
}

const VARIABLE_HINT = 'Variables: {{nombre}} {{proyecto}} {{plan}} {{monto}} {{moneda}} {{fecha}} {{descripcion}} {{vence}} {{link}} {{mensaje}} {{respuesta}} {{asunto}}'

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<Template>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/emails/templates')
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates || [])
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (t: Template) => {
    setEditing(t)
    setCreating(false)
    setForm({ ...t })
  }

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ key: '', name: '', subject: '', htmlBody: '', isActive: true })
  }

  const reset = () => {
    setEditing(null)
    setCreating(false)
    setForm({})
  }

  const save = async () => {
    if (!form.key || !form.name || !form.subject || !form.htmlBody) {
      showToast({ type: 'error', title: 'Completá key, nombre, asunto y cuerpo' })
      return
    }
    setSaving(true)
    try {
      const url = creating ? '/api/admin/emails/templates' : `/api/admin/emails/templates/${editing!.id}`
      const res = await fetch(url, {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: creating ? 'Plantilla creada' : 'Plantilla actualizada' })
        reset()
        await load()
      } else {
        showToast({ type: 'error', title: data?.message || data?.error || 'Error al guardar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const test = async (t: Template) => {
    setTesting(t.key)
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientType: 'single', templateKey: t.key, test: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) showToast({ type: 'success', title: 'Correo de prueba enviado' })
      else showToast({ type: 'error', title: data?.message || 'Error' })
    } catch {
      showToast({ type: 'error', title: 'Error al enviar prueba' })
    } finally {
      setTesting(null)
    }
  }

  const remove = async (t: Template) => {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return
    const res = await fetch(`/api/admin/emails/templates/${t.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast({ type: 'success', title: 'Plantilla eliminada' })
      await load()
    }
  }

  const toggleActive = async (t: Template) => {
    const res = await fetch(`/api/admin/emails/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{VARIABLE_HINT}</p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nueva plantilla
        </Button>
      </div>

      {(creating || editing) && (
        <div className="rounded-xl border border-cyan-500/30 bg-gray-800/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">{creating ? 'Nueva plantilla' : `Editar: ${editing?.name}`}</h3>
            <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Key (única, minúsculas y guiones)</label>
              <input className="form-input" value={form.key || ''} disabled={!creating} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="aviso" />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Asunto (con {"{{variables}}"})</label>
            <input className="form-input" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Cuerpo HTML (con {"{{variables}}"})</label>
            <textarea className="form-textarea h-52 font-mono text-xs" value={form.htmlBody || ''} onChange={(e) => setForm({ ...form, htmlBody: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-cyan-500" />
            Activa (se usa en envíos automáticos)
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={save}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{t.name}</p>
                <code className="text-xs text-gray-500">/{t.key}</code>
                {t.isActive ? (
                  <Badge className="bg-green-500/15 text-green-400">Activa</Badge>
                ) : (
                  <Badge className="bg-gray-600/30 text-gray-400">Desactivada</Badge>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-1 truncate">Asunto: {t.subject}</p>
              {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => test(t)} disabled={testing === t.key}>
                <MailWarning className="h-3.5 w-3.5 mr-1" /> {testing === t.key ? '...' : 'Probar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleActive(t)}>
                {t.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="text-red-400" onClick={() => remove(t)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-gray-500">No hay plantillas. Creá una nueva.</p>}
      </div>
    </div>
  )
}
