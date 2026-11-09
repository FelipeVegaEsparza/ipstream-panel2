'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { showToast } from '@/components/ui/toast'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { JingleStyleId, JingleVoiceCharacter } from '@/lib/jingle-fx'
import {
  IMPACT_SFX_IDS,
  INTRO_SFX_IDS,
  OUTRO_SFX_IDS,
  TRANSITION_SFX_IDS,
  type JingleSfxId,
} from '@/lib/jingle-sfx'

interface AiInfo {
  ttsEnabled: boolean
  ttsRemaining: number
  voiceName: string
  voicePreset?: string
  stationName: string
}

interface MusicTrack {
  id: string
  name: string
  artist: string | null
  url: string
  duration: number | null
  size: number
  mimeType: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

const STYLE_OPTIONS = [
  { id: 'classic', label: 'streaming.jingles.ai.fxClassic', hint: 'streaming.jingles.ai.fxClassicHint' },
  { id: 'modern', label: 'streaming.jingles.ai.fxModern', hint: 'streaming.jingles.ai.fxModernHint' },
  { id: 'energy', label: 'streaming.jingles.ai.fxEnergy', hint: 'streaming.jingles.ai.fxEnergyHint' },
  { id: 'cinema', label: 'streaming.jingles.ai.fxCinema', hint: 'streaming.jingles.ai.fxCinemaHint' },
  { id: 'retro', label: 'streaming.jingles.ai.fxRetro', hint: 'streaming.jingles.ai.fxRetroHint' },
  { id: 'pop', label: 'streaming.jingles.ai.fxPop', hint: 'streaming.jingles.ai.fxPopHint' },
  { id: 'chill', label: 'streaming.jingles.ai.fxChill', hint: 'streaming.jingles.ai.fxChillHint' },
  { id: 'news', label: 'streaming.jingles.ai.fxNews', hint: 'streaming.jingles.ai.fxNewsHint' },
  { id: 'sport', label: 'streaming.jingles.ai.fxSport', hint: 'streaming.jingles.ai.fxSportHint' },
  { id: 'kids', label: 'streaming.jingles.ai.fxKids', hint: 'streaming.jingles.ai.fxKidsHint' },
  { id: 'elegant', label: 'streaming.jingles.ai.fxElegant', hint: 'streaming.jingles.ai.fxElegantHint' },
  { id: 'arcade', label: 'streaming.jingles.ai.fxArcade', hint: 'streaming.jingles.ai.fxArcadeHint' },
] as const

const VOICE_CHARACTERS = [
  { id: 'auto', label: 'streaming.jingles.ai.voiceAuto' },
  { id: 'natural', label: 'streaming.jingles.ai.voiceNatural' },
  { id: 'bright', label: 'streaming.jingles.ai.voiceBright' },
  { id: 'warm', label: 'streaming.jingles.ai.voiceWarm' },
  { id: 'deep', label: 'streaming.jingles.ai.voiceDeep' },
  { id: 'phone', label: 'streaming.jingles.ai.voicePhone' },
  { id: 'saturated', label: 'streaming.jingles.ai.voiceSaturated' },
  { id: 'doubled', label: 'streaming.jingles.ai.voiceDoubled' },
] as const

const SFX_LABELS = {
  riser: 'streaming.jingles.ai.sfxRiser',
  sweep: 'streaming.jingles.ai.sfxSweep',
  subdrop: 'streaming.jingles.ai.sfxSubdrop',
  sparkle: 'streaming.jingles.ai.sfxSparkle',
  vinyl: 'streaming.jingles.ai.sfxVinyl',
  impact: 'streaming.jingles.ai.sfxImpact',
  boom: 'streaming.jingles.ai.sfxBoom',
  punch: 'streaming.jingles.ai.sfxPunch',
  thunder: 'streaming.jingles.ai.sfxThunder',
  click: 'streaming.jingles.ai.sfxClick',
  ding: 'streaming.jingles.ai.sfxDing',
  stinger: 'streaming.jingles.ai.sfxStinger',
  reverse: 'streaming.jingles.ai.sfxReverse',
  whoosh: 'streaming.jingles.ai.sfxWhoosh',
  swish: 'streaming.jingles.ai.sfxSwish',
  scratch: 'streaming.jingles.ai.sfxScratch',
  static: 'streaming.jingles.ai.sfxStatic',
  blip: 'streaming.jingles.ai.sfxBlip',
  tapeStop: 'streaming.jingles.ai.sfxTapeStop',
  chime: 'streaming.jingles.ai.sfxChime',
  glitch: 'streaming.jingles.ai.sfxGlitch',
  bassdrop: 'streaming.jingles.ai.sfxBassdrop',
} as const

const SFX_SLOTS = [
  { id: 'intro', label: 'streaming.jingles.ai.sfxSlotIntro', ids: INTRO_SFX_IDS },
  { id: 'impact', label: 'streaming.jingles.ai.sfxSlotImpact', ids: IMPACT_SFX_IDS },
  { id: 'transition', label: 'streaming.jingles.ai.sfxSlotTransition', ids: TRANSITION_SFX_IDS },
  { id: 'outro', label: 'streaming.jingles.ai.sfxSlotOutro', ids: OUTRO_SFX_IDS },
] as const

const STEPS = [
  { id: 'text', label: 'streaming.jingles.ai.stepText' },
  { id: 'music', label: 'streaming.jingles.ai.stepMusic' },
  { id: 'style', label: 'streaming.jingles.ai.stepStyle' },
  { id: 'sounds', label: 'streaming.jingles.ai.stepSounds' },
  { id: 'voice', label: 'streaming.jingles.ai.stepVoice' },
  { id: 'review', label: 'streaming.jingles.ai.stepReview' },
] as const

type SfxSlot = (typeof SFX_SLOTS)[number]['id']
type SfxValue = JingleSfxId | 'auto' | 'none'

const DEFAULT_SFX: Record<SfxSlot, SfxValue> = {
  intro: 'auto',
  impact: 'auto',
  transition: 'auto',
  outro: 'auto',
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function JingleAiModal({ open, onClose, onSaved }: Props) {
  const { t, locale } = useDashboardI18n()
  const [info, setInfo] = useState<AiInfo | null>(null)
  const [title, setTitle] = useState(() => t('streaming.jingles.ai.defaultTitle'))
  const [tagline, setTagline] = useState(() => t('streaming.jingles.ai.defaultTagline'))
  const [duration, setDuration] = useState(10)
  const [step, setStep] = useState(0)
  const [style, setStyle] = useState<JingleStyleId>('modern')
  const [intensity, setIntensity] = useState(65)
  const [voiceFx, setVoiceFx] = useState(true)
  const [sfx, setSfx] = useState<Record<SfxSlot, SfxValue>>(DEFAULT_SFX)
  const [voiceCharacter, setVoiceCharacter] = useState<JingleVoiceCharacter>('auto')
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [musicSelectedId, setMusicSelectedId] = useState<string | null>(null)
  const [musicSavedId, setMusicSavedId] = useState<string | null>(null)
  const [musicLoading, setMusicLoading] = useState(false)
  const [musicSaving, setMusicSaving] = useState(false)
  const [musicUploading, setMusicUploading] = useState(false)
  const [musicError, setMusicError] = useState<string | null>(null)
  const [musicNotice, setMusicNotice] = useState<string | null>(null)
  const [generatedDuration, setGeneratedDuration] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewJingleUrl, setPreviewJingleUrl] = useState<string | null>(null)
  const musicInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setError(null)
    setBlob(null)
    setGeneratedDuration(null)
    setMusicNotice(null)
    setMusicError(null)
    fetch('/api/dashboard/streaming/jingles/ai', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (
          data &&
          typeof data.ttsRemaining === 'number' &&
          typeof data.ttsEnabled === 'boolean'
        ) {
          setInfo(data as AiInfo)
        } else {
          setInfo(null)
        }
      })
      .catch(() => setError(t('streaming.jingles.ai.loadError')))

