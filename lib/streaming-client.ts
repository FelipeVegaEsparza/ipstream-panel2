// =====================================================
// Streaming Client — habla con el streaming-agent
// Multi-servidor: cada llamada resuelve el target (baseUrl + token)
// del servidor asignado al cliente (radio o video según el servicio).
// =====================================================

import {
  resolveRadioServerTarget,
  resolveVideoServerTarget,
  getDefaultServerTarget,
  StreamingServerTarget,
} from './streaming-servers'

const DEFAULT_TIMEOUT_MS = 30000  // 30s
const UPLOAD_TIMEOUT_MS = 120000  // 2 min para uploads grandes

export class StreamingAgentError extends Error {
  constructor(message: string, public status: number, public body?: any) {
    super(message)
    this.name = 'StreamingAgentError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: any
  timeoutMs?: number
  isMultipart?: boolean
}

async function resolveTarget(kind: 'radio' | 'video' | 'default', clientId?: string) {
  let target: StreamingServerTarget | null = null
  if (kind === 'radio' && clientId) target = await resolveRadioServerTarget(clientId)
  else if (kind === 'video' && clientId) target = await resolveVideoServerTarget(clientId)
  else target = await getDefaultServerTarget()

  if (!target) {
    throw new Error('No hay servidor de streaming configurado')
  }
  return target
}

async function request<T = any>(
  target: StreamingServerTarget,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, isMultipart = false } = options

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${target.token}`,
  }

  let bodyToSend: any = undefined
  if (body !== undefined) {
    if (isMultipart) {
      // body es FormData, no setees Content-Type (el browser/undici lo hace con boundary)
      bodyToSend = body
    } else {
      headers['Content-Type'] = 'application/json'
      bodyToSend = JSON.stringify(body)
    }
  }

  try {
    const res = await fetch(`${target.baseUrl}${path}`, {
      method,
      headers,
      body: bodyToSend,
      signal: ctrl.signal,
    })

    const text = await res.text()
    let json: any = null
    if (text) {
      try { json = JSON.parse(text) } catch { /* not JSON */ }
    }

    if (!res.ok) {
      throw new StreamingAgentError(
        json?.message || json?.error || res.statusText,
        res.status,
        json,
      )
    }

    return json as T
  } finally {
    clearTimeout(timer)
  }
}

async function requestRaw(target: StreamingServerTarget, path: string): Promise<Response> {
  return fetch(`${target.baseUrl}${path}`, {
    headers: { 'Authorization': `Bearer ${target.token}` },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  })
}

// =====================================================
// Streams
// =====================================================

export const streamingClient = {
  // Health (no requiere auth en el agent)
  health: async () => {
    const target = await resolveTarget('default')
    return fetch(`${target.baseUrl}/health`).then((r) => r.json())
  },

  // Streams
  listStreams: async () => request(await resolveTarget('default'), '/api/streams'),
  getStream: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}`),
  getStatus: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/status`),
  getNowPlaying: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/now-playing`),
  start: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/start`, { method: 'POST' }),
  stop: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/stop`, { method: 'POST' }),
  restart: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/restart`, { method: 'POST' }),
  regenerateM3u: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/regenerate-m3u`, { method: 'POST' }),

  // Icecast global
  getIcecastStatus: async () => request(await resolveTarget('default'), '/api/icecast/status'),

  // Library
  listLibrary: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library`),
  refreshCovers: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/covers/refresh`, { method: 'POST' }),
  uploadTrack: async (clientId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/upload`, {
      method: 'POST',
      body: form,
      isMultipart: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
  },
  updateTrack: async (clientId: string, trackId: string, data: { title?: string; artist?: string; album?: string }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}`, {
      method: 'PATCH',
      body: data,
    }),
  deleteTrack: async (clientId: string, trackId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),
  getCover: async (clientId: string, trackId: string) =>
    requestRaw(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}/cover`),
  uploadCover: async (clientId: string, trackId: string, file: File) => {
    const form = new FormData()
    form.append('cover', file)
    return request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}/cover`, {
      method: 'POST',
      body: form,
      isMultipart: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
  },
  deleteCover: async (clientId: string, trackId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}/cover`, {
      method: 'DELETE',
    }),

  // Playlists
  listPlaylists: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists`),
  getPlaylist: async (clientId: string, playlistId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`),
  createPlaylist: async (clientId: string, data: { name: string; description?: string; shuffle?: boolean; repeat?: boolean }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists`, { method: 'POST', body: data }),
  updatePlaylist: async (clientId: string, playlistId: string, data: { name?: string; description?: string | null; shuffle?: boolean; repeat?: boolean }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`, { method: 'PATCH', body: data }),
  deletePlaylist: async (clientId: string, playlistId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' }),
  activatePlaylist: async (clientId: string, playlistId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/activate`, { method: 'POST' }),
  addTrackToPlaylist: async (clientId: string, playlistId: string, trackId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      body: { trackId },
    }),
  addTracksToPlaylist: async (clientId: string, playlistId: string, trackIds: string[]) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/tracks/bulk`, {
      method: 'POST',
      body: { trackIds },
    }),
  removeTrackFromPlaylist: async (clientId: string, playlistId: string, trackId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),
  reorderPlaylist: async (clientId: string, playlistId: string, trackIds: string[]) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/reorder`, {
      method: 'POST',
      body: { trackIds },
    }),

  // DJs
  listDjs: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/djs`),
  createDj: async (clientId: string, data: { name: string; mount: string; priority: number; role: string; password: string }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/djs`, { method: 'POST', body: data }),
  updateDj: async (clientId: string, djId: string, data: Partial<{ name: string; mount: string; priority: number; role: string; password: string; isActive: boolean }>) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/djs/${encodeURIComponent(djId)}`, { method: 'PATCH', body: data }),
  deleteDj: async (clientId: string, djId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/djs/${encodeURIComponent(djId)}`, { method: 'DELETE' }),
  kickDj: async (clientId: string, djId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/djs/${encodeURIComponent(djId)}/kick`, { method: 'POST' }),
  getDjSessions: async (clientId: string, page = 1, limit = 25) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/dj-sessions?page=${page}&limit=${limit}`),
  getLogs: async (clientId: string, lines = 100) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/logs?lines=${lines}`),

  // Jingles
  listJingles: async (clientId: string) => request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles`),
  uploadJingle: async (clientId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/upload`, {
      method: 'POST',
      body: form,
      isMultipart: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
  },
  updateJingle: async (clientId: string, jingleId: string, data: { title?: string; artist?: string }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(jingleId)}`, {
      method: 'PATCH',
      body: data,
    }),
  deleteJingle: async (clientId: string, jingleId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(jingleId)}`, {
      method: 'DELETE',
    }),
  getJingleCover: async (clientId: string, jingleId: string) =>
    requestRaw(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(jingleId)}/cover`),
  uploadJingleCover: async (clientId: string, jingleId: string, file: File) => {
    const form = new FormData()
    form.append('cover', file)
    return request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(jingleId)}/cover`, {
      method: 'POST',
      body: form,
      isMultipart: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
  },
  deleteJingleCover: async (clientId: string, jingleId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(jingleId)}/cover`, {
      method: 'DELETE',
    }),
  getJingleConfig: async (clientId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/config`),
  updateJingleConfig: async (clientId: string, jinglePlayEvery: number, jinglePlayCount: number) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/jingles/config`, {
      method: 'PATCH',
      body: { jinglePlayEvery, jinglePlayCount },
    }),

  // Stats (estadísticas de oyentes)
  listStats: async (clientId: string, params?: { period?: 'day' | 'week' | 'month'; from?: string; to?: string }) => {
    const search = new URLSearchParams()
    if (params?.period) search.set('period', params.period)
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    const qs = search.toString()
    return request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/stats${qs ? `?${qs}` : ''}`)
  },

  // History (play history)
  getHistory: async (clientId: string, page = 1, limit = 25) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/history?page=${page}&limit=${limit}`),

  // Folders
  listFolders: async (clientId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/folders`),
  createFolder: async (clientId: string, data: { name: string; parentId?: string | null }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/folders`, { method: 'POST', body: data }),
  updateFolder: async (clientId: string, folderId: string, data: { name?: string; parentId?: string | null }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      body: data,
    }),
  deleteFolder: async (clientId: string, folderId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/folders/${encodeURIComponent(folderId)}`, {
      method: 'DELETE',
    }),
  batchMoveTracks: async (clientId: string, trackIds: string[], folderId: string | null) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/folders/batch/move`, {
      method: 'POST',
      body: { trackIds, folderId },
    }),
  getFolderStats: async (clientId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/folders/stats`),

  // Schedule (parrilla horaria)
  listSchedule: async (clientId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/schedule`),
  createSchedule: async (clientId: string, data: { playlistId: string; dayOfWeek: number; startTime: string; endTime: string }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/schedule`, {
      method: 'POST',
      body: data,
    }),
  updateSchedule: async (clientId: string, scheduleId: string, data: { playlistId?: string; dayOfWeek?: number; startTime?: string; endTime?: string; isActive?: boolean }) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/schedule/${encodeURIComponent(scheduleId)}`, {
      method: 'PATCH',
      body: data,
    }),
  deleteSchedule: async (clientId: string, scheduleId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/schedule/${encodeURIComponent(scheduleId)}`, {
      method: 'DELETE',
    }),
  getCurrentSchedule: async (clientId: string) =>
    request(await resolveTarget('radio', clientId), `/api/streams/${encodeURIComponent(clientId)}/schedule/current`),

  // Monitor
  getHostStats: async () =>
    request(await resolveTarget('default'), '/api/admin/host-stats'),
  getStreamingStatus: async () =>
    request(await resolveTarget('default'), '/api/admin/streaming-status'),
}

// =====================================================
// Video / Televisión Client
// =====================================================

export const videoClient = {
  // Status
  getStatus: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/status`),

  // Control
  start: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/start`, { method: 'POST' }),
  stop: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/stop`, { method: 'POST' }),
  setShuffle: async (clientId: string, shuffle: boolean) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/shuffle`, { method: 'POST', body: { shuffle } }),

  // DJ Status
  getDjStatus: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/dj-status/${encodeURIComponent(clientId)}`),

  // Tracks
  listTracks: async (clientId: string, params?: { page?: number; limit?: number; folderId?: string; search?: string }) => {
    const search = new URLSearchParams()
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.folderId) search.set('folderId', params.folderId)
    if (params?.search) search.set('search', params.search)
    const qs = search.toString()
    return request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/tracks${qs ? `?${qs}` : ''}`)
  },
  uploadTrack: async (clientId: string, file: File, folderId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (folderId) form.append('folderId', folderId)
    return request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/tracks/upload`, {
      method: 'POST',
      body: form,
      isMultipart: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
  },
  deleteTrack: async (clientId: string, trackId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/tracks/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),

  // Playlists
  listPlaylists: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists`),
  createPlaylist: async (clientId: string, data: { name: string }) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists`, { method: 'POST', body: data }),
  deletePlaylist: async (clientId: string, playlistId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`, {
      method: 'DELETE',
    }),

  // Playlist entries
  listEntries: async (clientId: string, playlistId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/entries`),
  addEntry: async (clientId: string, playlistId: string, trackId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/entries`, {
      method: 'POST',
      body: { trackId },
    }),
  removeEntry: async (clientId: string, playlistId: string, entryId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/entries/${encodeURIComponent(entryId)}`, {
      method: 'DELETE',
    }),
  reorderEntries: async (clientId: string, playlistId: string, entryIds: string[]) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/entries/reorder`, {
      method: 'PUT',
      body: { entryIds },
    }),

  // Folders
  listFolders: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/folders`),
  createFolder: async (clientId: string, data: { name: string; parentId?: string | null }) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/folders`, { method: 'POST', body: data }),
  updateFolder: async (clientId: string, folderId: string, data: { name: string }) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/folders/${encodeURIComponent(folderId)}`, {
      method: 'PUT',
      body: data,
    }),
  deleteFolder: async (clientId: string, folderId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/folders/${encodeURIComponent(folderId)}`, {
      method: 'DELETE',
    }),

  // Batch move
  batchMoveTracks: async (clientId: string, trackIds: string[], folderId: string | null) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/tracks/batch-move`, {
      method: 'POST',
      body: { trackIds, folderId },
    }),

  // Storage
  getStorage: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/storage`),

  // History
  getHistory: async (clientId: string, page = 1, limit = 25) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/history?page=${page}&limit=${limit}`),

  // Schedule (parrilla horaria TV)
  listSchedule: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/schedule`),
  createSchedule: async (clientId: string, data: { playlistId: string; dayOfWeek: number; startTime: string; endTime: string }) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/schedule`, {
      method: 'POST',
      body: data,
    }),
  updateSchedule: async (clientId: string, scheduleId: string, data: { playlistId?: string; dayOfWeek?: number; startTime?: string; endTime?: string; isActive?: boolean }) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/schedule/${encodeURIComponent(scheduleId)}`, {
      method: 'PATCH',
      body: data,
    }),
  deleteSchedule: async (clientId: string, scheduleId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/schedule/${encodeURIComponent(scheduleId)}`, {
      method: 'DELETE',
    }),
  getCurrentSchedule: async (clientId: string) =>
    request(await resolveTarget('video', clientId), `/api/video/${encodeURIComponent(clientId)}/schedule/current`),

  // Encoders all
  getAllEncoders: async () =>
    request(await resolveTarget('default'), '/api/video/encoders'),
}
