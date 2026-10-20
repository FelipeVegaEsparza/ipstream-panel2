import type { LocalTrack } from './types'

export type AnnouncementType = 'time' | 'weather'

export function createAnnouncementTrack(type: AnnouncementType): LocalTrack {
  const title = type === 'time' ? 'Hora' : 'Clima'
  const id = `announcement-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    name: title,
    path: `announcement:${id}`,
    title,
    artist: 'Locución',
    album: null,
    duration: null,
    size: 0,
    lastModified: Date.now(),
    mimeType: 'audio/mpeg',
    source: 'announcement',
    handle: null,
    file: null,
    available: true,
    kind: 'announcement',
    announcementType: type,
  }
}
