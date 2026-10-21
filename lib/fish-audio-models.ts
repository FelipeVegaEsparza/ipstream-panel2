export const FISH_AUDIO_MODELS = [
  { id: 's2.1-pro-free', label: 'S2.1 Pro Free — nivel gratuito' },
  { id: 's2.1-pro', label: 'S2.1 Pro — máxima calidad' },
  { id: 's2-pro', label: 'S2 Pro — calidad alta' },
  { id: 's1', label: 'S1 — modelo anterior' },
  { id: 'drama-3', label: 'Drama 3 — expresivo / diálogo' },
] as const

export const DEFAULT_FISH_AUDIO_MODEL = 's2.1-pro-free'

export function validFishAudioModel(value: string | null | undefined): string {
  const model = (value || '').trim()
  return FISH_AUDIO_MODELS.some((entry) => entry.id === model)
    ? model
    : DEFAULT_FISH_AUDIO_MODEL
}
