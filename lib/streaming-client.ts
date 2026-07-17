// =====================================================
// Streaming Client — habla con el streaming-agent
// =====================================================

const AGENT_URL = process.env.STREAMING_AGENT_URL || 'http://agent:4000'
const AGENT_TOKEN = process.env.STREAMING_AGENT_TOKEN || ''

const DEFAULT_TIMEOUT_MS = 30000  // 30s
const UPLOAD_TIMEOUT_MS = 120000  // 2 min para uploads grandes

export class StreamingAgentError extends Error {
  constructor(message, public status: number, public body?: any) {
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

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, isMultipart = false } = options

  if (!AGENT_TOKEN) {
    throw new Error('STREAMING_AGENT_TOKEN no está configurado en el panel')
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${AGENT_TOKEN}`,
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
    const res = await fetch(`${AGENT_URL}${path}`, {
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

// =====================================================
// Streams
// =====================================================

export const streamingClient = {
  // Health (no requiere auth en el agent)
  health: () =>
    fetch(`${AGENT_URL}/health`).then((r) => r.json()),

  // Streams
  listStreams: () => request('/api/streams'),
  getStream: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}`),
  getStatus: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/status`),
  getNowPlaying: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/now-playing`),
  start: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/start`, { method: 'POST' }),
  stop: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/stop`, { method: 'POST' }),
  restart: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/restart`, { method: 'POST' }),
  regenerateM3u: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/regenerate-m3u`, { method: 'POST' }),

  // Icecast global
  getIcecastStatus: () => request('/api/icecast/status'),

  // Library
  listLibrary: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/library`),
  uploadTrack: async (clientId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request(`/api/streams/${encodeURIComponent(clientId)}/library/upload`, {
      method: 'POST',
      body: form,
      isMultipart: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
  },
  updateTrack: (clientId: string, trackId: string, data: { title?: string; artist?: string; album?: string }) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}`, {
      method: 'PATCH',
      body: data,
    }),
  deleteTrack: (clientId: string, trackId: string) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),

  // Playlists
  listPlaylists: (clientId: string) => request(`/api/streams/${encodeURIComponent(clientId)}/playlists`),
  getPlaylist: (clientId: string, playlistId: string) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`),
  createPlaylist: (clientId: string, data: { name: string; description?: string; shuffle?: boolean; repeat?: boolean }) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists`, { method: 'POST', body: data }),
  updatePlaylist: (clientId: string, playlistId: string, data: { name?: string; description?: string | null; shuffle?: boolean; repeat?: boolean }) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`, { method: 'PATCH', body: data }),
  deletePlaylist: (clientId: string, playlistId: string) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' }),
  activatePlaylist: (clientId: string, playlistId: string) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/activate`, { method: 'POST' }),
  addTrackToPlaylist: (clientId: string, playlistId: string, trackId: string) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      body: { trackId },
    }),
  removeTrackFromPlaylist: (clientId: string, playlistId: string, trackId: string) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),
  reorderPlaylist: (clientId: string, playlistId: string, trackIds: string[]) =>
    request(`/api/streams/${encodeURIComponent(clientId)}/playlists/${encodeURIComponent(playlistId)}/reorder`, {
      method: 'POST',
      body: { trackIds },
    }),
}
