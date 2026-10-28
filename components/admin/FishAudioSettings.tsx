'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { FISH_AUDIO_MODELS, DEFAULT_FISH_AUDIO_MODEL } from '@/lib/fish-audio-models'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface FishVoiceRow {
  id: string
  name: string
  gender: 'male' | 'female'
  referenceId: string
}

interface Config {
  ttsProvider: 'elevenlabs' | 'fish'
  fishAudioKeySet: boolean
  fishAudioModel: string
  fishAudioReferenceId: string
  fishAudioVoices?: FishVoiceRow[]
  fishAudioDirection?: string
}

const VOICE_SLOTS: Array<Pick<FishVoiceRow, 'id' | 'gender'>> = [
  { id: 'fish-male-1', gender: 'male' },
  { id: 'fish-male-2', gender: 'male' },
  { id: 'fish-male-3', gender: 'male' },
  { id: 'fish-female-1', gender: 'female' },
  { id: 'fish-female-2', gender: 'female' },
  { id: 'fish-female-3', gender: 'female' },
]

function emptyVoices(): FishVoiceRow[] {
  return VOICE_SLOTS.map((slot) => ({ ...slot, name: '', referenceId: '' }))
}

function mergeVoices(configured: FishVoiceRow[] | undefined): FishVoiceRow[] {
  const slots = emptyVoices()
  for (const voice of configured || []) {
    const exact = slots.find((slot) => slot.id === voice.id)
    if (exact) {
      exact.name = voice.name
      exact.referenceId = voice.referenceId
      continue
    }
    const free = slots.find((slot) => slot.gender === voice.gender && !slot.name && !slot.referenceId)
    if (free) {
      free.id = voice.id
      free.name = voice.name
      free.referenceId = voice.referenceId
    }
  }
  return slots
}

export function FishAudioSettings() {
  const { t } = useDashboardI18n()
  const [apiKey, setApiKey] = useState('')
  const [keySet, setKeySet] = useState(false)
  const [model, setModel] = useState<string>(DEFAULT_FISH_AUDIO_MODEL)
  const [defaultReferenceId, setDefaultReferenceId] = useState('')
  const [direction, setDirection] = useState('')
  const [voices, setVoices] = useState<FishVoiceRow[]>(emptyVoices)
  const [provider, setProvider] = useState<'elevenlabs' | 'fish'>('fish')
  const [loading, setLoading] = useState(false)
  const [loadingCfg, setLoadingCfg] = useState(true)

  useEffect(() => {
    fetch('/api/admin/app-config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Config) => {
        setKeySet(Boolean(data.fishAudioKeySet))
        setModel(data.fishAudioModel || DEFAULT_FISH_AUDIO_MODEL)
        setDefaultReferenceId(data.fishAudioReferenceId || '')
        setDirection(data.fishAudioDirection || '')
        setVoices(mergeVoices(data.fishAudioVoices))
        setProvider(data.ttsProvider === 'fish' ? 'fish' : 'elevenlabs')
      })
      .catch(() => showToast({ type: 'error', title: t('admin.voice.loadError') }))
      .finally(() => setLoadingCfg(false))
  }, [])

  const configuredVoices = voices.filter((voice) => voice.name.trim() && voice.referenceId.trim())

  async function activate() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttsProvider: 'fish' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('admin.voice.activateError'))
      setProvider('fish')
      showToast({ type: 'success', title: t('admin.voice.fishActive') })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        fishAudioModel: model,
        fishAudioReferenceId: defaultReferenceId.trim() || configuredVoices[0]?.referenceId || '',
        fishAudioDirection: direction.trim(),
        fishAudioVoices: configuredVoices,
      }
      if (apiKey.trim()) body.fishAudioApiKey = apiKey.trim()

      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('admin.voice.saveError'))
      setApiKey('')
      setKeySet(Boolean(data.fishAudioKeySet))
      setVoices(mergeVoices(data.fishAudioVoices))
      showToast({ type: 'success', title: t('admin.voice.fishSaved') })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const updateVoice = (id: string, patch: Partial<FishVoiceRow>) => {
    setVoices((prev) => prev.map((voice) => (voice.id === id ? { ...voice, ...patch } : voice)))
  }

  const input =
    'w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:border-brand focus:outline-none'

  return (
    <div className="card max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{t('admin.voice.fishTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.voice.fishSubtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('admin.voice.activeProvider')}</p>
          <p className="text-sm font-medium text-foreground">
            {provider === 'fish' ? 'Fish Audio' : 'ElevenLabs'}
          </p>
        </div>
        {provider !== 'fish' && (
          <button
            type="button"
            onClick={() => void activate()}
            disabled={loading}
            className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('admin.voice.activateFish')}
          </button>
        )}
      </div>

      {loadingCfg ? (
        <p className="text-sm text-muted-foreground">{t('admin.tts.loading')}</p>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.fishApiKey')}</label>
            <input
              type="password"
              className={input}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keySet ? t('admin.tts.keyConfiguredPlaceholder') : t('admin.tts.fishKeyPlaceholder')}
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.tts.encryptedHint')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.model')}</label>
              <select className={input} value={model} onChange={(e) => setModel(e.target.value)}>
                {FISH_AUDIO_MODELS.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.voice.modelHint')}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin.voice.defaultVoice')}</label>
              <select className={input} value={defaultReferenceId} onChange={(e) => setDefaultReferenceId(e.target.value)}>
                <option value="">{t('admin.voice.defaultVoiceNone')}</option>
                {configuredVoices.map((voice) => (
                  <option key={voice.id} value={voice.referenceId}>{voice.name}</option>
                ))}
                {defaultReferenceId && !configuredVoices.some((voice) => voice.referenceId === defaultReferenceId) && (
                  <option value={defaultReferenceId}>{t('admin.voice.defaultVoiceCurrent')}</option>
                )}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.voice.defaultVoiceHint')}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('admin.tts.fishDirection')}</label>
            <textarea
              className={input}
              rows={3}
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder={t('admin.tts.fishDirectionPlaceholder')}
              maxLength={500}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.tts.fishDirectionHint')}</p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('admin.voice.catalogTitle')}</h3>
                <p className="text-[11px] text-muted-foreground">{t('admin.voice.catalogHint')}</p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
                {t('admin.voice.catalogCount', { count: configuredVoices.length })}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(['male', 'female'] as const).map((gender) => (
                <div key={gender} className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                  <p className="text-xs font-semibold text-foreground">
                    {gender === 'male' ? t('admin.voice.maleVoices') : t('admin.voice.femaleVoices')}
                  </p>
                  {voices.filter((voice) => voice.gender === gender).map((voice, index) => (
                    <div key={voice.id} className="rounded-lg border border-border bg-background p-2">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {gender === 'male'
                          ? t('admin.voice.maleSlot', { n: index + 1 })
                          : t('admin.voice.femaleSlot', { n: index + 1 })}
                      </p>
                      <input
                        className={`${input} mb-2`}
                        value={voice.name}
                        onChange={(e) => updateVoice(voice.id, { name: e.target.value })}
                        placeholder={t('admin.voice.voiceNamePlaceholder')}
                        maxLength={120}
                      />
                      <input
                        className={input}
                        value={voice.referenceId}
                        onChange={(e) => updateVoice(voice.id, { referenceId: e.target.value })}
                        placeholder={t('admin.voice.referenceIdPlaceholder')}
                        maxLength={191}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => void save()}
              disabled={loading}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
            >
              {loading ? t('admin.tts.saving') : t('admin.voice.saveFish')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
