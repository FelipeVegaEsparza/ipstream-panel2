'use client'

import { useEffect, useMemo, useState } from 'react'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { showToast } from '@/components/ui/toast'
import { ArrowDownIcon, ArrowUpIcon, PauseIcon, PlayIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { NewsRuleKind } from '@/lib/news-capsules/types'

interface MusicTrack {
  id: string
  name: string
  artist: string | null
  url: string
}

interface CapsuleItem {
  id: string
  order: number
  title: string
  sourceUrl: string | null
  publisher: string | null
  sourceTitle: string | null
  sourceText: string | null
  summary: string | null
}

interface CapsuleRule {
  id: string
  kind: NewsRuleKind
  config: { everyTracks?: number; times?: string[]; everyHours?: number; startAt?: string }
  days: number[] | null
  active: boolean
}

interface Capsule {
  id: string
  title: string
  status: 'draft' | 'approved' | 'paused' | 'error' | 'deleted'
  scriptIntro: string | null
  scriptBody: string | null
  scriptClosing: string | null
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
  items: CapsuleItem[]
  rules: CapsuleRule[]
  nextEmissionAt: string | null
  createdAt: string
}

interface FeedItem {
  id: string
  title: string
  url: string
  publisher: string | null
  publishedAt: string | null
  excerpt: string
}

interface DraftItem {
  key: string
  title: string
  sourceUrl: string | null
  publisher: string | null
  sourceText: string | null
  summary: string
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
  return date.toLocaleString(locale === 'en' ? 'en-US' : 'es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

function makeDraft(partial: Partial<DraftItem> = {}): DraftItem {
  return {
    key: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: partial.title || '',
    sourceUrl: partial.sourceUrl || null,
    publisher: partial.publisher || null,
    sourceText: partial.sourceText || null,
    summary: partial.summary || '',
  }
}

export function NewsCapsulesSettings() {
  const { t, locale } = useDashboardI18n()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [current, setCurrent] = useState<Capsule | null>(null)
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [intro, setIntro] = useState('')
  const [closing, setClosing] = useState('')
  const [musicTrackId, setMusicTrackId] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [selectedFeed, setSelectedFeed] = useState<string[]>([])

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
      const data = await capsulesRes.json().catch(() => ({}))
      if (!capsulesRes.ok) throw new Error(data?.message || t('streaming.newsCapsules.loadError'))
      setCapsules(Array.isArray(data.capsules) ? data.capsules : [])
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
    setItems([])
    setIntro('')
    setClosing('')
    setMusicTrackId('')
    setSourceUrl('')
    setFeedItems([])
    setSelectedFeed([])
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
    setStep(0)
    setModalOpen(true)
    setError(null)
    setNotice(null)
  }

  const applyCapsuleToForm = (capsule: Capsule, initialStep = 0) => {
    setCurrent(capsule)
    setTitle(capsule.title)
    const capsuleItems = Array.isArray(capsule.items) ? capsule.items : []
    const legacyText = capsule.scriptBody || ''
    setItems(
      capsuleItems.length > 0
        ? capsuleItems.map((item) =>
            makeDraft({
              title: item.title,
              sourceUrl: item.sourceUrl,
              publisher: item.publisher,
              summary: item.summary || '',
              sourceText: item.sourceText,
            })
          )
        : legacyText
          ? [makeDraft({ title: capsule.title, sourceText: legacyText, summary: '' })]
          : []
    )
    setIntro(capsule.scriptIntro || '')
    setClosing(capsule.scriptClosing || '')
    setMusicTrackId(capsule.musicTrackId || '')
    const capsuleRules = Array.isArray(capsule.rules) ? capsule.rules : []
    const tracksRule = capsuleRules.find((rule) => rule.kind === 'tracks')
    const timesRule = capsuleRules.find((rule) => rule.kind === 'times')
    const intervalRule = capsuleRules.find((rule) => rule.kind === 'interval_hours')
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
    setStep(initialStep)
    setModalOpen(true)
    setError(null)
    setNotice(null)
  }

  // Siempre carga la cápsula desde la API para no depender del estado de la
  // lista (reglas/noticias viejas o incompletas). Si falla, usa la tarjeta.
  const openEdit = async (capsule: Capsule, initialStep = 0) => {
    let fresh = capsule
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${capsule.id}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.capsule) fresh = data.capsule as Capsule
    } catch {
      // Fallback a los datos de la tarjeta.
    } finally {
      clearTimeout(timer)
    }
    applyCapsuleToForm(fresh, initialStep)
  }

  const updateCapsule = (capsule: Capsule) => {
    setCapsules((prev) => {
      const exists = prev.some((item) => item.id === capsule.id)
      return exists ? prev.map((item) => (item.id === capsule.id ? capsule : item)) : [capsule, ...prev]
    })
    setCurrent(capsule)
  }

  const fetchSource = async (urlOverride?: string) => {
    const url = (urlOverride || sourceUrl).trim()
    if (!url) return
    setSourceUrl(url)
    setBusy('source')
    setError(null)
    try {
      const res = await fetch('/api/dashboard/streaming/news-capsules/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.source'))
      const found: FeedItem[] = Array.isArray(data.items) ? data.items : []
      if (data.kind === 'article' && found[0]) {
        setItems((prev) => [
          ...prev,
          makeDraft({
            title: found[0].title,
            sourceUrl: found[0].url,
            publisher: found[0].publisher,
            sourceText: typeof data.articleText === 'string' ? data.articleText : found[0].excerpt,
            summary: '',
          }),
        ])
        setFeedItems([])
        setSelectedFeed([])
        if (!title) setTitle(found[0].title.slice(0, 191))
      } else {
        setFeedItems(found)
        setSelectedFeed(found.length > 0 ? [found[0].id] : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.source'))
    } finally {
      setBusy(null)
    }
  }

  const addSelectedFeed = () => {
    const selected = feedItems.filter((item) => selectedFeed.includes(item.id))
    if (selected.length === 0) return
    setItems((prev) => [
      ...prev,
      ...selected.map((item) =>
        makeDraft({
          title: item.title,
          sourceUrl: item.url,
          publisher: item.publisher,
          sourceText: item.excerpt,
        })
      ),
    ])
    setFeedItems([])
    setSelectedFeed([])
    if (!title && selected[0]) setTitle(selected[0].title.slice(0, 191))
  }

  const addManual = () => {
    setItems((prev) => [...prev, makeDraft({ title: '', sourceText: '' })])
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const persistDraft = async (): Promise<Capsule | null> => {
    if (items.length === 0) {
      setError(t('streaming.newsCapsules.noItems'))
      return null
    }
    const payloadItems = items.map((item) => ({
      title: item.title.trim() || 'Noticia sin título',
      sourceUrl: item.sourceUrl,
      publisher: item.publisher,
      sourceTitle: item.title,
      text: item.sourceText,
      summary: item.summary,
    }))
    try {
      if (!current) {
        const res = await fetch('/api/dashboard/streaming/news-capsules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || payloadItems[0].title,
            items: payloadItems,
            musicTrackId: musicTrackId || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
        updateCapsule(data.capsule)
        setTitle(data.capsule.title)
        setIntro(data.capsule.scriptIntro || '')
        setClosing(data.capsule.scriptClosing || '')
        return data.capsule
      }

      const itemsRes = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadItems }),
      })
      const itemsData = await itemsRes.json().catch(() => ({}))
      if (!itemsRes.ok) throw new Error(itemsData?.message || t('streaming.newsCapsules.error.generic'))
      const patchRes = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || current.title,
          scriptIntro: intro,
          scriptClosing: closing,
          musicTrackId: musicTrackId || null,
          priority,
          minGapMinutes: minGap,
          graceMinutes: grace,
          windowStart: windowStart || null,
          windowEnd: windowEnd || null,
          activeFrom: activeFrom || null,
          activeTo: activeTo || null,
        }),
      })
      const patchData = await patchRes.json().catch(() => ({}))
      if (!patchRes.ok) throw new Error(patchData?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsule(patchData.capsule)
      return patchData.capsule
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
      return null
    }
  }

  const syncFromCapsule = (capsule: Capsule) => {
    updateCapsule(capsule)
    setIntro(capsule.scriptIntro || '')
    setClosing(capsule.scriptClosing || '')
    setItems(
      capsule.items.map((item) =>
        makeDraft({
          title: item.title,
          sourceUrl: item.sourceUrl,
          publisher: item.publisher,
          summary: item.summary || '',
        })
      )
    )
  }

  const goNext = () => {
    setError(null)
    if (step === 0 && items.length === 0) {
      setError(t('streaming.newsCapsules.noItems'))
      return
    }
    setStep((value) => Math.min(2, value + 1))
  }

  const generateScript = async () => {
    setBusy('script')
    setError(null)
    const target = await persistDraft()
    if (!target) {
      setBusy(null)
      return
    }
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${target.id}/script`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      syncFromCapsule(data.capsule)
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const generateAudio = async () => {
    setBusy('audio')
    setError(null)
    const saved = await persistDraft()
    if (!saved) {
      setBusy(null)
      return
    }
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${saved.id}/audio`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      syncFromCapsule(data.capsule)
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
      updateCapsule({ ...current, previewedAt: new Date().toISOString() })
    } catch {}
  }

  const approve = async () => {
    if (!current) return
    setBusy('approve')
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/approve`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsule(data.capsule)
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
      if (Number(tracksEvery) > 0) rules.push({ kind: 'tracks', config: { everyTracks: Number(tracksEvery) }, active: true })
      if (timesText.trim()) {
        const times = timesText.split(',').map((value) => value.trim()).filter(Boolean)
        const invalid = times.find((value) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
        if (invalid) throw new Error(t('streaming.newsCapsules.invalidTime').replace('{value}', invalid))
        rules.push({ kind: 'times', config: { times }, active: true })
      }
      if (Number(hoursEvery) > 0) {
        rules.push({ kind: 'interval_hours', config: { everyHours: Number(hoursEvery), startAt: startAt || undefined }, active: true })
      }
      if (rules.length === 0 && startAt) throw new Error(t('streaming.newsCapsules.startAtNeedsInterval'))
      if (rules.length === 0) throw new Error(t('streaming.newsCapsules.noSchedule'))
      const res = await fetch(`/api/dashboard/streaming/news-capsules/${current.id}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || t('streaming.newsCapsules.error.generic'))
      updateCapsule(data.capsule)
      setNotice(t('streaming.newsCapsules.saveRules'))
      setModalOpen(false)
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
      updateCapsule(data.capsule)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.newsCapsules.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">
          <PlusIcon className="h-4 w-4" /> {t('streaming.newsCapsules.new')}
        </button>
      </div>

      {error && !modalOpen && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && !modalOpen && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('streaming.newsCapsules.loading')}</p>
      ) : capsules.length === 0 ? (
        <div className="rounded-panel border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t('streaming.newsCapsules.empty')}</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {capsules.map((capsule) => (
            <article key={capsule.id} className="rounded-panel border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{capsule.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('streaming.newsCapsules.nextEmission')}: {capsule.nextEmissionAt ? formatDate(capsule.nextEmissionAt, locale) : t('streaming.newsCapsules.noNextEmission')}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_CLASS[capsule.status] || STATUS_CLASS.draft}`}>
                  {t(`streaming.newsCapsules.status.${capsule.status === 'deleted' ? 'draft' : capsule.status}`)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{capsule.items.length} · {capsule.musicTrack?.name || t('streaming.newsCapsules.noMusic')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void openEdit(capsule)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary">{t('streaming.newsCapsules.editor')}</button>
                <button type="button" onClick={() => void openEdit(capsule, 2)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary">{t('streaming.newsCapsules.rules')}</button>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setModalOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-container border border-border bg-card p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{current ? t('streaming.newsCapsules.editor') : t('streaming.newsCapsules.new')}</h2>
                <div className="mt-2 flex gap-1 text-[11px]">
                  {[t('streaming.newsCapsules.stepNews'), t('streaming.newsCapsules.stepScript'), t('streaming.newsCapsules.stepPublish')].map((label, index) => (
                    <span key={label} className={`rounded-full px-2 py-1 ${index === step ? 'bg-brand/15 text-brand' : 'text-muted-foreground'}`}>{index + 1}. {label}</span>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label={t('streaming.newsCapsules.close')}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            {step === 0 && (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.titleLabel')}</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={191} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
                </label>

                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.sourceUrl')}</span>
                    <input
                      value={sourceUrl}
                      onChange={(event) => setSourceUrl(event.target.value)}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData('text')
                        if (!pasted.trim()) return
                        event.preventDefault()
                        setSourceUrl(pasted.trim())
                        void fetchSource(pasted.trim())
                      }}
                      placeholder="https://…"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                    />
                  </label>
                  <button type="button" onClick={() => void fetchSource()} disabled={busy !== null || !sourceUrl.trim()} className="rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary disabled:opacity-40">
                    {busy === 'source' ? t('streaming.newsCapsules.fetchingSource') : t('streaming.newsCapsules.fetchSource')}
                  </button>
                </div>

                {feedItems.length > 0 && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{t('streaming.newsCapsules.sourceItems')}</p>
                      <button type="button" onClick={addSelectedFeed} className="rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-medium text-white">{t('streaming.newsCapsules.addSelected')}</button>
                    </div>
                    <ul className="max-h-48 space-y-2 overflow-y-auto">
                      {feedItems.map((item) => (
                        <li key={item.id} className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedFeed.includes(item.id)}
                            onChange={(event) =>
                              setSelectedFeed((prev) => event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))
                            }
                            className="mt-0.5 h-3.5 w-3.5 accent-[var(--brand-500)]"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground">{item.title}</span>
                            <span className="block text-[10px] text-muted-foreground">{item.publisher || ''}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">{t('streaming.newsCapsules.sourceItems')}</p>
                  <button type="button" onClick={addManual} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-foreground hover:bg-secondary">{t('streaming.newsCapsules.addManual')}</button>
                </div>

                <div className="space-y-3">
                  {items.length === 0 && <p className="text-xs text-muted-foreground">{t('streaming.newsCapsules.noItems')}</p>}
                  {items.map((item, index) => (
                    <div key={item.key} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground">{index + 1}</span>
                        <input
                          value={item.title}
                          onChange={(event) => setItems((prev) => prev.map((entry) => entry.key === item.key ? { ...entry, title: event.target.value } : entry))}
                          placeholder={t('streaming.newsCapsules.itemTitle')}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
                        />
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={t('streaming.newsCapsules.moveUp')}><ArrowUpIcon className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={t('streaming.newsCapsules.moveDown')}><ArrowDownIcon className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setItems((prev) => prev.filter((entry) => entry.key !== item.key))} className="rounded p-1 text-muted-foreground hover:text-red-500" aria-label={t('streaming.newsCapsules.remove')}><TrashIcon className="h-3.5 w-3.5" /></button>
                      </div>
                      <textarea
                        value={item.sourceText || ''}
                        onChange={(event) => setItems((prev) => prev.map((entry) => entry.key === item.key ? { ...entry, sourceText: event.target.value } : entry))}
                        rows={2}
                        placeholder={t('streaming.newsCapsules.itemText')}
                        className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <button type="button" onClick={() => void generateScript()} disabled={busy !== null} className="rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary disabled:opacity-40">
                    {busy === 'script' ? t('streaming.newsCapsules.generatingScript') : t('streaming.newsCapsules.generateSummaries')}
                  </button>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.intro')}</span>
                  <textarea value={intro} onChange={(event) => setIntro(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
                </label>
                {items.map((item, index) => (
                  <div key={item.key} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium text-foreground">{index + 1}. {item.title}</p>
                    <textarea
                      value={item.summary}
                      onChange={(event) => setItems((prev) => prev.map((entry) => entry.key === item.key ? { ...entry, summary: event.target.value.slice(0, 300) } : entry))}
                      rows={3}
                      maxLength={300}
                      placeholder={t('streaming.newsCapsules.itemSummary')}
                      className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
                    />
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{item.summary.length}/300</p>
                  </div>
                ))}
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.closing')}</span>
                  <textarea value={closing} onChange={(event) => setClosing(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{t('streaming.newsCapsules.music')}</span>
                  <select value={musicTrackId} onChange={(event) => setMusicTrackId(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand">
                    <option value="">{t('streaming.newsCapsules.noMusic')}</option>
                    {musicTracks.map((track) => <option key={track.id} value={track.id}>{track.name}{track.artist ? ` · ${track.artist}` : ''}</option>)}
                  </select>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{t('streaming.newsCapsules.musicHint')}</span>
                  {selectedMusic && <div className="mt-2"><EffectPreviewButton src={selectedMusic.url} name={selectedMusic.name} /></div>}
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void generateAudio()} disabled={busy !== null} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                    {busy === 'audio' ? t('streaming.newsCapsules.generatingAudio') : t('streaming.newsCapsules.generateAudio')}
                  </button>
                  <button type="button" onClick={() => void approve()} disabled={busy !== null || !current?.audioUrl || !current?.previewedAt} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-40">
                    {t('streaming.newsCapsules.approve')}
                  </button>
                </div>
                {current?.audioUrl && (
                  <div>
                    <audio controls src={current.audioUrl} onPlay={() => void markPreviewed()} className="w-full" preload="metadata" />
                    <p className="mt-1 text-[10px] text-muted-foreground">{t('streaming.newsCapsules.previewHint')}</p>
                  </div>
                )}

                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold text-foreground">{t('streaming.newsCapsules.rules')}</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">{t('streaming.newsCapsules.rulesHint')}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.everyTracks')}<input type="number" min={1} max={50} value={tracksEvery} onChange={(event) => setTracksEvery(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.times')}<input value={timesText} onChange={(event) => setTimesText(event.target.value)} placeholder="08:00, 14:00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /><span className="mt-1 block text-[9px]">{t('streaming.newsCapsules.timesHint')}</span></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.everyHours')}<input type="number" min={1} max={24} value={hoursEvery} onChange={(event) => setHoursEvery(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.startAt')}<input type="time" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /><span className="mt-1 block text-[9px]">{t('streaming.newsCapsules.startAtHint')}</span></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.windowFrom')}<input type="time" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.windowTo')}<input type="time" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.activeFrom')}<input type="date" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.activeTo')}<input type="date" value={activeTo} onChange={(event) => setActiveTo(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.priority')}<input type="number" min={1} max={10} value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.minGap')}<input type="number" min={1} value={minGap} onChange={(event) => setMinGap(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                    <label className="text-[11px] text-muted-foreground">{t('streaming.newsCapsules.grace')}<input type="number" min={1} max={120} value={grace} onChange={(event) => setGrace(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand" /></label>
                  </div>
                  <button type="button" onClick={() => void saveRules()} disabled={busy !== null || current?.status !== 'approved'} className="mt-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary disabled:opacity-40">
                    {busy === 'rules' ? t('streaming.newsCapsules.saving') : t('streaming.newsCapsules.saveRules')}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">{t('streaming.newsCapsules.cancel')}</button>
              <div className="flex gap-2">
                {step > 0 && <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">{t('streaming.newsCapsules.back')}</button>}
                {step < 2 ? (
                  <button type="button" onClick={() => void goNext()} disabled={busy !== null} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                    {busy === 'persist' ? t('streaming.newsCapsules.saving') : t('streaming.newsCapsules.next')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
