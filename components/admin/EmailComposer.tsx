'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { Send, Paperclip, FileText, MailWarning } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Recipient {
  id: string
  name: string
  email: string
  projectName: string
}

interface TemplateOption {
  key: string
  name: string
  isActive: boolean
}

export function EmailComposer() {
  const { t } = useDashboardI18n()
  const [clients, setClients] = useState<Recipient[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [recipientType, setRecipientType] = useState<'single' | 'selected' | 'all'>('single')
  const [templateKey, setTemplateKey] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [attachBoleta, setAttachBoleta] = useState(false)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/emails/clients').then((r) => r.json()),
      fetch('/api/admin/emails/templates').then((r) => r.json()),
    ])
      .then(([c, t]) => {
        setClients(c?.clients || [])
        setTemplates(t?.templates || [])
      })
      .catch(() => {})
  }, [])

  const filtered = clients.filter((c) =>
    `${c.name} ${c.email} ${c.projectName}`.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (recipientType === 'single') return prev[0] === id ? [] : [id]
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  const doSend = async (test: boolean) => {
    if (!test && recipientType !== 'all' && selected.length === 0) {
      showToast({ type: 'error', title: t('admin.emailComposer.chooseRecipient') })
      return
    }
    if (!templateKey && !subject.trim()) {
      showToast({ type: 'error', title: t('admin.emailComposer.chooseTemplateOrSubject') })
      return
    }
    if (!test && recipientType === 'all') {
      const ok = confirm(t('admin.emailComposer.sendAllConfirm', { count: clients.filter((c) => c.email).length }))
      if (!ok) return
    }

    const body: any = {
      recipientType: test ? 'single' : recipientType,
      clientIds: test ? [] : selected,
      templateKey: templateKey || undefined,
      subject: subject.trim() || undefined,
      html: html.trim() || undefined,
      attachBoleta,
      test,
    }

    const setBusy = test ? setTesting : setSending
    setBusy(true)
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast({ type: 'error', title: data?.message || data?.error || t('admin.emailComposer.sendError') })
      } else {
        showToast({
          type: 'success',
          title: test ? t('admin.emailComposer.testSent') : t('admin.emailComposer.sent'),
          description: t('admin.emailComposer.sentSummary', { sent: data.sent ?? 0, skipped: data.skipped ?? 0, failed: data.failed ?? 0 }),
        })
      }
    } catch {
      showToast({ type: 'error', title: t('admin.emailComposer.sendError') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Destinatarios */}
      <div>
        <label className="form-label">{t('admin.emailComposer.recipients')}</label>
        <div className="flex gap-4 mb-3">
          {(['single', 'selected', 'all'] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="radio" checked={recipientType === type} onChange={() => setRecipientType(type)} className="accent-cyan-500" />
              {type === 'single' ? t('admin.emailComposer.single') : type === 'selected' ? t('admin.emailComposer.selected') : t('admin.emailComposer.all')}
            </label>
          ))}
        </div>

        {recipientType !== 'all' && (
          <>
            <input
              className="form-input mb-2"
              placeholder={t('admin.emailComposer.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
              {filtered.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="accent-cyan-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t('admin.emailComposer.noResults')}</p>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selected.length === 1 ? t('admin.emailComposer.selectedCount', { count: selected.length }) : t('admin.emailComposer.selectedCountPlural', { count: selected.length })}</p>
          </>
        )}
      </div>

      {/* Contenido */}
      <div>
        <label className="form-label">{t('admin.emailComposer.template')}</label>
        <select className="form-input" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          <option value="">{t('admin.emailComposer.freeText')}</option>
          {templates.map((tpl) => (
            <option key={tpl.key} value={tpl.key} disabled={!tpl.isActive}>
              {tpl.name} {!tpl.isActive && t('admin.emailComposer.disabled')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label">{t('admin.emailComposer.subject', { hint: !templateKey ? '*' : '' })}</label>
        <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('admin.emailComposer.subjectPlaceholder')} />
      </div>

      <div>
        <label className="form-label">{t('admin.emailComposer.message')}</label>
        <textarea
          className="form-textarea h-40"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder={t('admin.emailComposer.messagePlaceholder')}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={attachBoleta} onChange={(e) => setAttachBoleta(e.target.checked)} className="accent-cyan-500" />
        <Paperclip className="h-4 w-4 text-brand" /> {t('admin.emailComposer.attachReceipt')}
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" size="sm" disabled={sending || testing} onClick={() => doSend(true)}>
          <MailWarning className="h-4 w-4 mr-1" /> {testing ? t('admin.emailComposer.sendingTest') : t('admin.emailComposer.test')}
        </Button>
        <Button size="sm" disabled={sending || testing} onClick={() => doSend(false)}>
          <Send className="h-4 w-4 mr-1" /> {sending ? t('admin.emailComposer.sending') : t('admin.emailComposer.send')}
        </Button>
      </div>
    </div>
  )
}
