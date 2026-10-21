'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { ELEVENLABS_MODELS, DEFAULT_ELEVENLABS_MODEL } from '@/lib/elevenlabs-models'
import { FISH_AUDIO_MODELS, DEFAULT_FISH_AUDIO_MODEL } from '@/lib/fish-audio-models'

interface VoiceOption {
  id: string
  name: string
  description?: string
}

interface Config {
  elevenLabsKeySet: boolean
  elevenLabsVoiceId: string
  elevenLabsModel: string
  elevenLabsEnabled: boolean
  ttsCacheEnabled: boolean
  elevenLabsVoices?: VoiceOption[]
  ttsProvider: 'elevenlabs' | 'fish'
  fishAudioKeySet: boolean
  fishAudioModel: string
  fishAudioReferenceId: string
}

export function ElevenLabsSettings() {
  const [apiKey, setApiKey] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [model, setModel] = useState(DEFAULT_ELEVENLABS_MODEL)
  const [enabled, setEnabled] = useState(false)
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [keySet, setKeySet] = useState(false)
  const [provider, setProvider] = useState<'elevenlabs' | 'fish'>('elevenlabs')
  const [fishApiKey, setFishApiKey] = useState('')
  const [fishKeySet, setFishKeySet] = useState(false)
  const [fishModel, setFishModel] = useState(DEFAULT_FISH_AUDIO_MODEL)
  const [fishReferenceId, setFishReferenceId] = useState('')
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
        setVoices(Array.isArray(data.elevenLabsVoices) ? data.elevenLabsVoices : [])
        setProvider(data.ttsProvider === 'fish' ? 'fish' : 'elevenlabs')
        setFishKeySet(Boolean(data.fishAudioKeySet))
        setFishModel(data.fishAudioModel || DEFAULT_FISH_AUDIO_MODEL)
        setFishReferenceId(data.fishAudioReferenceId || '')
      })
      .catch(() => showToast({ type: 'error', title: 'No se pudo cargar la configuración' }))
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
        elevenLabsVoices: voices,
        ttsProvider: provider,
        fishAudioModel: fishModel,
        fishAudioReferenceId: fishReferenceId.trim(),
      }
      if (apiKey.trim()) body.elevenLabsApiKey = apiKey.trim()
      if (fishApiKey.trim()) body.fishAudioApiKey = fishApiKey.trim()

      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setApiKey('')
      setFishApiKey('')
      setKeySet(Boolean(data.elevenLabsKeySet))
      setFishKeySet(Boolean(data.fishAudioKeySet))
      setProvider(data.ttsProvider === 'fish' ? 'fish' : 'elevenlabs')
      showToast({ type: 'success', title: 'Configuración de locución guardada' })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function clearKey() {
    if (!confirm('¿Quitar la API key de ElevenLabs? La locución premium quedará desactivada.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearElevenLabsApiKey: true, elevenLabsEnabled: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al quitar la API key')
      setApiKey('')
      setKeySet(Boolean(data.elevenLabsKeySet))
      setEnabled(Boolean(data.elevenLabsEnabled))
      showToast({ type: 'success', title: 'API key eliminada' })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function clearFishKey() {
    if (!confirm('¿Quitar la API key de Fish Audio?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearFishAudioApiKey: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al quitar la API key')
      setFishApiKey('')
      setFishKeySet(Boolean(data.fishAudioKeySet))
      showToast({ type: 'success', title: 'API key de Fish eliminada' })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const input =
    'w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:border-brand focus:outline-none'

  return (
    <div className="card max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Locución IA</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí el proveedor de voz. Se usa en Locutor IA, clima/hora y jingles; si el elegido falla,
          se intenta el otro y Piper queda como último fallback.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Proveedor de voz</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { id: 'elevenlabs', name: 'ElevenLabs', detail: 'Voces y catálogo existente' },
            { id: 'fish', name: 'Fish Audio', detail: 'Voz/reference ID y modelo Fish' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setProvider(item.id)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                provider === item.id
                  ? 'border-brand bg-brand/10'
                  : 'border-border bg-secondary/30 hover:border-brand/50'
              }`}
            >
              <span className={`block text-sm font-semibold ${provider === item.id ? 'text-brand' : 'text-foreground'}`}>
                {item.name}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.detail}</span>
            </button>
          ))}
        </div>
      </div>

      {loadingCfg ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Habilitar ElevenLabs</p>
              <p className="text-xs text-muted-foreground">
                Se usa si es el proveedor elegido o como respaldo si Fish Audio falla.
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-secondary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">API key</label>
            <input
              type="password"
              className={input}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keySet ? '•••••••• (ya configurada — deja vacío para conservarla)' : 'xi-…'}
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Se guarda encriptada. Nunca se muestra de vuelta en el panel.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Voice ID</label>
            <input
              className={input}
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="ID de la voz de tu emisora"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Copiá el ID desde{' '}
              <a
                href="https://elevenlabs.io/app/voice-library"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline"
              >
                ElevenLabs → Voces
              </a>
              . Para una voz propia, creá un clon profesional y usá su ID.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Modelo</label>
            <select
              className={input}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {ELEVENLABS_MODELS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              v4 Turbo cuesta USD 0,04 por 1.000 caracteres. Para locución de clima/hora es el
              equilibrio recomendado.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-xs text-muted-foreground">Voces disponibles para los clientes</label>
                <p className="text-[11px] text-muted-foreground">
                  El cliente elige una en Locutor IA. La voz global se usa si no hay selección.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVoices((prev) => [...prev, { id: '', name: '' }])}
                disabled={voices.length >= 30}
                className="rounded border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-brand hover:text-brand disabled:opacity-40"
              >
                Agregar voz
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {voices.map((voice, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={input}
                    value={voice.name}
                    onChange={(e) =>
                      setVoices((prev) => prev.map((v, i) => (i === index ? { ...v, name: e.target.value } : v)))
                    }
                    placeholder="Nombre (ej. Locutor chileno)"
                  />
                  <input
                    className={input}
                    value={voice.id}
                    onChange={(e) =>
                      setVoices((prev) => prev.map((v, i) => (i === index ? { ...v, id: e.target.value } : v)))
                    }
                    placeholder="Voice ID de ElevenLabs"
                  />
                  <button
                    type="button"
                    onClick={() => setVoices((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded border border-border px-2 text-muted-foreground hover:text-red-300"
                    aria-label="Quitar voz"
                  >
                    ×
                  </button>
                </div>
              ))}
              {voices.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No hay voces alternativas. Los clientes usarán la voz global.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fish Audio</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                API compatible con el endpoint <code>/v1/tts</code>. La voz se define con un
                reference ID de Fish Audio; si se deja vacío se usa la voz predeterminada de la cuenta.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API key de Fish Audio</label>
              <input
                type="password"
                className={input}
                value={fishApiKey}
                onChange={(e) => setFishApiKey(e.target.value)}
                placeholder={fishKeySet ? '•••••••• (ya configurada — deja vacío para conservarla)' : 'API key de fish.audio'}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Reference ID / voz</label>
                <input
                  className={input}
                  value={fishReferenceId}
                  onChange={(e) => setFishReferenceId(e.target.value)}
                  placeholder="ID del modelo de voz (opcional)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Modelo</label>
                <select
                  className={input}
                  value={fishModel}
                  onChange={(e) => setFishModel(e.target.value)}
                >
                  {FISH_AUDIO_MODELS.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Copiá el reference ID desde{' '}
              <a
                href="https://fish.audio/"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline"
              >
                Fish Audio
              </a>
              . El modelo se envía en el header <code>model</code>. La música de los jingles IA
              sigue usando ElevenLabs; Fish Audio aplica a la locución.
            </p>
            {fishKeySet && (
              <button
                type="button"
                onClick={() => void clearFishKey()}
                disabled={loading}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-red-300 disabled:opacity-40"
              >
                Quitar API key de Fish
              </button>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg bg-secondary/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Guardar audios generados</p>
              <p className="text-xs text-muted-foreground">
                Evita pagar dos veces la misma frase y baja la latencia. Se guardan en el volumen
                de uploads y sobreviven a los deploys.
              </p>
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
              onClick={save}
              disabled={loading}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
            {keySet && (
              <button
                type="button"
                onClick={clearKey}
                disabled={loading}
                className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-50"
              >
                Quitar API key
              </button>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Con caché activado, una frase se paga una sola vez. A USD 0,04/1K, una radio con
            ~100 anuncios diarios ronda USD 12/mes sin caché; con caché, los repetidos son gratis.
          </p>
        </>
      )}
    </div>
  )
}
