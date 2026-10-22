'use client'

// =====================================================
// Page — /admin/streaming/[clientId]
// =====================================================

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { ClientMigrateModal } from '@/components/admin/ClientMigrateModal'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Usage {
  totalBytes: number
  totalMB: number
  totalGB: number
  trackCount: number
  playlistCount: number
  quotaMB: number | null
  quotaBytes: number | null
  percentUsed: number | null
  remainingMB: number | null
  exceeded: boolean
}

interface ClientData {
  id: string
  name: string
  email: string
  userName: string | null
  createdAt: string
  trackCount: number
  playlistCount: number
}

interface RadioStreamData {
  id: string
  clientId: string
  icecastMount: string
  liquidsoapTelnetPort: number
  bitrate: number
  enabled: boolean
  storageQuotaMB: number | null
  maxListeners: number | null
  maxTracksPerPlaylist: number | null
  adminNotes: string | null
  status: string
  listenerCount: number
  lastStatusAt: string | null
  createdAt: string
  updatedAt: string
}

function fmtMB(mb: number | null | undefined, unlimitedLabel = '∞') {
  if (mb === null || mb === undefined) return unlimitedLabel
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

export default function AdminStreamingConfigPage() {
  const { t } = useDashboardI18n()
  const { clientId } = useParams() as { clientId: string }
  const router = useRouter()
  const { toast } = useToast()

  const [data, setData] = useState<{ client: ClientData; radioStream: RadioStreamData; usage: Usage } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revealing, setRevealing] = useState<'live' | 'source' | null>(null)
  const [revealedPwd, setRevealedPwd] = useState<{ live?: string; source?: string }>({})
  const [migrateOpen, setMigrateOpen] = useState(false)

  // Form state
  const [enabled, setEnabled] = useState(true)
  const [autoStart, setAutoStart] = useState(false)
  const [bitrate, setBitrate] = useState(128)
  const [storageQuotaMB, setStorageQuotaMB] = useState<string>('')
  const [maxListeners, setMaxListeners] = useState<string>('')
  const [maxTracksPerPlaylist, setMaxTracksPerPlaylist] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/streaming/${clientId}`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        // Init form
        setEnabled(d.radioStream.enabled)
        setAutoStart(d.radioStream.autoStart ?? false)
        setBitrate(d.radioStream.bitrate)
        setStorageQuotaMB(d.radioStream.storageQuotaMB?.toString() ?? '')
        setMaxListeners(d.radioStream.maxListeners?.toString() ?? '')
        setMaxTracksPerPlaylist(d.radioStream.maxTracksPerPlaylist?.toString() ?? '')
        setAdminNotes(d.radioStream.adminNotes || '')
      } else if (res.status === 404) {
        toast({ type: 'error', title: t('admin.streaming.notFound') })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [clientId, toast])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = {
        enabled,
        autoStart,
        bitrate: Number(bitrate),
        storageQuotaMB: storageQuotaMB === '' ? null : Number(storageQuotaMB),
        maxListeners: maxListeners === '' ? null : Number(maxListeners),
        maxTracksPerPlaylist: maxTracksPerPlaylist === '' ? null : Number(maxTracksPerPlaylist),
        adminNotes: adminNotes || null,
      }
      const res = await fetch(`/api/admin/streaming/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || result.details?.fieldErrors || t('admin.streaming.saveError'))
      toast({ type: 'success', title: t('admin.streaming.saved') })
      await load()
    } catch (err: any) {
      toast({ type: 'error', title: t('admin.streaming.genericError'), description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const reveal = async (type: 'live' | 'source') => {
    setRevealing(type)
    try {
      const res = await fetch(`/api/admin/streaming/${clientId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t('admin.streaming.genericError'))
      }
      const data = await res.json()
      setRevealedPwd((prev) => ({ ...prev, [type]: data.password }))
      toast({ type: 'info', title: t('admin.streaming.revealedTitle', { type }), description: t('admin.streaming.revealedDesc') })
    } catch (err: any) {
      toast({ type: 'error', title: t('admin.streaming.genericError'), description: err.message })
    } finally {
      setRevealing(null)
    }
  }

  if (loading || !data) {
    return <div className="text-muted-foreground">{t('admin.streaming.loading')}</div>
  }

  const { client, radioStream, usage } = data

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/streaming" className="text-sm text-brand hover:text-brand">
          {t('admin.streaming.back')}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-1">{client.name}</h1>
        <p className="text-sm text-muted-foreground">{client.email}</p>
      </div>

      {/* Status card */}
      <div className="bg-card rounded-lg p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase">{t('admin.streaming.status')}</div>
            <div className="text-lg font-semibold mt-1">
              {radioStream.status === 'autodj' ? <span className="text-green-400">{t('admin.streaming.autodj')}</span> :
               radioStream.status === 'live' ? <span className="text-red-400">{t('admin.streaming.live')}</span> :
               <span className="text-muted-foreground">{t('admin.streaming.off')}</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">{t('admin.streaming.mount')}</div>
            <div className="text-sm font-mono text-brand mt-1">/{radioStream.icecastMount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">{t('admin.streaming.listeners')}</div>
            <div className="text-lg font-semibold text-foreground mt-1">{radioStream.listenerCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Bitrate</div>
            <div className="text-lg font-semibold text-foreground mt-1">{radioStream.bitrate} kbps</div>
          </div>
        </div>
      </div>

      {/* Storage usage */}
      <div className="bg-card rounded-lg p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('admin.streaming.storageTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase">{t('admin.streaming.used')}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{fmtMB(usage.totalMB)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{usage.totalGB} GB · {usage.trackCount} tracks</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">{t('admin.streaming.quota')}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{fmtMB(usage.quotaMB, t('admin.streaming.unlimited'))}</div>
            {usage.percentUsed !== null && (
              <div className="text-xs text-muted-foreground mt-0.5">{t('admin.streaming.percentUsed', { percent: usage.percentUsed })}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">{t('admin.streaming.remaining')}</div>
            <div className={`text-2xl font-bold mt-1 ${
              usage.exceeded ? 'text-red-400' :
              usage.remainingMB !== null && usage.remainingMB < 100 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {fmtMB(usage.remainingMB, t('admin.streaming.unlimited'))}
            </div>
            {usage.exceeded && (
              <div className="text-xs text-red-400 mt-0.5">{t('admin.streaming.exceededWarning')}</div>
            )}
          </div>
        </div>
        {usage.percentUsed !== null && (
          <div className="mt-4">
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.exceeded ? 'bg-red-500' :
                  usage.percentUsed > 80 ? 'bg-yellow-500' : 'bg-brand'
                }`}
                style={{ width: `${Math.min(100, usage.percentUsed || 0)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Config form */}
      <div className="bg-card rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('admin.streaming.configTitle')}</h2>

        {/* Enabled kill switch */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="enabled" className="text-foreground">
            {t('admin.streaming.enabled')}
            <span className="block text-xs text-muted-foreground">
              {t('admin.streaming.enabledHint')}
            </span>
          </label>
        </div>

        {/* Auto-start toggle */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <input
            type="checkbox"
            id="autoStart"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoStart" className="text-foreground">
            {t('admin.streaming.autoStart')}
            <span className="block text-xs text-muted-foreground">
              {t('admin.streaming.autoStartHint')}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-foreground">{t('admin.streaming.bitrate')}</label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(Number(e.target.value))}
              className="w-full mt-1 bg-background text-foreground px-3 py-2 rounded border border-border"
            >
              <option value={64}>{t('admin.streaming.bitrate64')}</option>
              <option value={96}>96 kbps</option>
              <option value={128}>{t('admin.streaming.bitrate128')}</option>
              <option value={192}>{t('admin.streaming.bitrate192')}</option>
              <option value={256}>{t('admin.streaming.bitrate256')}</option>
              <option value={320}>{t('admin.streaming.bitrate320')}</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-foreground">{t('admin.streaming.storageQuota')}</label>
            <input
              type="number"
              min="0"
              value={storageQuotaMB}
              onChange={(e) => setStorageQuotaMB(e.target.value)}
              placeholder={t('admin.streaming.unlimitedPlaceholder')}
              className="w-full mt-1 bg-background text-foreground px-3 py-2 rounded border border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.streaming.storageHint')}
            </p>
          </div>
          <div>
            <label className="text-sm text-foreground">{t('admin.streaming.maxListeners')}</label>
            <input
              type="number"
              min="0"
              value={maxListeners}
              onChange={(e) => setMaxListeners(e.target.value)}
              placeholder={t('admin.streaming.unlimitedPlaceholder')}
              className="w-full mt-1 bg-background text-foreground px-3 py-2 rounded border border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('admin.streaming.maxListenersHint')}</p>
          </div>
          <div>
            <label className="text-sm text-foreground">{t('admin.streaming.maxTracks')}</label>
            <input
              type="number"
              min="1"
              value={maxTracksPerPlaylist}
              onChange={(e) => setMaxTracksPerPlaylist(e.target.value)}
              placeholder={t('admin.streaming.unlimitedPlaceholder')}
              className="w-full mt-1 bg-background text-foreground px-3 py-2 rounded border border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('admin.streaming.maxTracksHint')}</p>
          </div>
        </div>

        <div>
          <label className="text-sm text-foreground">{t('admin.streaming.adminNotes')}</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder={t('admin.streaming.adminNotesPlaceholder')}
            className="w-full mt-1 bg-background text-foreground px-3 py-2 rounded border border-border"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-brand hover:bg-brand disabled:bg-secondary text-white rounded"
          >
            {saving ? t('admin.streaming.saving') : t('admin.streaming.save')}
          </button>
          <button
            onClick={() => setMigrateOpen(true)}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-secondary text-white rounded"
          >
            {t('admin.streaming.migrate')}
          </button>
          <button
            onClick={load}
            disabled={saving}
            className="px-6 py-2 bg-secondary hover:bg-secondary disabled:bg-secondary text-foreground rounded"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {/* Passwords (solo admin) */}
      <div className="bg-card rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('admin.streaming.credentialsTitle')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.streaming.credentialsHint')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-foreground">{t('admin.streaming.sourcePassword')}</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={revealedPwd.source || '••••••••'}
                className="flex-1 bg-background text-brand px-3 py-2 rounded border border-border font-mono text-sm"
              />
              <button
                onClick={() => reveal('source')}
                disabled={revealing === 'source'}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-secondary text-white rounded text-sm"
              >
                {revealing === 'source' ? '...' : t('admin.streaming.reveal')}
              </button>
              {revealedPwd.source && (
                <button
                  onClick={() => navigator.clipboard.writeText(revealedPwd.source!)}
                  className="px-3 py-2 bg-secondary hover:bg-secondary text-foreground rounded text-sm"
                >
                  {t('admin.streaming.copy')}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-foreground">{t('admin.streaming.livePassword')}</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={revealedPwd.live || '••••••••'}
                className="flex-1 bg-background text-brand px-3 py-2 rounded border border-border font-mono text-sm"
              />
              <button
                onClick={() => reveal('live')}
                disabled={revealing === 'live'}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-secondary text-white rounded text-sm"
              >
                {revealing === 'live' ? '...' : t('admin.streaming.reveal')}
              </button>
              {revealedPwd.live && (
                <button
                  onClick={() => navigator.clipboard.writeText(revealedPwd.live!)}
                  className="px-3 py-2 bg-secondary hover:bg-secondary text-foreground rounded text-sm"
                >
                  {t('admin.streaming.copy')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit log mini-view */}
      <div className="bg-card rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('admin.streaming.auditTitle')}</h2>
        <p className="text-xs text-muted-foreground">
          {t('admin.streaming.auditHint')} <Link href="/admin/logs" className="text-brand hover:text-brand">{t('admin.streaming.activityLogs')}</Link>
        </p>
      </div>

      <ClientMigrateModal
        clientId={client.id}
        clientName={client.name}
        open={migrateOpen}
        onClose={() => setMigrateOpen(false)}
        onMigrated={load}
      />
    </div>
  )
}
