'use client'

import { showToast } from '@/components/ui/toast'

// =====================================================
// Page — /dashboard/streaming/playlists
// =====================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Playlist {
  id: string
  name: string
  description: string | null
  isActive: boolean
  shuffle: boolean
  repeat: boolean
  trackCount: number
  totalDuration: number | null
  entryCount: number
  updatedAt: string
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistsPage() {
  const { t } = useDashboardI18n()
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard/streaming/playlists', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data.playlists || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/dashboard/streaming/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc || undefined }),
      })
      if (!res.ok) throw new Error(t('streaming.playlists.errorCreate'))
      const data = await res.json()
      setShowNew(false)
      setNewName('')
      setNewDesc('')
      router.push(`/dashboard/streaming/playlists/${data.playlistId}`)
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setCreating(false)
    }
  }

  const activate = async (id: string) => {
    setActivatingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error(t('streaming.playlists.errorActivate'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setActivatingId(null)
    }
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(t('streaming.playlists.confirmDelete', { name }))) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('streaming.playlists.errorDelete'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('streaming.playlists.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('streaming.playlists.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg"
        >
          {t('streaming.playlists.new')}
        </button>
      </div>

      {showNew && (
        <div className="bg-card rounded-lg p-6 space-y-3 border border-brand">
          <h3 className="text-lg font-semibold text-foreground">{t('streaming.playlists.createTitle')}</h3>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('streaming.playlists.namePlaceholder')}
            className="w-full bg-background text-foreground px-3 py-2 rounded border border-border"
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={t('streaming.playlists.descPlaceholder')}
            className="w-full bg-background text-foreground px-3 py-2 rounded border border-border"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-brand hover:bg-brand disabled:bg-secondary text-white rounded"
            >
              {creating ? t('streaming.playlists.creating') : t('streaming.playlists.create')}
            </button>
            <button
              onClick={() => { setShowNew(false); setNewName(''); setNewDesc('') }}
              className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded"
            >
              {t('streaming.playlists.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center text-muted-foreground py-12">{t('streaming.playlists.loading')}</div>
        ) : playlists.length === 0 ? (
          <div className="col-span-2 text-center text-muted-foreground py-12">
            {t('streaming.playlists.empty')}
          </div>
        ) : (
          playlists.map((p) => (
            <div
              key={p.id}
              className={`bg-card rounded-lg p-5 border-2 ${
                p.isActive ? 'border-green-600' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-foreground font-semibold flex items-center gap-2">
                    {p.name}
                    {p.isActive && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                        {t('streaming.playlists.active')}
                      </span>
                    )}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  )}
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
          <span>{t('streaming.playlists.trackCount', { count: p.entryCount })}</span>
                    <span>⏱️ {fmtDuration(p.totalDuration)}</span>
          {p.shuffle && <span>{t('streaming.playlists.shuffle')}</span>}
          {p.repeat && <span>{t('streaming.playlists.repeat')}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Link
                  href={`/dashboard/streaming/playlists/${p.id}`}
                  className="px-3 py-1.5 bg-brand hover:bg-brand text-white text-sm rounded"
                >
                  {t('streaming.playlists.edit')}
                </Link>
                {!p.isActive && (
                  <button
                    onClick={() => activate(p.id)}
                    disabled={activatingId === p.id}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-secondary text-white text-sm rounded"
                  >
                    {activatingId === p.id ? '...' : t('streaming.playlists.activate')}
                  </button>
                )}
                <button
                  onClick={() => remove(p.id, p.name)}
                  disabled={deletingId === p.id}
         className="px-3 py-1.5 bg-[color:var(--danger)] hover:brightness-110 disabled:bg-secondary text-white text-sm rounded ml-auto"
                >
                  {t('streaming.playlists.delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
