'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface DjSlotInfo {
  id: string
  name: string
  mount: string
  priority: number
  role: string
  isActive: boolean
  connected: boolean
  onAir: boolean
}

interface DjSession {
  id: string
  djId: string
  mount: string
  role: string
  ipAddress: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño — interrumpe a todos',
  host: 'Locutor — interrumpido por owner, interrumpe a guest',
  guest: 'Invitado — solo si nadie más conectó',
}

const ROLE_LABELS_EN: Record<string, string> = {
  owner: 'Owner — interrupts everyone',
  host: 'Host — interrupted by owner, interrupts guest',
  guest: 'Guest — only if nobody else connected',
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 3, host: 2, guest: 1,
}

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-red-900/50 text-red-300',
  host: 'bg-blue-900/50 text-brand',
  guest: 'bg-secondary text-muted-foreground',
}

export default function ConnectionPage() {
  const { t, locale } = useDashboardI18n()
  const roleLabels = locale === 'en' ? ROLE_LABELS_EN : ROLE_LABELS
  const { status } = useStreamingStatus({ pollingMs: 10000 })

  const [connectionInfo, setConnectionInfo] = useState<{
    host: string; port: number; mount: string
    harborHost: string; harborPort: number | null; harborMount: string
  } | null>(null)
  const [livePassword, setLivePassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [djSlots, setDjSlots] = useState<DjSlotInfo[]>([])
  const [djConnected, setDjConnected] = useState(false)
  const [planMaxDjs, setPlanMaxDjs] = useState<number>(4)
  const [apiAvailableMounts, setApiAvailableMounts] = useState<string[]>([])
  const [sessions, setSessions] = useState<DjSession[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [copyText, setCopyText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // DJ form modal
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', mount: '/dj1', priority: 1, role: 'guest' as string, password: '',
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/streaming/connection')
      if (res.ok) {
        const data = await res.json()
        if (data.host) setConnectionInfo(data)
        setDjConnected(data.djConnected || false)
        if (data.djSlots) setDjSlots(data.djSlots)
        // Campos nuevos (change scale-and-stabilize-multi-dj). Si el backend
        // aún no los expone (versión vieja), caemos al default 4 y lista vacía.
        setPlanMaxDjs(typeof data.planMaxDjs === 'number' ? data.planMaxDjs : 4)
        setApiAvailableMounts(Array.isArray(data.availableMounts) ? data.availableMounts : [])
        if (Array.isArray(data.sessions?.entries)) setSessions(data.sessions.entries)
        if (Array.isArray(data.logs)) setLogs(data.logs)
      }
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  // Poll
  useEffect(() => {
    const iv = setInterval(load, 3000)
    return () => clearInterval(iv)
  }, [load])

  const [mountedHost, setMountedHost] = useState<string | null>(null)
  useEffect(() => {
    setMountedHost(window.location.hostname)
  }, [])

  const harborHost = connectionInfo?.harborHost || mountedHost || 'localhost'
  const harborPort = connectionInfo?.harborPort || 9000

  // Orden estable para TODA la página: por rol (owner > host > guest) y luego
  // por priority ascendente. Reutilizado por el banner multi-DJ, la lista de
  // slots y cualquier otra vista que liste DJs.
  const sortedSlots = [...djSlots].sort((a, b) => {
    const r = (ROLE_HIERARCHY[b.role] || 0) - (ROLE_HIERARCHY[a.role] || 0)
    return r !== 0 ? r : a.priority - b.priority
  })

  // DJs conectados en orden de prioridad (los mismos criterios que el fallback
  // de Liquidsoap: rol alto gana; empate → priority menor primero).
  const connectedSlots = sortedSlots.filter(s => s.connected)
  const connectedLabel = connectedSlots.length === 0
    ? null
    : connectedSlots.length === 1
      ? connectedSlots[0].name
      : connectedSlots.map(s => s.name).join(' + ')

  const revealPassword = useCallback(async () => {
    if (livePassword) { setShowPassword(p => !p); return }
    setLoadingPassword(true)
    try {
      const res = await fetch('/api/dashboard/streaming/connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealPassword: 'live' }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLivePassword(data.password)
      setShowPassword(true)
    } catch {} finally { setLoadingPassword(false) }
  }, [livePassword])

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopyText(label)
    setTimeout(() => setCopyText(null), 2000)
  }

  // --- DJ CRUD ---
  const resetForm = () => {
    // El mount inicial del form es el primero disponible (dinámico); si no hay
    // ninguno libre, caemos a '/dj1' como placeholder visual (el POST igual va
    // a fallar con 400 max_djs_reached, que mostramos al usuario).
    const initialMount = apiAvailableMounts[0] || '/dj1'
    setForm({ name: '', mount: initialMount, priority: 1, role: 'guest', password: '' })
    setEditId(null)
    setShowForm(false)
    setError(null)
  }

  const startCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (dj: DjSlotInfo) => {
    setForm({ name: dj.name, mount: dj.mount, priority: dj.priority, role: dj.role, password: '' })
    setEditId(dj.id)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t('streaming.connection.nameRequired'))
      return
    }
    if (!editId && !form.password) {
      setError(t('streaming.connection.namePasswordRequired'))
      return
    }
    setSaving(true); setError(null)
    try {
      if (editId) {
        const body: Record<string, any> = {}
        if (form.name) body.name = form.name
        if (form.mount) body.mount = form.mount
        if (form.priority) body.priority = form.priority
        if (form.role) body.role = form.role
        if (form.password) body.password = form.password
        const res = await fetch(`/api/dashboard/streaming/djs/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error || t('streaming.connection.errorDelete'))
        setSuccess(t('streaming.connection.djUpdated', { name: form.name }))
      } else {
        const res = await fetch('/api/dashboard/streaming/djs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error || t('streaming.connection.errorDelete'))
        setSuccess(t('streaming.connection.djCreated', { name: form.name }))
      }
      resetForm()
      await load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (dj: DjSlotInfo) => {
    if (!confirm(t('streaming.connection.confirmDelete', { name: dj.name, mount: dj.mount }))) return
    try {
      const res = await fetch(`/api/dashboard/streaming/djs/${dj.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSuccess(t('streaming.connection.djDeleted', { name: dj.name }))
      await load()
    } catch { setError(t('streaming.connection.errorDelete')) }
  }

  const handleKick = async (dj: DjSlotInfo) => {
    if (!dj.connected) return
    if (!confirm(t('streaming.connection.confirmDisconnect', { name: dj.name, mount: dj.mount }))) return
    try {
      const res = await fetch(`/api/dashboard/streaming/djs/${dj.id}/kick`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setSuccess(t('streaming.connection.djDisconnected', { name: dj.name }))
      await load()
    } catch { setError(t('streaming.connection.errorDisconnect')) }
  }

  // Mounts que se muestran en el dropdown: los devueltos por el agente (ya libres
// según Plan.maxDjs) + el mount del slot que estamos editando (para no perder
// la selección al recargar la página tras un PATCH).
  const mountChoices = Array.from(new Set([
    ...apiAvailableMounts,
    ...(editId ? djSlots.filter(d => d.id === editId).map(d => d.mount) : []),
  ]))

  const displayPassword = showPassword && livePassword ? livePassword : '********'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('streaming.connection.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('streaming.connection.subtitle')}
        </p>
      </div>

      {/* Status */}
      <div className={`rounded-lg p-4 text-sm border ${
        djConnected ? 'bg-green-900/30 border-green-700 text-green-100' : 'bg-card border-border text-muted-foreground'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${djConnected ? 'bg-green-500 animate-pulse' : 'bg-secondary'}`} />
          <span className={djConnected ? 'text-green-400' : 'text-brand'}>
            {djConnected
              ? t('streaming.connection.djLive', { name: connectedLabel ? ` (${connectedLabel})` : '' })
              : t('streaming.connection.autodjActive')}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {djConnected
            ? `${connectedSlots.length > 1 ? t('streaming.connection.djsConnected', { count: connectedSlots.length }) : t('streaming.connection.djConnected')}. ${t('streaming.connection.autodjResume')}`
            : t('streaming.connection.noDj')}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded text-sm">{success}</div>
      )}

      {/* Jerarquía de roles */}
      <div className="bg-card rounded-lg p-4 text-sm space-y-1">
        <h3 className="font-semibold text-muted-foreground mb-2">{t('streaming.connection.roleHierarchy')}</h3>
        {Object.entries(roleLabels).map(([role, desc]) => (
          <div key={role} className="flex items-start gap-2 text-muted-foreground">
            <span className={`font-medium px-1.5 py-0.5 rounded text-xs uppercase ${ROLE_STYLES[role]}`}>{role}</span>
            <span>{desc}</span>
          </div>
        ))}
      </div>

      {/* Slots de DJ + CRUD */}
      <div className="bg-card rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('streaming.connection.djSlots')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('streaming.connection.planMax', { count: planMaxDjs })}
            </p>
          </div>
          <button
            onClick={startCreate}
            disabled={djSlots.length >= planMaxDjs}
            title={djSlots.length >= planMaxDjs ? t('streaming.connection.planMax', { count: planMaxDjs }) : t('streaming.connection.newDj')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            {t('streaming.connection.newDj')}
          </button>
        </div>

        {djSlots.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {t('streaming.connection.noSlots')}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSlots.map(slot => (
              <div key={slot.id} className={`border rounded-lg p-4 ${
                slot.connected ? 'border-green-700 bg-green-900/20' : 'border-border bg-background/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${slot.connected ? 'bg-green-500 animate-pulse' : 'bg-secondary'}`} />
                    <span className="text-foreground font-medium">{slot.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${ROLE_STYLES[slot.role]}`}>{slot.role}</span>
                    {slot.connected && slot.onAir && <span className="text-xs font-semibold text-green-400">{t('streaming.connection.onAir')}</span>}
                    {slot.connected && !slot.onAir && <span className="text-xs text-yellow-400">{t('streaming.connection.waiting')}</span>}
                    {!slot.connected && slot.isActive && <span className="text-xs text-muted-foreground">{t('streaming.connection.available')}</span>}
                    {!slot.isActive && <span className="text-xs text-red-400">{t('streaming.connection.inactive')}</span>}
                  </div>
                  <div className="flex gap-2">
                    {slot.connected && (
                      <button onClick={() => handleKick(slot)} className="text-xs px-2.5 py-1.5 bg-orange-900/50 hover:bg-orange-800 text-orange-300 rounded">
                        {t('streaming.connection.disconnect')}
                      </button>
                    )}
                    <button onClick={() => startEdit(slot)} className="text-xs px-2.5 py-1.5 bg-secondary hover:bg-secondary text-muted-foreground rounded">
                      {t('streaming.connection.edit')}
                    </button>
                    <button onClick={() => handleDelete(slot)} className="text-xs px-2.5 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
                      {t('streaming.connection.delete')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t('streaming.connection.mount')}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="bg-background text-brand px-2 py-1 rounded flex-1 font-mono">{slot.mount}</code>
                      <button onClick={() => copy(slot.mount, 'Mount')} className="px-1.5 py-1 bg-secondary hover:bg-secondary text-foreground rounded">{t('streaming.connection.copy')}</button>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('streaming.connection.priority')}</span>
                    <div className="mt-0.5 text-foreground">{slot.priority}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('streaming.connection.role')}</span>
                    <div className="mt-0.5 text-muted-foreground">{roleLabels[slot.role] || slot.role}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('streaming.connection.status')}</span>
                    <div className="mt-0.5">{slot.isActive ? (slot.connected ? (slot.onAir ? t('streaming.connection.broadcasting') : t('streaming.connection.waitingShort')) : t('streaming.connection.available')) : t('streaming.connection.inactive')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Server info */}
      <div className="bg-card rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('streaming.connection.serverConfig')}</h2>
        <p className="text-xs text-muted-foreground -mt-2">{t('streaming.connection.serverConfigText')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.server')}</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-background text-brand px-3 py-2 rounded flex-1 font-mono text-sm">{harborHost}</code>
              <button onClick={() => copy(harborHost, t('streaming.connection.server'))} className="text-xs px-2 py-1 bg-secondary hover:bg-secondary text-foreground rounded">{t('streaming.connection.copy')}</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.harborPort')}</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-background text-brand px-3 py-2 rounded flex-1 font-mono text-sm">{harborPort}</code>
              <button onClick={() => copy(String(harborPort), t('streaming.connection.harborPort'))} className="text-xs px-2 py-1 bg-secondary hover:bg-secondary text-foreground rounded">{t('streaming.connection.copy')}</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.username')}</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-background text-brand px-3 py-2 rounded flex-1 font-mono text-sm">source</code>
              <button onClick={() => copy('source', t('streaming.connection.username'))} className="text-xs px-2 py-1 bg-secondary hover:bg-secondary text-foreground rounded">{t('streaming.connection.copy')}</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.defaultPassword')}</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-background text-brand px-3 py-2 rounded flex-1 font-mono text-sm">{displayPassword}</code>
              <button onClick={revealPassword} disabled={loadingPassword} className="text-xs px-2 py-1 bg-secondary hover:bg-secondary disabled:opacity-50 text-foreground rounded" title={showPassword ? t('streaming.connection.hide') : t('streaming.connection.show')}>
                {loadingPassword ? '...' : showPassword ? '🙈' : '👁'}
              </button>
              {livePassword && showPassword && (
                <button onClick={() => copy(livePassword, t('streaming.connection.password'))} className="text-xs px-2 py-1 bg-secondary hover:bg-secondary text-foreground rounded">{t('streaming.connection.copy')}</button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('streaming.connection.globalPasswordText')}</p>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-card rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('streaming.connection.sessions')}</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('streaming.connection.noSessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">{s.mount}</span>
                  <span className="text-xs text-muted-foreground ml-2">({s.role})</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {new Date(s.startedAt).toLocaleString(locale === 'en' ? 'en-US' : 'es-CL')}
                  {s.endedAt ? ` — ${formatDuration(s.durationSeconds)}` : ` — ${t('streaming.connection.inProgress')}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-card rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('streaming.connection.logs')}</h2>
          <button
            onClick={() => setShowLogs(v => !v)}
            className="text-xs px-3 py-1.5 bg-secondary hover:bg-secondary text-foreground rounded"
          >
            {showLogs ? t('streaming.connection.hide') : t('streaming.connection.viewLogs')}
          </button>
        </div>
        {showLogs && (
          <div className="bg-background rounded p-3 text-xs font-mono text-muted-foreground max-h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <p>{t('streaming.connection.noLogs')}</p>
            ) : (
              logs.map((line, i) => <p key={i}>{line}</p>)
            )}
          </div>
        )}
      </div>

      {/* BUTT example */}
      <div className="bg-card rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('streaming.connection.buttTitle')}</h2>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
          <li>{t('streaming.connection.butt1')}</li>
          <li>{t('streaming.connection.butt2')} <code className="text-brand">Icecast 2</code></li>
          <li>{t('streaming.connection.butt3')} <code className="text-brand">{harborHost}</code></li>
          <li>{t('streaming.connection.butt4')} <code className="text-brand">{harborPort}</code></li>
          <li>{t('streaming.connection.butt5')} <code className="text-brand">/dj1</code></li>
          <li>{t('streaming.connection.butt6')} <code className="text-brand">source</code></li>
          <li>{t('streaming.connection.butt7')}</li>
          <li>{t('streaming.connection.butt8')}</li>
        </ol>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{editId ? t('streaming.connection.editTitle') : t('streaming.connection.newTitle')}</h2>

            <div>
              <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.djName')}</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-foreground text-sm"
                placeholder={t('streaming.connection.djNamePlaceholder')} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.mountpoint')}</label>
              <div className="flex items-center mt-1 bg-background border border-border rounded px-3 py-2 text-foreground text-sm">
                <span className="text-muted-foreground mr-2">/dj</span>
                <input
                  type="number"
                  min={1}
                  max={planMaxDjs}
                  value={form.mount.replace(/^\/dj/, '')}
                  onChange={e => {
                    const n = Math.max(1, Math.min(planMaxDjs, parseInt(e.target.value) || 1))
                    setForm({ ...form, mount: `/dj${n}` })
                  }}
                  disabled={!!editId}
                  className="bg-transparent w-full outline-none disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {editId
                  ? t('streaming.connection.mountEdit')
                  : t('streaming.connection.mountHint', { count: planMaxDjs })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.priority')}</label>
                <input type="number" min={1} max={4} value={form.priority}
                  onChange={e => setForm({...form, priority: parseInt(e.target.value) || 1})}
                  className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.role')}</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-foreground text-sm">
                  <option value="owner">{t('streaming.connection.roleOwner')}</option>
                  <option value="host">{t('streaming.connection.roleHost')}</option>
                  <option value="guest">{t('streaming.connection.roleGuest')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase">{t('streaming.connection.password')} {editId ? t('streaming.connection.passwordKeep') : ''}</label>
              <input value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-foreground text-sm"
                placeholder={editId ? t('streaming.connection.passwordKeepPlaceholder') : t('streaming.connection.passwordPlaceholder')}
                type="password" />
            </div>

            {form.role && (
              <div className="text-xs text-muted-foreground bg-background rounded p-2">{roleLabels[form.role]}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetForm} className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded text-sm">{t('streaming.connection.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-sm">
                {saving ? t('streaming.connection.saving') : editId ? t('streaming.connection.save') : t('streaming.connection.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {copyText && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          ✓ {t('streaming.connection.copied', { label: copyText })}
        </div>
      )}

      {success && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          ✓ {success}
        </div>
      )}
    </div>
  )
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
