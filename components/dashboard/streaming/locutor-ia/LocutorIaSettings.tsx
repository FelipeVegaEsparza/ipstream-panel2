'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { showToast } from '@/components/ui/toast'
import { SparklesIcon, PlusIcon, Trash2Icon, PlayIcon, SaveIcon } from 'lucide-react'
import { DEFAULT_PRESENTER_PHRASES } from '@/lib/live-console/presenter'
import { TTS_QUALITY_PRESETS } from '@/lib/tts-quality'
import { AiCreditsCard } from '@/components/dashboard/AiCreditsCard'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Config {
  enabled: boolean
  every: number
  phrases: string[]
  voiceId: string
  voiceStyle: number
  voicePreset?: string
  globalVoicePreset?: string
  effectiveVoicePreset?: string
  voices: { id: string; name: string; description?: string }[]
  provider?: 'elevenlabs' | 'fish'
  timeEveryMinutes: number
  weatherEveryMinutes: number
  aiEnabled: boolean
  remaining: number
  limit: number
  used: number
  period: string
  stationName: string
}

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

const INTERVALS = [0, 15, 30, 60, 120, 180, 240]

export function LocutorIaSettings() {
  const { t } = useDashboardI18n()
  const [config, setConfig] = useState<Config | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [every, setEvery] = useState(3)
  const [phrases, setPhrases] = useState<string[]>([...DEFAULT_PRESENTER_PHRASES])
  const [voiceId, setVoiceId] = useState('')
  const [voiceStyle, setVoiceStyle] = useState(0)
  const [voicePreset, setVoicePreset] = useState('')
  const [timeEveryMinutes, setTimeEveryMinutes] = useState(0)
  const [weatherEveryMinutes, setWeatherEveryMinutes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/streaming/ai/config', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.locutor.loadError'))
      setConfig(data)
      setEnabled(Boolean(data.enabled))
      setEvery(Number(data.every) || 3)
      setPhrases(Array.isArray(data.phrases) && data.phrases.length ? data.phrases : [...DEFAULT_PRESENTER_PHRASES])
      setVoiceId(data.voiceId || '')
      setVoiceStyle(Number(data.voiceStyle) || 0)
      setVoicePreset(data.voicePreset || '')
      setTimeEveryMinutes(Number(data.timeEveryMinutes) || 0)
      setWeatherEveryMinutes(Number(data.weatherEveryMinutes) || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.locutor.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async (): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const clean = phrases.map((phrase) => phrase.trim()).filter(Boolean)
      const res = await fetch('/api/dashboard/streaming/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          every,
          phrases: clean.length ? clean : DEFAULT_PRESENTER_PHRASES,
          voiceId,
          voiceStyle,
          voicePreset,
          timeEveryMinutes,
          weatherEveryMinutes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.locutor.saveError'))
      setConfig(data)
      setPhrases(Array.isArray(data.phrases) && data.phrases.length ? data.phrases : clean)
      showToast({ type: 'success', title: t('streaming.locutor.saveSuccess') })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.locutor.saveError'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const applyAutoDj = async () => {
    if (!enabled) {
      setError(t('streaming.locutor.enableBeforeApply'))
      return
    }
    setApplying(true)
    setError(null)
    setApplyMessage(null)
    try {
      const saved = await save()
      if (!saved) return
      const res = await fetch('/api/dashboard/streaming/ai/autodj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.locutor.autodjError'))
      setApplyMessage(data.message || t('streaming.locutor.autodjUpdated'))
      showToast({ type: 'success', title: data.message || t('streaming.locutor.autodjUpdated') })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.locutor.autodjError'))
    } finally {
      setApplying(false)
    }
  }

  const updatePhrase = (index: number, value: string) => {
    setPhrases((prev) => prev.map((phrase, i) => (i === index ? value.slice(0, 240) : phrase)))
  }

  const addPhrase = () => {
    if (phrases.length >= 20) return
    setPhrases((prev) => [...prev, t('streaming.locutor.defaultPhrase')])
  }

  const removePhrase = (index: number) => {
    setPhrases((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return <div className="card text-sm text-muted-foreground">{t('streaming.locutor.loading')}</div>
  }

  if (!config) {
    return <div className="card text-sm text-red-300">{error || t('streaming.locutor.loadErrorShort')}</div>
  }

  if (!config.aiEnabled) {
    return (
      <div className="card max-w-2xl space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <SparklesIcon className="h-5 w-5 text-brand" />
          {t('streaming.locutor.requirePlanTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('streaming.locutor.requirePlanText')}
        </p>
        <Link href="/dashboard/streaming/live" className="text-sm text-brand hover:underline">
          {t('streaming.locutor.goLive')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-5">
      <AiCreditsCard
        limit={config.limit}
        used={config.used}
        remaining={config.remaining}
        period={config.period}
      />

   <div className="rounded-panel border border-brand/30 bg-brand/5 p-4">
        <p className="text-sm font-semibold text-foreground">{t('streaming.locutor.howItWorks')}</p>
        <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <p><strong className="text-foreground">1.</strong> {t('streaming.locutor.step1')}</p>
          <p><strong className="text-foreground">2.</strong> {t('streaming.locutor.step2')}</p>
          <p><strong className="text-foreground">3.</strong> {t('streaming.locutor.step3')}</p>
        </div>
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('streaming.locutor.voiceSection')}</h2>
          <p className="text-sm text-muted-foreground">
            {config.provider === 'fish'
              ? t('streaming.locutor.fishConfigured')
              : t('streaming.locutor.voiceUsage')}
          </p>
        </div>
        {config.provider === 'fish' ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.locutor.voice')}</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="fish-voice"
                      checked={voiceId === ''}
                      onChange={() => setVoiceId('')}
                      className="h-4 w-4 accent-[var(--brand-500)]"
                    />
                    <span className="text-sm text-foreground">{t('streaming.locutor.defaultVoice')}</span>
                  </label>
                  <EffectPreviewButton src="/api/dashboard/streaming/ai/voice-preview" name={t('streaming.locutor.defaultVoice')} />
                </div>
                {config.voices.map((voice) => (
                  <div key={voice.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="fish-voice"
                        checked={voiceId === voice.id}
                        onChange={() => setVoiceId(voice.id)}
                        className="h-4 w-4 accent-[var(--brand-500)]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground">{voice.name}</span>
                        {voice.description && (
                          <span className="block text-[11px] text-muted-foreground">{voice.description}</span>
                        )}
                      </span>
                    </label>
                    <EffectPreviewButton
                      src={`/api/dashboard/streaming/ai/voice-preview?voiceId=${encodeURIComponent(voice.id)}`}
                      name={voice.name}
                    />
                  </div>
                ))}
              </div>
            </div>
            <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
              {t('streaming.locutor.fishNote')}
            </p>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.locutor.voice')}</label>
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={input}>
              <option value="">{t('streaming.locutor.defaultVoice')}</option>
              {config.voices.map((voice) => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('streaming.locutor.expressivity', { value: voiceStyle })}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={voiceStyle}
              onChange={(e) => setVoiceStyle(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--brand-500)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('streaming.locutor.qualityPreset')}
            </label>
            <select value={voicePreset} onChange={(e) => setVoicePreset(e.target.value)} className={input}>
              <option value="">
                {t('streaming.locutor.qualityInherit')} ({config.globalVoicePreset || 'natural'})
              </option>
              {TTS_QUALITY_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.id === 'natural'
                    ? t('admin.tts.qualityNatural')
                    : preset.id === 'stable'
                      ? t('admin.tts.qualityStable')
                      : t('admin.tts.qualityExpressive')}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('streaming.locutor.qualityHint')}
            </p>
          </div>
        </div>
        )}
        {config.provider !== 'fish' && (
          <p className="text-[11px] text-muted-foreground">
            {t('streaming.locutor.voiceCacheNote')}
          </p>
        )}
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('streaming.locutor.whenSection')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('streaming.locutor.frequencyNote')}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-secondary"
          />
          {t('streaming.locutor.enable')}
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.locutor.presentEvery')}</label>
            <select value={every} onChange={(e) => setEvery(Number(e.target.value))} className={input} disabled={!enabled}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <option key={value} value={value}>{t('streaming.locutor.tracksCount', { count: value })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.locutor.timeEvery')}</label>
            <select value={timeEveryMinutes} onChange={(e) => setTimeEveryMinutes(Number(e.target.value))} className={input}>
              {INTERVALS.map((value) => (
                <option key={value} value={value}>{value === 0 ? t('streaming.locutor.disabledF') : t('streaming.locutor.minutes', { count: value })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('streaming.locutor.weatherEvery')}</label>
            <select value={weatherEveryMinutes} onChange={(e) => setWeatherEveryMinutes(Number(e.target.value))} className={input}>
              {INTERVALS.map((value) => (
                <option key={value} value={value}>{value === 0 ? t('streaming.locutor.disabledM') : t('streaming.locutor.minutes', { count: value })}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('streaming.locutor.phrasesSection')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('streaming.locutor.phrasesNote')}
            </p>
          </div>
          <button
            type="button"
            onClick={addPhrase}
            disabled={phrases.length >= 20}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand hover:text-brand disabled:opacity-40"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('streaming.locutor.add')}
          </button>
        </div>
        <div className="space-y-2">
          {phrases.map((phrase, index) => (
            <div key={index} className="flex items-start gap-2">
              <textarea
                value={phrase}
                onChange={(e) => updatePhrase(index, e.target.value)}
                rows={2}
                className={`${input} resize-none`}
                maxLength={240}
              />
              <button
                type="button"
                onClick={() => removePhrase(index)}
                disabled={phrases.length <= 1}
                className="mt-1 rounded-lg border border-border p-2 text-muted-foreground hover:text-red-300 disabled:opacity-30"
                aria-label={t('streaming.locutor.removePhrase')}
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('streaming.locutor.phraseFallbackNote')}
        </p>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('streaming.locutor.saveSection')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('streaming.locutor.saveSectionNote')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || applying}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <SaveIcon className="h-4 w-4" />
            {saving ? t('streaming.locutor.saving') : t('streaming.locutor.saveChanges')}
          </button>
          <button
            type="button"
            onClick={() => void applyAutoDj()}
            disabled={applying || saving || !enabled}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4" />
            {applying ? t('streaming.locutor.preparing') : t('streaming.locutor.saveApply')}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('streaming.locutor.autodjNote')}
        </p>
        {applyMessage && <p className="text-xs text-green-300">{applyMessage}</p>}
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('streaming.locutor.freeSection')}</p>
          <p className="text-xs text-muted-foreground">{t('streaming.locutor.freeNote')}</p>
        </div>
        <Link href="/dashboard/streaming/live" className="text-sm font-medium text-brand hover:underline">
          {t('streaming.locutor.goConsole')}
        </Link>
      </section>
    </div>
  )
}
