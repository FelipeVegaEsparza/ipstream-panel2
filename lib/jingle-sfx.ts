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
  'punch',
  'thunder',
  'click',
  'ding',
  'stinger',
  'reverse',
  'whoosh',
  'swish',
  'scratch',
  'static',
  'blip',
  'tapeStop',
  'chime',
  'glitch',
  'bassdrop',
] as const

export type JingleSfxId = (typeof JINGLE_SFX_IDS)[number]

export const INTRO_SFX_IDS = ['riser', 'sweep', 'subdrop', 'bassdrop', 'sparkle', 'vinyl', 'glitch'] as const
export const IMPACT_SFX_IDS = ['impact', 'boom', 'punch', 'thunder', 'stinger', 'click', 'ding'] as const
export const TRANSITION_SFX_IDS = ['whoosh', 'swish', 'sweep', 'scratch', 'static', 'vinyl', 'click', 'sparkle', 'blip'] as const
export const OUTRO_SFX_IDS = ['stinger', 'reverse', 'boom', 'tapeStop', 'chime', 'ding', 'sparkle', 'blip'] as const

export type JingleSfxSlot = 'intro' | 'impact' | 'transition' | 'outro'

export const SFX_SLOT_IDS: Record<JingleSfxSlot, readonly JingleSfxId[]> = {
  intro: INTRO_SFX_IDS,
  impact: IMPACT_SFX_IDS,
  transition: TRANSITION_SFX_IDS,
  outro: OUTRO_SFX_IDS,
}

/** Duración aproximada de cada archivo, para ajustar la entrada de la voz. */
export const SFX_DURATION_SECONDS: Record<JingleSfxId, number> = {
  riser: 1.2,
  sweep: 0.9,
  subdrop: 1.2,
  sparkle: 0.9,
  vinyl: 0.7,
  impact: 1,
  boom: 1.5,
  punch: 0.4,
  thunder: 2.2,
  click: 0.18,
  ding: 1,
  stinger: 1.2,
  reverse: 0.8,
  whoosh: 0.45,
  swish: 0.45,
  scratch: 0.6,
  static: 0.6,
  blip: 0.3,
  tapeStop: 1.4,
  chime: 1.4,
  glitch: 0.6,
  bassdrop: 1.6,
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
  punch: 0.4,
  thunder: 0.5,
  click: 0.3,
  ding: 0.32,
  stinger: 0.3,
  reverse: 0.42,
  whoosh: 0.3,
  swish: 0.32,
  scratch: 0.32,
  static: 0.3,
  blip: 0.28,
  tapeStop: 0.38,
  chime: 0.34,
  glitch: 0.3,
  bassdrop: 0.42,
}

export function isJingleSfxId(value: unknown): value is JingleSfxId {
  return typeof value === 'string' && (JINGLE_SFX_IDS as readonly string[]).includes(value)
}

export function isSfxIdForSlot(slot: JingleSfxSlot, value: unknown): value is JingleSfxId {
  return typeof value === 'string' && (SFX_SLOT_IDS[slot] as readonly string[]).includes(value)
}

const SFX_FILES: Record<JingleSfxId, string> = {
  riser: 'riser.mp3',
  sweep: 'sweep.mp3',
  subdrop: 'subdrop.mp3',
  sparkle: 'sparkle.mp3',
  vinyl: 'vinyl.mp3',
  impact: 'impact.mp3',
  boom: 'boom.mp3',
  punch: 'punch.mp3',
  thunder: 'thunder.mp3',
  click: 'click.mp3',
  ding: 'ding.mp3',
  stinger: 'stinger.mp3',
  reverse: 'reverse.mp3',
  whoosh: 'whoosh.mp3',
  swish: 'swish.mp3',
  scratch: 'scratch.mp3',
  static: 'static.mp3',
  blip: 'blip.mp3',
  tapeStop: 'tape-stop.mp3',
  chime: 'chime.mp3',
  glitch: 'glitch.mp3',
  bassdrop: 'bassdrop.mp3',
}

export function sfxFile(id: JingleSfxId): string {
  return SFX_FILES[id]
}