    setMusicLoading(true)
    fetch('/api/dashboard/streaming/jingles/music', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setMusicTracks(Array.isArray(data.tracks) ? data.tracks : [])
        const selected = typeof data.selectedId === 'string' ? data.selectedId : null
        setMusicSelectedId(selected)
        setMusicSavedId(selected)
      })
      .catch(() => setMusicError(t('streaming.jingles.music.loadError')))
      .finally(() => setMusicLoading(false))
  }, [open])

  useEffect(() => {
    if (!blob) {
      if (previewJingleUrl) URL.revokeObjectURL(previewJingleUrl)
      setPreviewJingleUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreviewJingleUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const configKey = useMemo(
    () =>
      JSON.stringify({
        tagline,
        duration,
        musicSelectedId,
        style,
        intensity,
        voiceFx,
        sfx,
        voiceCharacter,
      }),
    [tagline, duration, musicSelectedId, style, intensity, voiceFx, sfx, voiceCharacter]
  )

  // Si cambia cualquier opción, los previews anteriores dejan de ser válidos.
  useEffect(() => {
    setBlob(null)
    setGeneratedDuration(null)
  }, [configKey])

  if (!open) return null

  const styleOption = STYLE_OPTIONS.find((option) => option.id === style) ?? STYLE_OPTIONS[1]
  const characterOption =
    VOICE_CHARACTERS.find((option) => option.id === voiceCharacter) ?? VOICE_CHARACTERS[0]
  const selectedTrack = musicTracks.find((track) => track.id === musicSelectedId) ?? null
  const taglineReady = tagline.trim().length > 0
  const ttsReady = Boolean(info?.ttsEnabled)
  const musicReady = Boolean(musicSelectedId)
  const musicDirty = musicSelectedId !== musicSavedId
  const musicUsable = musicReady && !musicDirty && !musicSaving
  const canGenerate = musicUsable && ttsReady && taglineReady

  const goTo = (index: number) => {
    if (index > 0 && !taglineReady) {
      setError(t('streaming.jingles.ai.taglineRequired'))
      return
    }
    setError(null)
    setStep(Math.max(0, Math.min(STEPS.length - 1, index)))
  }

  const next = () => {
    if (step === 0 && !taglineReady) {
      setError(t('streaming.jingles.ai.taglineRequired'))
      return
    }
    if (step === 1 && !musicUsable) {
      setError(
        musicDirty
          ? t('streaming.jingles.ai.musicSaving')
          : t('streaming.jingles.ai.musicRequired')
      )
      return
    }
    setError(null)
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
  }

  const back = () => {
    setError(null)
    setStep((current) => Math.max(0, current - 1))
  }

  const reset = () => {
    setStyle('modern')
    setIntensity(65)
    setVoiceFx(true)
    setSfx(DEFAULT_SFX)
    setVoiceCharacter('auto')
  }

  const randomize = () => {
    const pick = <T,>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)]
    setStyle(pick(STYLE_OPTIONS).id)
    setIntensity(pick([55, 65, 70, 75, 80]))
    setSfx({
      intro: pick(['auto', ...INTRO_SFX_IDS] as const),
      impact: pick(['auto', ...IMPACT_SFX_IDS] as const),
      transition: pick(['auto', ...TRANSITION_SFX_IDS] as const),
      outro: pick(['auto', ...OUTRO_SFX_IDS] as const),
    })
    setVoiceCharacter(pick(VOICE_CHARACTERS).id)
  }

  const sfxLabel = (value: SfxValue) => {
    if (value === 'auto') return t('streaming.jingles.ai.sfxAuto')
    if (value === 'none') return t('streaming.jingles.ai.sfxNone')
    return t(SFX_LABELS[value])
  }

  const voicePayload = { character: voiceCharacter }

  const selectMusic = async (id: string | null) => {
    if (id === musicSelectedId || musicSaving) return
    const previous = musicSelectedId
    setMusicSelectedId(id)
    setMusicSaving(true)
    setMusicError(null)
    setMusicNotice(null)
    try {
      const res = await fetch('/api/dashboard/streaming/jingles/music', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicTrackId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.jingles.ai.musicSaveError'))
      setMusicSavedId(id)
      setMusicNotice(t('streaming.jingles.ai.musicSaved'))
    } catch (err) {
      setMusicSelectedId(previous)
      setMusicError(err instanceof Error ? err.message : t('streaming.jingles.ai.musicSaveError'))
    } finally {
      setMusicSaving(false)
    }
  }

  const uploadMusic = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMusicUploading(true)
    setMusicError(null)
    setMusicNotice(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/dashboard/streaming/jingles/music', {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || data?.error || t('streaming.jingles.ai.musicUploadError'))
      }
      const track = data.track as MusicTrack
      setMusicTracks((prev) => [track, ...prev.filter((item) => item.id !== track.id)])
      setMusicSelectedId(track.id)
      setMusicSavedId(track.id)
      setMusicNotice(t('streaming.jingles.ai.musicUploaded'))
    } catch (err) {
      setMusicError(err instanceof Error ? err.message : t('streaming.jingles.ai.musicUploadError'))
    } finally {
      setMusicUploading(false)
    }
  }

  const generate = async () => {
    setGenerating(true)
    setError(null)
    setBlob(null)
    setGeneratedDuration(null)
    try {
      const res = await fetch('/api/dashboard/streaming/jingles/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline,
          duration,
          style,
          intensity,
          voiceFx,
          sfx,
          voice: voicePayload,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || t('streaming.jingles.ai.generateError'))
      }
      setBlob(await res.blob())
      const headerDuration = Number(res.headers.get('X-Jingle-Duration'))
      if (Number.isFinite(headerDuration) && headerDuration > 0) setGeneratedDuration(headerDuration)
      setInfo((prev) => prev ? {
        ...prev,
        ttsRemaining: Number(res.headers.get('X-AI-Remaining') ?? prev.ttsRemaining),
      } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.jingles.ai.generateError'))
    } finally {
      setGenerating(false)
    }
  }

  const save = async () => {
    if (!blob) return
    setSaving(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', new File([blob], `jingle-ia-${Date.now()}.mp3`, { type: 'audio/mpeg' }))
      form.append('title', title)
      const res = await fetch('/api/dashboard/streaming/jingles/ai/save', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.jingles.ai.saveError'))
      showToast({ type: 'success', title: t('streaming.jingles.ai.saved') })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.jingles.ai.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const reviewRows = [
    {
      id: 0,
      label: t('streaming.jingles.ai.reviewText'),
      value: `${tagline.trim() || '—'} · ${t('streaming.jingles.ai.secondsShort', { count: duration })}`,
    },
    {
      id: 1,
      label: t('streaming.jingles.ai.stepMusic'),
      value: selectedTrack
        ? `${selectedTrack.name}${selectedTrack.artist ? ` · ${selectedTrack.artist}` : ''}`
        : t('streaming.jingles.music.none'),
    },
    {
      id: 2,
      label: t('streaming.jingles.ai.reviewStyle'),
      value: `${t(styleOption.label)} · ${intensity}%`,
    },
    {
      id: 3,
      label: t('streaming.jingles.ai.reviewSounds'),
      value: SFX_SLOTS.map((slot) => `${t(slot.label)}: ${sfxLabel(sfx[slot.id])}`).join(' · '),
    },
    {
      id: 4,
      label: t('streaming.jingles.ai.reviewVoice'),
      value: voiceFx
        ? `${t(characterOption.label)} · ${t('streaming.jingles.ai.effectsOn')}`
        : t('streaming.jingles.ai.effectsOff'),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-container border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <SparklesIcon className="h-5 w-5 text-brand" />
              {t('streaming.jingles.ai.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('streaming.jingles.ai.subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label={t('streaming.jingles.ai.close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((item, index) => {
            const active = index === step
            const done = index < step
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                className={`flex flex-none items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                  active
                    ? 'bg-brand/15 text-brand'
                    : done
                      ? 'text-foreground hover:bg-secondary'
                      : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                    active
                      ? 'bg-brand text-white'
                      : done
                        ? 'bg-brand/20 text-brand'
                        : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="hidden sm:inline">{t(item.label)}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-1 rounded-full bg-brand transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">
          {t('streaming.jingles.ai.stepOf', { current: step + 1, total: STEPS.length })}
        </p>

        <div className="mt-4">
          {step === 0 && (
            <div className="grid gap-3">
              <p className="text-[11px] text-muted-foreground">{t('streaming.jingles.ai.stepTextHint')}</p>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('streaming.jingles.ai.name')}</label>
                <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} />
              </div>
              {info && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>{t('streaming.jingles.ai.voice')}: <span className="text-foreground">{info.voiceName}</span></span>
                  <span>·</span>
                  <span className="font-mono text-foreground">
                    {t('streaming.jingles.ai.characters', { count: info.ttsRemaining.toLocaleString(locale === 'en' ? 'en-US' : 'es-CL') })}
                  </span>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('streaming.jingles.ai.voiceover')}</label>
                <textarea className={`${input} resize-none`} rows={3} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={300} />
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{t('streaming.jingles.ai.voiceoverNote')}</span>
                  <span className="font-mono">{tagline.length}/300</span>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">{t('streaming.jingles.ai.duration')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 30].map((value) => (
                    <label key={value} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs sm:text-sm ${duration === value ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-background text-foreground'}`}>
                      <input
                        type="radio"
                        name="jingle-duration"
                        checked={duration === value}
                        onChange={() => setDuration(value)}
                        className="sr-only"
                      />
                      {t('streaming.jingles.ai.seconds', { count: value })}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">{t('streaming.jingles.ai.stepMusicHint')}</p>
                <button
                  type="button"
                  onClick={() => musicInputRef.current?.click()}
                  disabled={musicUploading || musicSaving}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
                >
                  <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                  {musicUploading
                    ? t('streaming.jingles.ai.musicUploading')
                    : t('streaming.jingles.ai.musicUpload')}
                </button>
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(event) => void uploadMusic(event)}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{t('streaming.jingles.ai.musicUploadHint')}</p>
              <div className="mt-3">
                {musicLoading ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">{t('streaming.jingles.music.loading')}</p>
                ) : musicTracks.length === 0 ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    {t('streaming.jingles.music.empty')}
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    <li className="flex items-center gap-3 px-3 py-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="jingle-music"
                          checked={musicSelectedId === null}
                          disabled={musicSaving || musicUploading}
                          onChange={() => void selectMusic(null)}
                          className="h-4 w-4 accent-[var(--brand-500)]"
                        />
                        <span className="text-xs text-muted-foreground">{t('streaming.jingles.music.none')}</span>
                      </label>
                    </li>
                    {musicTracks.map((track) => (
                      <li key={track.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="radio"
                            name="jingle-music"
                            checked={musicSelectedId === track.id}
                            disabled={musicSaving || musicUploading}
                            onChange={() => void selectMusic(track.id)}
                            className="h-4 w-4 accent-[var(--brand-500)]"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{track.name}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {track.artist ? `${track.artist} · ` : ''}{formatDuration(track.duration)}
                            </span>
                          </span>
                        </label>
                        <EffectPreviewButton src={track.url} name={track.name} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {musicSaving && <p className="mt-2 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.musicSaving')}</p>}
              {musicNotice && !musicSaving && <p className="mt-2 text-[11px] text-emerald-300">{musicNotice}</p>}
              {musicError && <p className="mt-2 text-[11px] text-red-300">{musicError}</p>}
              <p className="mt-2 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.musicSelectHint')}</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">{t('streaming.jingles.ai.stepStyleHint')}</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={randomize}
                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    <SparklesIcon className="h-3 w-3" />
                    {t('streaming.jingles.ai.randomize')}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowPathIcon className="h-3 w-3" />
                    {t('streaming.jingles.ai.reset')}
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STYLE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
                      style === option.id
                        ? 'border-brand bg-brand/10'
                        : 'border-border bg-background hover:border-brand/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jingle-style"
                      checked={style === option.id}
                      onChange={() => setStyle(option.id)}
                      className="sr-only"
                    />
                    <span className={`block text-sm font-medium ${style === option.id ? 'text-brand' : 'text-foreground'}`}>
                      {t(option.label)}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      {t(option.hint)}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    {t('streaming.jingles.ai.fxIntensity')}
                    <span className="font-mono text-foreground">{intensity}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={intensity}
                    onChange={(event) => setIntensity(Number(event.target.value))}
                    className="w-full accent-[var(--brand-500)]"
                  />
                </label>
                <p className="mt-2 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.fxHint')}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.intensityHint')}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-[11px] text-muted-foreground">{t('streaming.jingles.ai.stepSoundsHint')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {SFX_SLOTS.map((slot) => (
                  <div key={slot.id}>
                    <span className="mb-1 block text-xs text-muted-foreground">{t(slot.label)}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={sfx[slot.id]}
                        onChange={(event) =>
                          setSfx((prev) => ({ ...prev, [slot.id]: event.target.value as SfxValue }))
                        }
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
                      >
                        <option value="auto">{t('streaming.jingles.ai.sfxAuto')}</option>
                        {slot.ids.map((id) => (
                          <option key={id} value={id}>
                            {t(SFX_LABELS[id])}
                          </option>
                        ))}
                        <option value="none">{t('streaming.jingles.ai.sfxNone')}</option>
                      </select>
                      {sfx[slot.id] !== 'auto' && sfx[slot.id] !== 'none' && (
                        <EffectPreviewButton
                          src={`/api/dashboard/streaming/jingles/sfx/${sfx[slot.id]}`}
                          name={sfxLabel(sfx[slot.id])}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.soundsHint')}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.transitionPhraseHint')}</p>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-[11px] text-muted-foreground">{t('streaming.jingles.ai.stepVoiceHint')}</p>
              <label className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <input
                  type="checkbox"
                  checked={voiceFx}
                  onChange={(event) => setVoiceFx(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[var(--brand-500)]"
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{t('streaming.jingles.ai.fxVoice')}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{t('streaming.jingles.ai.fxVoiceHint')}</span>
                </span>
              </label>
              <span className="mb-1 mt-4 block text-xs text-muted-foreground">{t('streaming.jingles.ai.voiceCharacter')}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {VOICE_CHARACTERS.map((option) => (
                  <label
                    key={option.id}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-center text-xs transition-colors ${
                      voiceCharacter === option.id
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-background text-foreground hover:border-brand/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jingle-voice-character"
                      checked={voiceCharacter === option.id}
                      onChange={() => setVoiceCharacter(option.id)}
                      className="sr-only"
                    />
                    {t(option.label)}
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('streaming.jingles.ai.reviewTitle')}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.stepReviewHint')}</p>
              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {reviewRows.map((row) => (
                  <div key={row.id} className="flex items-start gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
                      <p className="mt-0.5 break-words text-xs text-foreground">{row.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goTo(row.id)}
                      className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {t('streaming.jingles.ai.edit')}
                    </button>
                  </div>
                ))}
              </div>

              {!musicReady && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {t('streaming.jingles.ai.musicRequired')}
                </p>
              )}

              {generatedDuration != null && generatedDuration > duration + 0.05 && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {t('streaming.jingles.ai.fxExtended', { duration: generatedDuration.toFixed(1) })}
                </p>
              )}

              {previewJingleUrl && (
                <>
                  <audio src={previewJingleUrl} controls className="mt-3 w-full" preload="metadata" />
                  <p className="mt-2 text-[11px] text-muted-foreground">{t('streaming.jingles.ai.regenerateFree')}</p>
                </>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
            {t('streaming.jingles.ai.cancel')}
          </button>
          {blob && (
            <button
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {saving ? t('streaming.jingles.ai.publishing') : t('streaming.jingles.ai.publish')}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                {t('streaming.jingles.ai.back')}
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={step === 0 && !taglineReady}
                className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('streaming.jingles.ai.next')}
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => void generate()}
                disabled={generating || !canGenerate}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PlayIcon className="h-4 w-4" />
                {generating
                  ? t('streaming.jingles.ai.generating')
                  : t('streaming.jingles.ai.generateReview')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
