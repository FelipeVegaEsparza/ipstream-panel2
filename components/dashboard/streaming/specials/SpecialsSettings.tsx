'use client'

import { useEffect, useMemo, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { DashboardTranslationKey } from '@/lib/dashboard-i18n'
import { SparklesIcon, PlusIcon, Trash2Icon, SaveIcon, ArrowLeftIcon, PlayIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

interface SpecialTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  order: number
}

interface SpecialItem {
  id: string
  name: string
  artist: string
  description: string
  introText: string
  closingText: string
  everyTracks: number
  startDate: string
  endDate: string
  active: boolean
  introReadyAt: string | null
  closingReadyAt: string | null
  tracks: SpecialTrack[]
  ready: boolean
  status: 'inactive' | 'outside_window' | 'no_tracks' | 'audio_missing' | 'ready'
}

interface Config {
  specials: SpecialItem[]
  aiEnabled: boolean
  aiAvailable: boolean
  ttsAvailable: boolean
  remaining: number
  stationName: string
}

interface LibraryTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
}

interface FormState {
  id: string | null
  name: string
  artist: string
  description: string
  introText: string
  closingText: string
  everyTracks: number
  startDate: string
  endDate: string
  active: boolean
  trackIds: string[]
}

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

const SKIP_REASON_KEY: Record<string, DashboardTranslationKey> = {
  no_tracks: 'streaming.specials.skip_no_tracks',
  audio_missing: 'streaming.specials.skip_audio_missing',
  playlist_too_short: 'streaming.specials.skip_playlist_too_short',
  tracks_missing: 'streaming.specials.skip_tracks_missing',
  collision: 'streaming.specials.skip_collision',
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  artist: '',
  description: '',
  introText: '',
  closingText: '',
  everyTracks: 10,
  startDate: '',
  endDate: '',
  active: true,
  trackIds: [],
}

function fromSpecial(special: SpecialItem): FormState {
  return {
    id: special.id,
    name: special.name,
    artist: special.artist,
    description: special.description,
    introText: special.introText,
    closingText: special.closingText,
    everyTracks: special.everyTracks,
    startDate: special.startDate,
    endDate: special.endDate,
    active: special.active,
    trackIds: special.tracks.map((track) => track.id),
  }
}

