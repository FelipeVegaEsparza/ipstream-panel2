'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { ELEVENLABS_MODELS, DEFAULT_ELEVENLABS_MODEL } from '@/lib/elevenlabs-models'

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
}

export function ElevenLabsSettings() {
  const [apiKey, setApiKey] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [model, setModel] = useState(DEFAULT_ELEVENLABS_MODEL)
  const [enabled, setEnabled] = useState(false)
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [keySet, setKeySet] = useState(false)
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
      }
      if (apiKey.trim()) body.elevenLabsApiKey = apiKey.trim()

      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setApiKey('')
      setKeySet(Boolean(data.elevenLabsKeySet))
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

  const input =
    'w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:border-brand focus:outline-none'

  return (
    <div className="card max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Locución premium</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Voz de la emisora con ElevenLabs. Se usa en Clima y Hora; Piper queda como fallback.
        </p>
      </div>

      {loadingCfg ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Usar ElevenLabs</p>
              <p className="text-xs text-muted-foreground">
                Si está desactivado, las locuciones usan las voces Piper.
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
