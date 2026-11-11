import crypto from 'crypto'

export interface PlaylistIntrosKeyInput {
  station: string
  every: number
  phrases: string[]
  trackIds: string[]
  aiVoiceId: string | null
  fishVoiceId: string | null
  aiVoiceStyle: number
  aiVoicePreset: string | null
}

/** Hash estable del contenido que determina las locuciones de una playlist. */
export function computePlaylistIntrosKey(input: PlaylistIntrosKeyInput): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
}
