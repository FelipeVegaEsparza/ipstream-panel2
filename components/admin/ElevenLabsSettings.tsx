'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { ELEVENLABS_MODELS, DEFAULT_ELEVENLABS_MODEL } from '@/lib/elevenlabs-models'
import { DEFAULT_TTS_QUALITY_PRESET, TTS_QUALITY_PRESETS } from '@/lib/tts-quality'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface VoiceOption {
  id: string
  name: string
  description?: string
  gender?: 'male' | 'female'
}

interface Config {
  elevenLabsKeySet: boolean
  elevenLabsVoiceId: string
  elevenLabsModel: string
  elevenLabsEnabled: boolean
  ttsCacheEnabled: boolean
  elevenLabsVoices?: VoiceOption[]
  ttsQualityPreset?: string
  pronunciationDictionaryId?: string
  pronunciationDictionaryVersionId?: string
  ttsProvider: 'elevenlabs' | 'fish'
}

type VoiceGender = 'male' | 'female'

interface VoiceRow extends VoiceOption {
  slot: string
}

const VOICE_SLOTS: Array<{ slot: string; gender: VoiceGender }> = [
  { slot: 'female-1', gender: 'female' },
  { slot: 'female-2', gender: 'female' },
  { slot: 'female-3', gender: 'female' },
  { slot: 'female-4', gender: 'female' },
  { slot: 'male-1', gender: 'male' },
  { slot: 'male-2', gender: 'male' },
  { slot: 'male-3', gender: 'male' },
  { slot: 'male-4', gender: 'male' },
]

function emptyVoices(): VoiceRow[] {
  return VOICE_SLOTS.map((slot) => ({ ...slot, id: '', name: '', description: '' }))
}

function mergeVoices(configured: VoiceOption[] | undefined): VoiceRow[] {
  const slots = emptyVoices()
  const extra: VoiceRow[] = []
  for (const voice of configured || []) {
    if (!voice.id || !voice.name) continue
    const slot =
      slots.find((candidate) => candidate.id === voice.id) ||
      (voice.gender
        ? slots.find((candidate) => candidate.gender === voice.gender && !candidate.id)
        : undefined)
    if (slot) {
      slot.id = voice.id
      slot.name = voice.name
      slot.description = voice.description
    } else {
      extra.push({ slot: `extra-${extra.length}`, ...voice })
    }
  }
  return [...slots, ...extra]
}

