'use client'

import { useEffect, useMemo, useState } from 'react'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { showToast } from '@/components/ui/toast'
import { PauseIcon, PlayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { NewsRuleKind } from '@/lib/news-capsules/types'

interface MusicTrack {
  id: string
  name: string
  artist: string | null
  url: string
  duration: number | null
}

interface CapsuleRule {
  id: string
  kind: NewsRuleKind
  config: { everyTracks?: number; times?: string[]; everyHours?: number; startAt?: string }
  days: number[] | null
  active: boolean
}

interface CapsuleSource {
  id: string
  url: string
  publisher: string | null
  title: string | null
  publishedAt: string | null
  guid: string | null
  excerpt: string | null
}

interface Capsule {
  id: string
  title: string
  status: 'draft' | 'approved' | 'paused' | 'error' | 'deleted'
  summary: string | null
  scriptIntro: string | null
  scriptBody: string | null
  scriptClosing: string | null
  sourceText: string | null
  musicTrackId: string | null
  musicTrack: { id: string; name: string; artist: string | null } | null
  audioUrl: string | null
  audioDuration: number | null
  approvedAt: string | null
  previewedAt: string | null
  priority: number
  minGapMinutes: number
  graceMinutes: number
  windowStart: string | null
  windowEnd: string | null
  activeFrom: string | null
  activeTo: string | null
  errorMessage: string | null
  sources: CapsuleSource[]
  rules: CapsuleRule[]
  nextEmissionAt: string | null
  createdAt: string
}

interface SourceItem {
  id: string
  title: string
  url: string
  publisher: string | null
  publishedAt: string | null
  excerpt: string
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground',
  approved: 'bg-emerald-500/10 text-emerald-600',
  paused: 'bg-amber-500/10 text-amber-600',
  error: 'bg-red-500/10 text-red-600',
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale === 'en' ? 'en-US' : 'es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function NewsCapsulesSettings() {
  const { t, locale } = useDashboardI18n()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [current, setCurrent] = useState<Capsule | null>(null)

  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [manualText, setManualText] = useState('')
  const [musicTrackId, setMusicTrackId] = useState('')
  const [scriptIntro, setScriptIntro] = useState('')
  const [scriptBody, setScriptBody] = useState('')
  const [scriptClosing, setScriptClosing] = useState('')
  const [summary, setSummary] = useState('')

  const [tracksEvery, setTracksEvery] = useState('')
  const [timesText, setTimesText] = useState('')
  const [hoursEvery, setHoursEvery] = useState('')
  const [startAt, setStartAt] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [priority, setPriority] = useState(5)
  const [minGap, setMinGap] = useState(30)
  const [grace, setGrace] = useState(10)

  const selectedMusic = useMemo(
    () => musicTracks.find((track) => track.id === musicTrackId) || null,
    [musicTracks, musicTrackId]
  )

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [capsulesRes, musicRes] = await Promise.all([
        fetch('/api/dashboard/streaming/news-capsules', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/jingles/music', { cache: 'no-store' }),
      ])
      const capsulesData = await capsulesRes.json().catch(() => ({}))
      if (!capsulesRes.ok) throw new Error(capsulesData?.message || t('streaming.newsCapsules.loadError'))
      setCapsules(Array.isArray(capsulesData.capsules) ? capsulesData.capsules : [])
      if (musicRes.ok) {
        const musicData = await musicRes.json().catch(() => ({}))
        setMusicTracks(Array.isArray(musicData.tracks) ? musicData.tracks : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setTitle('')
    setSourceUrl('')
    setSourceItems([])
    setSelectedItems([])
    setManualText('')
    setMusicTrackId('')
    setScriptIntro('')
    setScriptBody('')
    setScriptClosing('')
    setSummary('')
    setTracksEvery('')
    setTimesText('')
    setHoursEvery('')
    setStartAt('')
    setWindowStart('')
    setWindowEnd('')
    setActiveFrom('')
    setActiveTo('')
    setPriority(5)
    setMinGap(30)
    setGrace(10)
  }

  const openNew = () => {
    setCurrent(null)
    resetForm()
    setEditorOpen(true)
    setError(null)
    setNotice(null)
  }

  const openEdit = (capsule: Capsule) => {
    setCurrent(capsule)
    setTitle(capsule.title)
    setSourceUrl('')
    setSourceItems([])
    setSelectedItems([])
    setManualText(capsule.sourceText || '')
    setMusicTrackId(capsule.musicTrackId || '')
    setScriptIntro(capsule.scriptIntro || '')
    setScriptBody(capsule.scriptBody || '')
    setScriptClosing(capsule.scriptClosing || '')
    setSummary(capsule.summary || '')
    const tracksRule = capsule.rules.find((rule) => rule.kind === 'tracks')
    const timesRule = capsule.rules.find((rule) => rule.kind === 'times')
    const intervalRule = capsule.rules.find((rule) => rule.kind === 'interval_hours')
    setTracksEvery(tracksRule?.config.everyTracks ? String(tracksRule.config.everyTracks) : '')
    setTimesText(timesRule?.config.times?.join(', ') || '')
    setHoursEvery(intervalRule?.config.everyHours ? String(intervalRule.config.everyHours) : '')
    setStartAt(intervalRule?.config.startAt || '')
    setWindowStart(capsule.windowStart || '')
    setWindowEnd(capsule.windowEnd || '')
    setActiveFrom(capsule.activeFrom ? capsule.activeFrom.slice(0, 10) : '')
    setActiveTo(capsule.activeTo ? capsule.activeTo.slice(0, 10) : '')
    setPriority(capsule.priority)
    setMinGap(capsule.minGapMinutes)
    setGrace(capsule.graceMinutes)
    setEditorOpen(true)
    setError(null)
    setNotice(null)
  }

  const updateCapsuleInList = (capsule: Capsule) => {
    setCapsules((prev) => {
      const exists = prev.some((item) => item.id === capsule.id)
      return exists ? prev.map((item) => (item.id === capsule.id ? capsule : item)) : [capsule, ...prev]
    })
    setCurrent(capsule)
  }

  const fetchSource = async () => {
    if (!sourceUrl.trim()) return
    setBusy('source')
    setError(null)
    try {
      const res = await fetch('/api/dashboard/streaming/news-capsules/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.source'))
      const items: SourceItem[] = Array.isArray(data.items) ? data.items : []
      setSourceItems(items)
      setSelectedItems(items.length > 0 ? [items[0].id] : [])
      if (!title && items[0]?.title) setTitle(items[0].title.slice(0, 191))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.source'))
    } finally {
      setBusy(null)
    }
  }

  const createCapsule = async () => {
    setBusy('create')
    setError(null)
    try {
      const items = sourceItems.filter((item) => selectedItems.includes(item.id))
      const res = await fetch('/api/dashboard/streaming/news-capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          items,
          manualText: manualText.trim() || undefined,
          musicTrackId: musicTrackId || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
      showToast({ type: 'success', title: t('streaming.newsCapsules.save') })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const saveDetails = async () => {
    if (!current) return
    setBusy('save')
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        priority,
        minGapMinutes: minGap,
        graceMinutes: grace,
        windowStart: windowStart || null,
        windowEnd: windowEnd || null,
        activeFrom: activeFrom || null,
        activeTo: activeTo || null,
      }
      // Solo enviamos contenido si cambió: el PATCH invalida el audio.
      if (manualText !== (current.sourceText || '')) payload.sourceText = manualText
      if ((musicTrackId || null) !== (current.musicTrackId || null)) payload.musicTrackId = musicTrackId || null
      if (scriptIntro !== (current.scriptIntro || '')) payload.scriptIntro = scriptIntro
      if (scriptBody !== (current.scriptBody || '')) payload.scriptBody = scriptBody
      if (scriptClosing !== (current.scriptClosing || '')) payload.scriptClosing = scriptClosing
      if (summary !== (current.summary || '')) payload.summary = summary
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
      setNotice(t('streaming.newsCapsules.save'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const generateScript = async () => {
    if (!current) {
      await createCapsule()
      return
    }
    setBusy('script')
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/script`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
      setScriptIntro(data.capsule.scriptIntro || '')
      setScriptBody(data.capsule.scriptBody || '')
      setScriptClosing(data.capsule.scriptClosing || '')
      setSummary(data.capsule.summary || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const generateAudio = async () => {
    if (!current) return
    setBusy('audio')
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/audio`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
      setNotice(t('streaming.newsCapsules.audioReady'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const markPreviewed = async () => {
    if (!current) return
    try {
      await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/preview`, { method: 'POST' })
      const previewedAt = new Date().toISOString()
      updateCapsuleInList({ ...current, previewedAt })
    } catch {}
  }

  const approve = async () => {
    if (!current) return
    if (!current.previewedAt) {
      setError(t('streaming.newsCapsules.error.preview'))
      return
    }
    if (!current.audioUrl) {
      setError(t('streaming.newsCapsules.error.audio'))
      return
    }
    setBusy('approve')
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/approve`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
      setNotice(t('streaming.newsCapsules.approved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const saveRules = async () => {
    if (!current) return
    setBusy('rules')
    setError(null)
    try {
      const rules: Array<{ kind: NewsRuleKind; config: Record<string, unknown>; active: boolean }> = []
      if (Number(tracksEvery) > 0) {
        rules.push({ kind: 'tracks', config: { everyTracks: Number(tracksEvery) }, active: true })
      }
      if (timesText.trim()) {
        rules.push({
          kind: 'times',
          config: { times: timesText.split(',').map((value) => value.trim()).filter(Boolean) },
          active: true,
        })
      }
      if (Number(hoursEvery) > 0) {
        rules.push({
          kind: 'interval_hours',
          config: { everyHours: Number(hoursEvery), startAt: startAt || undefined },
          active: true,
        })
      }
      if (rules.length === 0) throw new Error(t('streaming.newsCapsules.rulesHint'))
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
      setNotice(t('streaming.newsCapsules.saveRules'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const togglePause = async (capsule: Capsule) => {
    setBusy(`pause-${capsule.id}`)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${capsule.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: capsule.status !== 'paused' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsuleInList(data.capsule)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const remove = async (capsule: Capsule) => {
    if (!window.confirm(t('streaming.newsCapsules.confirmDelete'))) return
    setBusy(`delete-${capsule.id}`)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${capsule.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('streaming.newsCapsules.error.generic'))
      setCapsules((prev) => prev.filter((item) => item.id !== capsule.id))
      if (current?.id === capsule.id) setEditorOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" />
          {t('streaming.newsCapsules.new')}
        </button>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('streaming.newsCapsules.loading')}</p>
      ) : capsules.length === 0 ? (
        <div className="rounded-panel border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t('streaming.newsCapsules.empty')}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {capsules.map((capsule) => (
            <article key={capsule.id} className="rounded-panel border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{capsule.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('streaming.newsCapsules.nextEmission')}:{' '}
                    {capsule.nextEmissionAt ? formatDate(capsule.nextEmissionAt, locale) : t('streaming.newsCapsules.noNextEmission')}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_CLASS[capsule.status] || STATUS_CLASS.draft}`}>
                  {t(`streaming.newsCapsules.status.${capsule.status === 'deleted' ? 'draft' : capsule.status}`)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {capsule.summary || capsule.musicTrack?.name || t('streaming.newsCapsules.empty')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => openEdit(capsule)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary">
                  {t('streaming.newsCapsules.editor')}
                </button>
                <button type="button" onClick={() => void togglePause(capsule)} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary disabled:opacity-40">
                  {capsule.status === 'paused' ? <PlayIcon className="h-3.5 w-3.5" /> : <PauseIcon className="h-3.5 w-3.5" />}
                  {capsule.status === 'paused' ? t('streaming.newsCapsules.resume') : t('streaming.newsCapsules.pause')}
                </button>
                <button type="button" onClick={() => void remove(capsule)} disabled={busy !== null} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40" aria-label={t('streaming.newsCapsules.delete')}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editorOpen && (
        <section className="rounded-panel border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {current ? t('streaming.newsCapsules.editor') : t('streaming.newsCapsules.new')}
            </h2>
            <button type="button" onClick={() => setEditorOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
              {t('streaming.newsCapsules.close')}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.titleLabel')}</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={191} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
              </label>

              {!current && (
                <>
                  <div className="flex items-end gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.sourceUrl')}</span>
                      <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
                    </label>
                    <button type="button" onClick={() => void fetchSource()} disabled={busy !== null || !sourceUrl.trim()} className="rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary disabled:opacity-40">
                      {busy === 'source' ? t('streaming.newsCapsules.fetchingSource') : t('streaming.newsCapsules.fetchSource')}
                    </button>
                  </div>
                  {sourceItems.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground">{t('streaming.newsCapsules.sourceItems')}</p>
                      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                        {sourceItems.map((item) => (
                          <li key={item.id} className="flex items-start gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={(event) =>
                                setSelectedItems((prev) =>
                                  event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                                )
                              }
                              className="mt-0.5 h-3.5 w-3.5 accent-[var(--brand-500)]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">{item.title}</span>
                              <span className="block truncate text-[10px] text-muted-foreground">{item.publisher || ''}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {current && current.sources.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t('streaming.newsCapsules.sourceItems')}</p>
                  <ul className="space-y-1 rounded-lg border border-border p-2">
                    {current.sources.map((source) => (
                      <li key={source.id} className="truncate text-[10px] text-muted-foreground">
                        <a href={source.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {source.title || source.url}
                        </a>
                        {source.publisher ? ` · ${source.publisher}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.manualText')}</span>
                <textarea value={manualText} onChange={(event) => setManualText(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
                <span className="mt-1 block text-[10px] text-muted-foreground">{t('streaming.newsCapsules.manualTextHint')}</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.music')}</span>
                <select value={musicTrackId} onChange={(event) => setMusicTrackId(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand">
                  <option value="">{t('streaming.newsCapsules.noMusic')}</option>
                  {musicTracks.map((track) => (
                    <option key={track.id} value={track.id}>{track.name}{track.artist ? ` · ${track.artist}` : ''}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[10px] text-muted-foreground">{t('streaming.newsCapsules.musicHint')}</span>
                {selectedMusic && (
                  <div className="mt-2">
                    <EffectPreviewButton src={selectedMusic.url} name={selectedMusic.name} />
                  </div>
                )}
              </label>

              {!current ? (
                <button type="button" onClick={() => void createCapsule()} disabled={busy !== null} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                  {busy === 'create' ? t('streaming.newsCapsules.saving') : t('streaming.newsCapsules.save')}
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void saveDetails()} disabled={busy !== null} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-40">
                    {busy === 'save' ? t('streaming.newsCapsules.saving') : t('streaming.newsCapsules.save')}
                  </button>
                  <button type="button" onClick={() => void generateScript()} disabled={busy !== null} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-40">
                    {busy === 'script' ? t('streaming.newsCapsules.generatingScript') : t('streaming.newsCapsules.generateScript')}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.intro')}</span>
                <textarea value={scriptIntro} onChange={(event) => setScriptIntro(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.body')}</span>
                <textarea value={scriptBody} onChange={(event) => setScriptBody(event.target.value)} rows={5} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.closing')}</span>
                <textarea value={scriptClosing} onChange={(event) => setScriptClosing(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
              </label>

              {current && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => void generateAudio()} disabled={busy !== null} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-40">
                      {busy === 'audio' ? t('streaming.newsCapsules.generatingAudio') : t('streaming.newsCapsules.generateAudio')}
                    </button>
                    <button type="button" onClick={() => void approve()} disabled={busy !== null || !current.audioUrl || !current.previewedAt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                      {t('streaming.newsCapsules.approve')}
                    </button>
                  </div>
                  {current.audioUrl && (
                    <div>
                      <audio controls src={current.audioUrl} onPlay={() => void markPreviewed()} className="w-full" preload="metadata" />
                      <p className="mt-1 text-[10px] text-muted-foreground">{t('streaming.newsCapsules.previewHint')}</p>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <h3 className="text-xs font-semibold text-foreground">{t('streaming.newsCapsules.rules')}</h3>
                    <p className="mt-1 text-[10px] text-muted-foreground">{t('streaming.newsCapsules.rulesHint')}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.everyTracks')}
                        <input type="number" min={1} max={50} value={tracksEvery} onChange={(event) => setTracksEvery(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.everyHours')}
                        <input type="number" min={1} max={24} value={hoursEvery} onChange={(event) => setHoursEvery(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.times')}
                        <input value={timesText} onChange={(event) => setTimesText(event.target.value)} placeholder="08:00, 14:00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                        <span className="mt-1 block text-[9px]">{t('streaming.newsCapsules.timesHint')}</span>
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.startAt')}
                        <input type="time" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.windowFrom')}
                        <input type="time" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.windowTo')}
                        <input type="time" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.activeFrom')}
                        <input type="date" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.activeTo')}
                        <input type="date" value={activeTo} onChange={(event) => setActiveTo(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.priority')}
                        <input type="number" min={1} max={10} value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.minGap')}
                        <input type="number" min={1} value={minGap} onChange={(event) => setMinGap(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t('streaming.newsCapsules.grace')}
                        <input type="number" min={1} max={120} value={grace} onChange={(event) => setGrace(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" />
                      </label>
                    </div>
                    <button type="button" onClick={() => void saveRules()} disabled={busy !== null || current.status !== 'approved'} className="mt-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary disabled:opacity-40">
                      {busy === 'rules' ? t('streaming.newsCapsules.saving') : t('streaming.newsCapsules.saveRules')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
