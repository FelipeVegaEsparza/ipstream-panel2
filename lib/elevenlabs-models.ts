export const ELEVENLABS_MODELS = [
  { id: 'eleven_v4_turbo', label: 'v4 Turbo — mejor precio (USD 0,04/1K)' },
  { id: 'eleven_v4', label: 'v4 — máxima calidad (USD 0,08/1K)' },
  { id: 'eleven_v3', label: 'v3 — expresivo (USD 0,08/1K)' },
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2 — estable (USD 0,08/1K)' },
  { id: 'eleven_flash_v2_5', label: 'Flash v2.5 — rápido (USD 0,04/1K)' },
] as const

export const DEFAULT_ELEVENLABS_MODEL = 'eleven_v4_turbo'