export function ElevenLabsSettings() {
  const { t } = useDashboardI18n()
  const [apiKey, setApiKey] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [model, setModel] = useState(DEFAULT_ELEVENLABS_MODEL)
  const [enabled, setEnabled] = useState(false)
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [voices, setVoices] = useState<VoiceRow[]>(emptyVoices)
  const [qualityPreset, setQualityPreset] = useState<string>(DEFAULT_TTS_QUALITY_PRESET)
  const [dictionaryId, setDictionaryId] = useState('')
  const [dictionaryVersionId, setDictionaryVersionId] = useState('')
  const [keySet, setKeySet] = useState(false)
  const [provider, setProvider] = useState<'elevenlabs' | 'fish'>('elevenlabs')
  const [loading, setLoading] = useState(false)
  const [loadingCfg, setLoadingCfg] = useState(true)

  useEffect(() => {
    fetch('/api/admin/app-config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Config) => {
        setKeySet(Boolean(data.elevenLabsKeySet))
        setVoiceId(data.elevenLabsVoiceId || '')
        setModel(data.elevenLabsModel || DEFAULT_ELEVENLABS_MODEL)
        setEnabled(Boolean(data.elevenLabsEnabled))
        setCacheEnabled(data.ttsCacheEnabled !== false)
        setVoices(mergeVoices(Array.isArray(data.elevenLabsVoices) ? data.elevenLabsVoices : []))
        setQualityPreset(data.ttsQualityPreset || DEFAULT_TTS_QUALITY_PRESET)
        setDictionaryId(data.pronunciationDictionaryId || '')
        setDictionaryVersionId(data.pronunciationDictionaryVersionId || '')
        setProvider(data.ttsProvider === 'fish' ? 'fish' : 'elevenlabs')
      })
      .catch(() => showToast({ type: 'error', title: t('admin.tts.loadError') }))
      .finally(() => setLoadingCfg(false))
  }, [])

  async function save() {
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        elevenLabsVoiceId: voiceId.trim(),
        elevenLabsModel: model,
        elevenLabsEnabled: enabled,
        ttsCacheEnabled: cacheEnabled,
        elevenLabsVoices: voices.filter((voice) => voice.id.trim() && voice.name.trim()).map(({ slot, ...voice }) => voice),
        ttsQualityPreset: qualityPreset,
        pronunciationDictionaryId: dictionaryId.trim(),
        pronunciationDictionaryVersionId: dictionaryVersionId.trim(),
      }
      if (apiKey.trim()) body.elevenLabsApiKey = apiKey.trim()

      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('admin.tts.saveError'))
      setApiKey('')
      setKeySet(Boolean(data.elevenLabsKeySet))
      showToast({ type: 'success', title: t('admin.tts.saved') })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function activate() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttsProvider: 'elevenlabs', elevenLabsEnabled: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('admin.voice.activateError'))
      setProvider('elevenlabs')
      setEnabled(true)
      showToast({ type: 'success', title: t('admin.voice.elevenActive') })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function clearKey() {
    if (!confirm(t('admin.tts.removeElevenKeyConfirm'))) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearElevenLabsApiKey: true, elevenLabsEnabled: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('admin.tts.keyError'))
      setApiKey('')
      setKeySet(Boolean(data.elevenLabsKeySet))
      setEnabled(Boolean(data.elevenLabsEnabled))
      showToast({ type: 'success', title: t('admin.tts.keyRemoved') })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const assignExtraGender = (slot: string, gender: VoiceGender) => {
    setVoices((prev) => {
      const extra = prev.find((voice) => voice.slot === slot)
      if (!extra) return prev
      const without = prev.filter((voice) => voice.slot !== slot)
      const free = without.find(
        (voice) => voice.slot.startsWith(`${gender}-`) && !voice.id && !voice.name
      )
      if (!free) return prev
      return without.map((voice) =>
        voice.slot === free.slot
          ? { ...voice, id: extra.id, name: extra.name, description: extra.description }
          : voice
      )
    })
  }

  const input =
    'w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:border-brand focus:outline-none'

  return (
    <div className="card max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{t('admin.voice.elevenTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.voice.elevenSubtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('admin.voice.activeProvider')}</p>
          <p className="text-sm font-medium text-foreground">
            {provider === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio'}
          </p>
        </div>
        {provider !== 'elevenlabs' && (
          <button
            type="button"
            onClick={() => void activate()}
            disabled={loading}
            className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('admin.voice.activateEleven')}
          </button>
        )}
      </div>

      {loadingCfg ? (
        <p className="text-sm text-muted-foreground">{t('admin.tts.loading')}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.tts.enableEleven')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.tts.enableElevenHint')}</p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-secondary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.apiKey')}</label>
            <input
              type="password"
              className={input}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keySet ? t('admin.tts.keyConfiguredPlaceholder') : 'xi-…'}
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.tts.encryptedHint')}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.voiceId')}</label>
            <input
              className={input}
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder={t('admin.tts.voiceIdPlaceholder')}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('admin.tts.voiceIdHint')}{' '}
              <a
                href="https://elevenlabs.io/app/voice-library"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline"
              >
                {t('admin.tts.voiceIdLink')}
              </a>
              {t('admin.tts.voiceIdHintEnd')}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.model')}</label>
            <select className={input} value={model} onChange={(e) => setModel(e.target.value)}>
              {ELEVENLABS_MODELS.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.tts.modelHint')}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.qualityPreset')}</label>
            <select className={input} value={qualityPreset} onChange={(e) => setQualityPreset(e.target.value)}>
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
            <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.tts.qualityPresetHint')}</p>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('admin.tts.pronunciationTitle')}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('admin.tts.pronunciationHint')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.pronunciationId')}</label>
                <input
                  className={input}
                  value={dictionaryId}
                  onChange={(e) => setDictionaryId(e.target.value)}
                  placeholder="5xM3yVvZQKV0EfqQpLrJ"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.pronunciationVersion')}</label>
                <input
                  className={input}
                  value={dictionaryVersionId}
                  onChange={(e) => setDictionaryVersionId(e.target.value)}
                  placeholder="v1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('admin.tts.elevenCatalogTitle')}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('admin.tts.elevenCatalogHint')}</p>
            </div>

            {(['female', 'male'] as const).map((gender) => {
              const rows = voices.filter((voice) => voice.slot.startsWith(`${gender}-`))
              return (
                <div key={gender} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {gender === 'female' ? t('admin.voice.femaleVoices') : t('admin.voice.maleVoices')}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {rows.filter((voice) => voice.id.trim()).length}/4
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rows.map((voice, index) => (
                      <div key={voice.slot} className="rounded-lg border border-border bg-background p-2">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {gender === 'female' ? t('admin.voice.femaleSlot', { n: index + 1 }) : t('admin.voice.maleSlot', { n: index + 1 })}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className={input}
                            value={voice.name}
                            onChange={(e) =>
                              setVoices((prev) => prev.map((v) => (v.slot === voice.slot ? { ...v, name: e.target.value } : v)))
                            }
                            placeholder={t('admin.tts.voiceNamePlaceholder')}
                            maxLength={120}
                          />
                          <input
                            className={input}
                            value={voice.id}
                            onChange={(e) =>
                              setVoices((prev) => prev.map((v) => (v.slot === voice.slot ? { ...v, id: e.target.value } : v)))
                            }
                            placeholder={t('admin.tts.voiceIdFieldPlaceholder')}
                            maxLength={191}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {voices.some((voice) => !voice.gender) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold text-amber-200">{t('admin.tts.unclassifiedVoices')}</p>
                <div className="mt-2 space-y-2">
                  {voices
                    .filter((voice) => !voice.gender)
                    .map((voice) => (
                      <div key={voice.slot} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                          {voice.name || voice.id}
                        </span>
                        <select
                          value=""
                          onChange={(e) => {
                            const gender = e.target.value as VoiceGender
                            if (gender !== 'male' && gender !== 'female') return
                            assignExtraGender(voice.slot, gender)
                          }}
                          className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                        >
                          <option value="">{t('admin.tts.gender')}</option>
                          <option value="female">{t('admin.tts.genderFemale')}</option>
                          <option value="male">{t('admin.tts.genderMale')}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setVoices((prev) => prev.filter((v) => v.slot !== voice.slot))}
                          className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-red-300"
                          aria-label={t('admin.tts.removeVoice')}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg bg-secondary/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.tts.saveAudios')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.tts.saveAudiosHint')}</p>
            </div>
            <input
              type="checkbox"
              checked={cacheEnabled}
              onChange={(e) => setCacheEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border bg-secondary"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => void save()}
              disabled={loading}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
            >
              {loading ? t('admin.tts.saving') : t('admin.tts.save')}
            </button>
            {keySet && (
              <button
                type="button"
                onClick={() => void clearKey()}
                disabled={loading}
                className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-50"
              >
                {t('admin.tts.removeKey')}
              </button>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">{t('admin.tts.cacheNote')}</p>
        </>
      )}
    </div>
  )
}