function StatusBadge({ special }: { special: SpecialItem }) {
  const { t } = useDashboardI18n()
  const label = !special.active
    ? t('streaming.specials.statusInactive')
    : special.status === 'ready'
      ? t('streaming.specials.statusReady')
      : special.status === 'outside_window'
        ? t('streaming.specials.statusOutsideWindow')
        : special.status === 'no_tracks'
          ? t('streaming.specials.statusNoTracks')
          : t('streaming.specials.statusAudioMissing')
  const className = special.active && special.status === 'ready'
    ? 'bg-brand/10 text-brand'
    : 'bg-secondary text-muted-foreground'
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${className}`}>
      {label}
    </span>
  )
}

export function SpecialsSettings() {
  const { t } = useDashboardI18n()
  const [config, setConfig] = useState<Config | null>(null)
  const [library, setLibrary] = useState<LibraryTrack[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState<'intro' | 'closing' | null>(null)
  const [drafting, setDrafting] = useState<'intro' | 'closing' | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<Array<{ name: string; reason: string }>>([])
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const [specialsRes, libraryRes] = await Promise.all([
        fetch('/api/dashboard/streaming/specials', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library', { cache: 'no-store' }),
      ])
      const specialsData = await specialsRes.json().catch(() => ({}))
      if (!specialsRes.ok) throw new Error(specialsData?.message || specialsData?.error || t('streaming.specials.loadError'))
      setConfig(specialsData)
      if (libraryRes.ok) {
        const libraryData = await libraryRes.json().catch(() => ({}))
        setLibrary(Array.isArray(libraryData.tracks) ? libraryData.tracks : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selectedTracks = useMemo(
    () => new Set(form?.trackIds || []),
    [form?.trackIds]
  )
  const filteredLibrary = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return library
    return library.filter((track) =>
      `${track.title} ${track.artist || ''}`.toLowerCase().includes(term)
    )
  }, [library, search])

  const updateForm = (patch: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const toggleTrack = (trackId: string) => {
    setForm((prev) => {
      if (!prev) return prev
      if (prev.trackIds.includes(trackId)) {
        return { ...prev, trackIds: prev.trackIds.filter((id) => id !== trackId) }
      }
      if (prev.trackIds.length >= 5) return prev
      return { ...prev, trackIds: [...prev.trackIds, trackId] }
    })
  }

  const moveTrack = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      if (!prev) return prev
      const next = [...prev.trackIds]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, trackIds: next }
    })
  }

  const save = async (skipAudioRegeneration = false): Promise<SpecialItem | null> => {
    if (!form) return null
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        name: form.name,
        artist: form.artist,
        description: form.description,
        introText: form.introText,
        closingText: form.closingText,
        everyTracks: form.everyTracks,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        active: form.active,
        trackIds: form.trackIds,
        regenerateAudio: !skipAudioRegeneration,
      }
      const res = await fetch(
        form.id
          ? `/api/dashboard/streaming/specials/${encodeURIComponent(form.id)}`
          : '/api/dashboard/streaming/specials',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.specials.saveError'))
      const special = data.special as SpecialItem
      setForm(fromSpecial(special))
      await load()
      const warnings = Array.isArray(data.audioWarnings) ? data.audioWarnings : []
      if (warnings.length > 0) {
        setError(warnings.map((item: { message: string }) => item.message).join(' '))
      } else {
        showToast({ type: 'success', title: t('streaming.specials.saved') })
      }
      return special
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.saveError'))
      return null
    } finally {
      setSaving(false)
    }
  }

  const loadSpecial = async (id: string): Promise<SpecialItem | null> => {
    const res = await fetch('/api/dashboard/streaming/specials', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return null
    setConfig(data)
    return (data.specials as SpecialItem[]).find((item) => item.id === id) || null
  }

  const draft = async (part: 'intro' | 'closing') => {
    if (!form) return
    setDrafting(part)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/streaming/specials/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          artist: form.artist,
          description: form.description,
          part,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.specials.draftError'))
      if (part === 'intro') updateForm({ introText: data.text })
      else updateForm({ closingText: data.text })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.draftError'))
    } finally {
      setDrafting(null)
    }
  }

  const record = async (part: 'intro' | 'closing') => {
    if (!form) return
    setRecording(part)
    setError(null)
    setNotice(null)
    try {
      // Siempre guardamos primero para que el audio use el texto editado.
      const saved = await save(true)
      const id = saved?.id
      if (!id) return
      const res = await fetch(
        `/api/dashboard/streaming/specials/${encodeURIComponent(id)}/audio`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ part }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.specials.recordError'))
      const special = await loadSpecial(id)
      if (special) setForm(fromSpecial(special))
      setNotice(
        data?.seconds
          ? t('streaming.specials.recordedSeconds', { seconds: Math.round(Number(data.seconds)) })
          : t('streaming.specials.recorded')
      )
      if (data.trimmed) setNotice(t('streaming.specials.recordedTrimmed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.recordError'))
    } finally {
      setRecording(null)
    }
  }

  const toggleActive = async (special: SpecialItem) => {
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/specials/${encodeURIComponent(special.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !special.active }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.specials.saveError'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.saveError'))
    }
  }

  const remove = async (special: SpecialItem) => {
    if (!window.confirm(t('streaming.specials.deleteConfirm', { name: special.name }))) return
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/specials/${encodeURIComponent(special.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.specials.deleteError'))
      if (form?.id === special.id) setForm(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.deleteError'))
    }
  }

  const apply = async () => {
    setApplying(true)
    setError(null)
    setNotice(null)
    setSkipped([])
    try {
      const res = await fetch('/api/dashboard/streaming/specials/apply', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.specials.applyError'))
      setNotice(data.message || t('streaming.specials.applied'))
      setSkipped(Array.isArray(data.skipped) ? data.skipped : [])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.specials.applyError'))
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return <div className="card text-sm text-muted-foreground">{t('streaming.specials.loading')}</div>
  }

  if (!config) {
    return <div className="card text-sm text-red-300">{error || t('streaming.specials.loadError')}</div>
  }

  if (!config.aiEnabled) {
    return (
      <div className="card max-w-2xl space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <SparklesIcon className="h-5 w-5 text-brand" />
          {t('streaming.specials.planTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('streaming.specials.planText')}</p>
      </div>
    )
  }

  const unavailable = !config.aiAvailable || !config.ttsAvailable
  const unavailableText = !config.aiAvailable
    ? t('streaming.specials.aiUnavailable')
    : t('streaming.specials.ttsUnavailable')

  return (
    <div className="max-w-4xl space-y-5">
      {unavailable && (
        <p className="rounded-panel border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          {unavailableText}
        </p>
      )}
      {error && (
        <p className="rounded-panel border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}
      {notice && (
        <p className="rounded-panel border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-foreground">{notice}</p>
      )}
      {skipped.length > 0 && (
        <div className="rounded-panel border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">{t('streaming.specials.skippedTitle')}</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {skipped.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.name}: {t(SKIP_REASON_KEY[item.reason] || 'streaming.specials.skippedReason')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {form ? (
        <div className="card space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {form.id ? t('streaming.specials.editTitle') : t('streaming.specials.newTitle')}
            </h2>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-brand hover:text-brand"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              {t('streaming.specials.back')}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.specials.name')}</label>
              <input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} className={input} maxLength={200} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.specials.artist')}</label>
              <input value={form.artist} onChange={(e) => updateForm({ artist: e.target.value })} className={input} maxLength={200} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.specials.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              rows={3}
              className={`${input} resize-none`}
              maxLength={2000}
              placeholder={t('streaming.specials.descriptionPlaceholder')}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t('streaming.specials.descriptionHint')}</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{t('streaming.specials.introTitle')}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void draft('intro')}
                  disabled={Boolean(drafting) || saving || unavailable}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand hover:text-brand disabled:opacity-40"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  {drafting === 'intro' ? t('streaming.specials.drafting') : t('streaming.specials.draft')}
                </button>
                <button
                  type="button"
                  onClick={() => void record('intro')}
                  disabled={Boolean(recording) || saving || !form.introText.trim() || unavailable}
                  className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                  {recording === 'intro' ? t('streaming.specials.recording') : t('streaming.specials.record')}
                </button>
                {form.id && config.specials.find((item) => item.id === form.id)?.introReadyAt && (
                  <EffectPreviewButton
                    src={`/api/dashboard/streaming/specials/${encodeURIComponent(form.id)}/audio?part=intro`}
                    name={t('streaming.specials.introTitle')}
                  />
                )}
              </div>
            </div>
            <textarea
              value={form.introText}
              onChange={(e) => updateForm({ introText: e.target.value })}
              rows={3}
              className={`${input} resize-none`}
              maxLength={1200}
              placeholder={t('streaming.specials.introPlaceholder')}
            />
            <p className="text-[11px] text-muted-foreground">{t('streaming.specials.textHint')}</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{t('streaming.specials.closingTitle')}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void draft('closing')}
                  disabled={Boolean(drafting) || saving || unavailable}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand hover:text-brand disabled:opacity-40"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  {drafting === 'closing' ? t('streaming.specials.drafting') : t('streaming.specials.draft')}
                </button>
                <button
                  type="button"
                  onClick={() => void record('closing')}
                  disabled={Boolean(recording) || saving || !form.closingText.trim() || unavailable}
                  className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                  {recording === 'closing' ? t('streaming.specials.recording') : t('streaming.specials.record')}
                </button>
                {form.id && config.specials.find((item) => item.id === form.id)?.closingReadyAt && (
                  <EffectPreviewButton
                    src={`/api/dashboard/streaming/specials/${encodeURIComponent(form.id)}/audio?part=closing`}
                    name={t('streaming.specials.closingTitle')}
                  />
                )}
              </div>
            </div>
            <textarea
              value={form.closingText}
              onChange={(e) => updateForm({ closingText: e.target.value })}
              rows={3}
              className={`${input} resize-none`}
              maxLength={1200}
              placeholder={t('streaming.specials.closingPlaceholder')}
            />
            <p className="text-[11px] text-muted-foreground">{t('streaming.specials.textHint')}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{t('streaming.specials.tracksTitle')}</h3>
              <span className="text-[11px] text-muted-foreground">{t('streaming.specials.tracksCount', { count: form.trackIds.length })}</span>
            </div>
            {form.trackIds.length > 0 && (
              <div className="space-y-1 rounded-lg border border-border bg-secondary/20 p-2">
                <p className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('streaming.specials.orderHint')}
                </p>
                {form.trackIds.map((trackId, index) => {
                  const track = library.find((item) => item.id === trackId)
                  return (
                    <div key={trackId} className="flex items-center gap-1.5 rounded-lg bg-background px-2 py-1.5 text-xs">
                      <span className="w-4 shrink-0 text-muted-foreground">{index + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {track ? `${track.title}${track.artist ? ` · ${track.artist}` : ''}` : trackId}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveTrack(index, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-muted-foreground hover:text-brand disabled:opacity-30"
                        aria-label={t('streaming.specials.moveUp')}
                      >
                        <ArrowUpIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTrack(index, 1)}
                        disabled={index === form.trackIds.length - 1}
                        className="rounded p-1 text-muted-foreground hover:text-brand disabled:opacity-30"
                        aria-label={t('streaming.specials.moveDown')}
                      >
                        <ArrowDownIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTrack(trackId)}
                        className="rounded p-1 text-muted-foreground hover:text-red-300"
                        aria-label={t('streaming.specials.removeTrack')}
                      >
                        <Trash2Icon className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={input}
              placeholder={t('streaming.specials.searchLibrary')}
            />
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
              {filteredLibrary.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">{t('streaming.specials.libraryEmpty')}</p>
              ) : (
                filteredLibrary.map((track) => {
                  const checked = selectedTracks.has(track.id)
                  const disabled = !checked && form.trackIds.length >= 5
                  return (
                    <label
                      key={track.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                        checked ? 'bg-brand/10 text-foreground' : 'text-muted-foreground hover:bg-secondary/40'
                      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTrack(track.id)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {track.title}{track.artist ? ` · ${track.artist}` : ''}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.specials.every')}</label>
              <select
                value={form.everyTracks}
                onChange={(e) => updateForm({ everyTracks: Number(e.target.value) })}
                className={input}
              >
                {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((value) => (
                  <option key={value} value={value}>{t('streaming.specials.tracksValue', { count: value })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.specials.startDate')}</label>
              <input type="date" value={form.startDate} onChange={(e) => updateForm({ startDate: e.target.value })} className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.specials.endDate')}</label>
              <input type="date" value={form.endDate} onChange={(e) => updateForm({ endDate: e.target.value })} className={input} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => updateForm({ active: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-secondary"
            />
            {t('streaming.specials.active')}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || Boolean(recording)}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <SaveIcon className="h-4 w-4" />
              {saving ? t('streaming.specials.saving') : t('streaming.specials.save')}
            </button>
            <p className="self-center text-[11px] text-muted-foreground">{t('streaming.specials.saveHint')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('streaming.specials.listIntro')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...EMPTY_FORM })}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-brand hover:text-brand"
              >
                <PlusIcon className="h-4 w-4" />
                {t('streaming.specials.new')}
              </button>
              <button
                type="button"
                onClick={() => void apply()}
                disabled={applying}
                className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4" />
                {applying ? t('streaming.specials.applying') : t('streaming.specials.apply')}
              </button>
            </div>
          </div>

          {config.specials.length === 0 ? (
            <div className="card text-sm text-muted-foreground">{t('streaming.specials.empty')}</div>
          ) : (
            <div className="space-y-3">
              {config.specials.map((special) => (
                <div key={special.id} className="card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-foreground">{special.name}</h2>
                        <StatusBadge special={special} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {special.artist ? `${special.artist} · ` : ''}
                        {t('streaming.specials.everyShort', { count: special.everyTracks })}
                        {special.startDate || special.endDate
                          ? ` · ${special.startDate || '…'} → ${special.endDate || '…'}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(fromSpecial(special))}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand hover:text-brand"
                      >
                        {t('streaming.specials.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(special)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-brand hover:text-brand"
                      >
                        {special.active ? t('streaming.specials.deactivate') : t('streaming.specials.activate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(special)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-500/40 hover:text-red-300"
                        aria-label={t('streaming.specials.delete')}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{special.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('streaming.specials.tracksSummary', { count: special.tracks.length })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
