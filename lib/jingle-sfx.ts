// Catálogo de SFX de jingles. Los archivos viven en public/audio/jingle-fx.
// Cada sección (entrada, impacto, transición, cierre) tiene su propio set.

export const JINGLE_SFX_IDS = [
  'riser',
  'sweep',
  'subdrop',
  'sparkle',
  'vinyl',
  'impact',
  'boom',
  'click',
  'ding',
  'stinger',
  'reverse',
  'whoosh',
] as const

export type JingleSfxId = (typeof JINGLE_SFX_IDS)[number]

export const INTRO_SFX_IDS = ['riser', 'sweep', 'subdrop', 'sparkle', 'vinyl'] as const
export const IMPACT_SFX_IDS = ['impact', 'boom', 'stinger', 'click', 'ding'] as const
export const TRANSITION_SFX_IDS = ['whoosh', 'sweep', 'vinyl', 'click', 'sparkle'] as const
export const OUTRO_SFX_IDS = ['stinger', 'reverse', 'boom', 'ding', 'sparkle'] as const

export type JingleSfxSlot = 'intro' | 'impact' | 'transition' | 'outro'

export const SFX_SLOT_IDS: Record<JingleSfxSlot, readonly JingleSfxId[]> = {
  intro: INTRO_SFX_IDS,
  impact: IMPACT_SFX_IDS,
  transition: TRANSITION_SFX_IDS,
  outro: OUTRO_SFX_IDS,
}

/** Nivel de mezcla por SFX, calibrado contra el pico de cada archivo. */
export const SFX_VOLUME: Record<JingleSfxId, number> = {
  riser: 0.4,
  sweep: 0.38,
  subdrop: 0.42,
  sparkle: 0.34,
  vinyl: 0.34,
  impact: 0.42,
  boom: 0.4,
  click: 0.3,
  ding: 0.32,
  stinger: 0.3,
  reverse: 0.42,
  whoosh: 0.3,
}

export function isJingleSfxId(value: unknown): value is JingleSfxId {
  return typeof value === 'string' && (JINGLE_SFX_IDS as readonly string[]).includes(value)
}

export function isSfxIdForSlot(slot: JingleSfxSlot, value: unknown): value is JingleSfxId {
  return typeof value === 'string' && (SFX_SLOT_IDS[slot] as readonly string[]).includes(value)
}

export function sfxFile(id: JingleSfxId): string {
  return `${id}.mp3`
}
