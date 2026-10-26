'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/components/ui/toast'
import { MailWarning, Save, Pencil, X, Plus, Sparkles } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t } = useDashboardI18n()
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
      showToast({ type: 'error', title: t('admin.emailTemplates.incomplete') })
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
        showToast({ type: 'success', title: creating ? t('admin.emailTemplates.created') : t('admin.emailTemplates.updated') })
        reset()
        await load()
      } else {
        showToast({ type: 'error', title: data?.message || data?.error || t('admin.emailTemplates.saveError') })
      }
    } catch {
      showToast({ type: 'error', title: t('admin.emailTemplates.saveError') })
    } finally {
      setSaving(false)
    }
  }

  const test = async (tpl: Template) => {
    setTesting(tpl.key)
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientType: 'single', templateKey: tpl.key, test: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) showToast({ type: 'success', title: t('admin.emailTemplates.testSent') })
      else showToast({ type: 'error', title: data?.message || 'Error' })
    } catch {
      showToast({ type: 'error', title: t('admin.emailTemplates.sendTestError') })
    } finally {
      setTesting(null)
    }
  }

  const remove = async (tpl: Template) => {
    if (!confirm(t('admin.emailTemplates.deleteConfirm', { name: tpl.name }))) return
    const res = await fetch(`/api/admin/emails/templates/${tpl.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast({ type: 'success', title: t('admin.emailTemplates.deleted') })
      await load()
    }
  }

  const toggleActive = async (tpl: Template) => {
    const res = await fetch(`/api/admin/emails/templates/${tpl.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !tpl.isActive }),
    })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{VARIABLE_HINT}</p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" /> {t('admin.emailTemplates.new')}
        </Button>
      </div>

      {(creating || editing) && (
        <div className="rounded-xl border border-brand/30 bg-card/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{creating ? t('admin.emailTemplates.new') : t('admin.emailTemplates.editing', { name: editing?.name ?? '' })}</h3>
            <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">{t('admin.emailTemplates.key')}</label>
              <input className="form-input" value={form.key || ''} disabled={!creating} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="aviso" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.emailTemplates.name')}</label>
              <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('admin.emailTemplates.subject')}</label>
            <input className="form-input" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('admin.emailTemplates.body')}</label>
            <textarea className="form-textarea h-52 font-mono text-xs" value={form.htmlBody || ''} onChange={(e) => setForm({ ...form, htmlBody: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-cyan-500" />
            {t('admin.emailTemplates.activeHint')}
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={save}>
              <Save className="h-4 w-4 mr-1" /> {saving ? t('common.saving') : t('admin.emailTemplates.save')}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {[...templates]
          .sort((a, b) => {
            if (a.key === 'bienvenida') return -1
            if (b.key === 'bienvenida') return 1
            return a.key.localeCompare(b.key)
          })
          .map((tpl) => (
          <div key={tpl.id} className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${tpl.key === 'bienvenida' ? 'border-brand/40 bg-brand/5' : 'border-border bg-card/60'}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{tpl.name}</p>
                <code className="text-xs text-muted-foreground">/{tpl.key}</code>
                {tpl.key === 'bienvenida' && (
                  <Badge className="bg-brand/15 text-brand">
                    <Sparkles className="h-3 w-3 mr-1" /> {t('admin.emailTemplates.onPlanPurchase')}
                  </Badge>
                )}
                {tpl.isActive ? (
                  <Badge className="bg-green-500/15 text-green-400">{t('admin.emailTemplates.active')}</Badge>
                ) : (
                  <Badge className="bg-secondary/30 text-muted-foreground">{t('admin.emailTemplates.inactive')}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">{t('admin.emailTemplates.subjectLine', { subject: tpl.subject })}</p>
              {tpl.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => test(tpl)} disabled={testing === tpl.key}>
                <MailWarning className="h-3.5 w-3.5 mr-1" /> {testing === tpl.key ? '...' : t('admin.emailTemplates.test')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleActive(tpl)}>
                {tpl.isActive ? t('admin.emailTemplates.deactivate') : t('admin.emailTemplates.activate')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => startEdit(tpl)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> {t('admin.emailTemplates.edit')}
              </Button>
              <Button size="sm" variant="outline" className="text-red-400" onClick={() => remove(tpl)}>
                {t('admin.emailTemplates.delete')}
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-muted-foreground">{t('admin.emailTemplates.empty')}</p>}
      </div>
    </div>
  )
}
