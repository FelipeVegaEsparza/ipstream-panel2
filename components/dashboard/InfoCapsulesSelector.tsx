'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircleIcon, SparklesIcon, SpeakerWaveIcon, TrashIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { CapsuleAiModal } from './CapsuleAiModal'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Capsule {
  id: string; title: string; description: string | null; fileName: string;
  mimeType: string; url: string; size: number; duration: number | null;
  category: { id: string; name: string } | null;
  source?: string;
  clientId?: string | null;
}
interface Category { id: string; name: string }

export function InfoCapsulesSelector() {
  const { t } = useDashboardI18n()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [autoDjEnabled, setAutoDjEnabled] = useState(false)
  const [playEvery, setPlayEvery] = useState(8)
  const [playCount, setPlayCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/info-capsules', { cache: 'no-store' })
      if (!res.ok) throw new Error(t('capsules.loadError'))
      const data = await res.json()
      setCapsules(Array.isArray(data.capsules) ? data.capsules : [])
      setCategories(Array.isArray(data.categories) ? data.categories : [])
      setSelected(Array.isArray(data.selectedIds) ? data.selectedIds : [])
      setAutoDjEnabled(Boolean(data.autoDjEnabled))
      setPlayEvery(Number(data.playEvery) || 8)
      setPlayCount(Number(data.playCount) || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('capsules.loadErrorShort'))
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => categoryFilter
    ? capsules.filter((capsule) => (categoryFilter === '__none__' ? !capsule.category : capsule.category?.id === categoryFilter))
    : capsules, [capsules, categoryFilter])

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])

  const save = async () => {
    setSaving(true); setError(null); setNotice(null)
    try {
      const res = await fetch('/api/dashboard/info-capsules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capsuleIds: selected, autoDjEnabled, playEvery, playCount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('capsules.saveError'))
      setSelected(Array.isArray(data.selectedIds) ? data.selectedIds : selected)
      setAutoDjEnabled(Boolean(data.autoDjEnabled))
      setPlayEvery(Number(data.playEvery) || playEvery)
      setPlayCount(Number(data.playCount) || playCount)
      setNotice(t('capsules.saved'))
    } catch (err) { setError(err instanceof Error ? err.message : t('capsules.saveError')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('capsules.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t('capsules.subtitle')}
          </p>
        </div>
        <button type="button" onClick={() => setAiOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:opacity-90">
          <SparklesIcon className="h-4 w-4" /> {t('capsules.createAi')}
        </button>
      </div>

      <CapsuleAiModal open={aiOpen} onClose={() => setAiOpen(false)} onSaved={() => void load()} />

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><CheckCircleIcon className="h-4 w-4" />{notice}</p>}

      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('capsules.scheduleTitle')}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('capsules.scheduleNote')}
          </p>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/30 px-3 py-3">
          <span>
            <span className="block text-sm font-medium text-foreground">{t('capsules.scheduleAuto')}</span>
            <span className="block text-[11px] text-muted-foreground">{t('capsules.scheduleAutoNote')}</span>
          </span>
          <input type="checkbox" checked={autoDjEnabled} onChange={(e) => setAutoDjEnabled(e.target.checked)} className="h-4 w-4 accent-[var(--brand-500)]" />
        </label>
        <div className={`grid gap-3 sm:grid-cols-2 ${autoDjEnabled ? '' : 'opacity-50'}`}>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">{t('capsules.everyTracks')}</span>
            <input type="number" min={1} max={100} value={playEvery} disabled={!autoDjEnabled} onChange={(e) => setPlayEvery(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">{t('capsules.howMany')}</span>
            <input type="number" min={1} max={20} value={playCount} disabled={!autoDjEnabled} onChange={(e) => setPlayCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60" />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><SpeakerWaveIcon className="h-4 w-4 text-brand" />{t('capsules.library')}</h2>
          <div className="flex items-center gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
              <option value="">{t('capsules.allCategories')}</option>
              <option value="__none__">{t('capsules.noCategory')}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{t('capsules.forLive', { count: selected.length })}</span>
          </div>
        </div>

        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">{t('capsules.loading')}</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t('capsules.empty')}</p> : (
          <ul className="divide-y divide-border">
            {filtered.map((capsule) => {
              const checked = selected.includes(capsule.id)
              return (
                <li key={capsule.id} className="flex flex-wrap items-center gap-3 py-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(capsule.id)} className="mt-1 h-4 w-4 accent-[var(--brand-500)]" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                        <span className="truncate">{capsule.title}</span>
                        {capsule.source === 'ai' && <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand">IA</span>}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {capsule.category?.name || t('capsules.noCategory')}{capsule.description ? ` · ${capsule.description}` : ''}
                      </span>
                    </span>
                  </label>
                  <EffectPreviewButton src={capsule.url} name={capsule.title} />
                  {capsule.source === 'ai' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(t('capsules.confirmDelete', { name: capsule.title }))) return
                        const res = await fetch(`/api/dashboard/info-capsules/${capsule.id}`, { method: 'DELETE' })
                        if (res.ok) await load()
                        else showToast({ type: 'error', title: t('capsules.deleteError') })
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-red-300"
                      title={t('capsules.deleteAi')}
                      aria-label={t('capsules.deleteLabel', { name: capsule.title })}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">{t('capsules.footerNote')}</p>
          <button type="button" onClick={() => void save()} disabled={saving || loading} className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            {saving ? t('capsules.saving') : t('capsules.save')}
          </button>
        </div>
      </section>
    </div>
  )
}
