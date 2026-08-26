'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { Send, Paperclip, FileText, MailWarning } from 'lucide-react'

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
      showToast({ type: 'error', title: 'Elegí al menos un destinatario' })
      return
    }
    if (!templateKey && !subject.trim()) {
      showToast({ type: 'error', title: 'Indicá una plantilla o un asunto' })
      return
    }
    if (!test && recipientType === 'all') {
      const ok = confirm(`¿Enviar a TODOS los clientes con correo (${clients.filter((c) => c.email).length})?`)
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
        showToast({ type: 'error', title: data?.message || data?.error || 'Error al enviar' })
      } else {
        showToast({
          type: 'success',
          title: test ? 'Correo de prueba enviado' : 'Correos enviados',
          description: `${data.sent ?? 0} enviados · ${data.skipped ?? 0} omitidos · ${data.failed ?? 0} fallidos`,
        })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al enviar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Destinatarios */}
      <div>
        <label className="form-label">Destinatarios</label>
        <div className="flex gap-4 mb-3">
          {(['single', 'selected', 'all'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="radio" checked={recipientType === t} onChange={() => setRecipientType(t)} className="accent-cyan-500" />
              {t === 'single' ? 'Un cliente' : t === 'selected' ? 'Varios' : 'Todos'}
            </label>
          ))}
        </div>

        {recipientType !== 'all' && (
          <>
            <input
              className="form-input mb-2"
              placeholder="Buscar por nombre, correo o proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700/60">
              {filtered.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-700/40">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="accent-cyan-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && <p className="p-3 text-sm text-gray-500">Sin resultados</p>}
            </div>
            <p className="text-xs text-gray-500 mt-1">{selected.length} seleccionado{selected.length !== 1 ? 's' : ''}</p>
          </>
        )}
      </div>

      {/* Contenido */}
      <div>
        <label className="form-label">Plantilla (opcional)</label>
        <select className="form-input" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          <option value="">Texto libre</option>
          {templates.map((t) => (
            <option key={t.key} value={t.key} disabled={!t.isActive}>
              {t.name} {!t.isActive && '(desactivada)'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label">Asunto {!templateKey && '*'}</label>
        <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del correo" />
      </div>

      <div>
        <label className="form-label">Mensaje</label>
        <textarea
          className="form-textarea h-40"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Cuerpo del mensaje (puede incluir HTML). Con plantilla 'aviso' se inserta en {{mensaje}}."
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input type="checkbox" checked={attachBoleta} onChange={(e) => setAttachBoleta(e.target.checked)} className="accent-cyan-500" />
        <Paperclip className="h-4 w-4 text-cyan-400" /> Adjuntar boleta (PDF de la cuenta del mes) de cada destinatario
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" size="sm" disabled={sending || testing} onClick={() => doSend(true)}>
          <MailWarning className="h-4 w-4 mr-1" /> {testing ? 'Enviando prueba...' : 'Correo de prueba'}
        </Button>
        <Button size="sm" disabled={sending || testing} onClick={() => doSend(false)}>
          <Send className="h-4 w-4 mr-1" /> {sending ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </div>
  )
}
