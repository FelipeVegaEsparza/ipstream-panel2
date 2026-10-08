import { getPublicApiBase, IPSTREAM_BASE } from '@/core/config/tenant'
import type {
  Announcer,
  BasicData,
  ChatMessagesResponse,
  ChatOnlineResponse,
  EventItem,
  FullClientData,
  Gallery,
  News,
  PaginatedResponse,
  Podcast,
  Poll,
  Program,
  Promotion,
  PwaRegisterResponse,
  SocialNetworks,
  Sponsor,
  Streaming,
  StreamingStatus,
  Videocast,
  Video
} from '@/core/types'
import { CACHE_TTL, getCache, setCache } from './cache'
import { request } from './client'
import { ApiError } from './errors'

export { ApiError, isNotFoundError } from './errors'

interface FetchJSONOptions {
  ttl?: number
  cache?: boolean
  timeout?: number
  retries?: number
}

async function fetchJSON<T>(
  clientId: string,
  path: string,
  options: FetchJSONOptions = {}
): Promise<T> {
  const base = getPublicApiBase(clientId)
  const url = `${base}${path}`
  const useCache = options.cache !== false

  if (useCache) {
    const cached = getCache<T>(clientId, path)
    if (cached !== undefined) return cached
  }

  const response = await request(url, {
    timeout: options.timeout,
    retries: options.retries
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  const data = (await response.json()) as T
  if (useCache) {
    setCache(clientId, path, data, options.ttl)
  }
  return data
}

export function buildImageUrl(
  path: string | null | undefined
): string | null {
  if (!path) return null
  if (/^([a-z][a-z0-9+.-]*:)/i.test(path)) return path
  return `${IPSTREAM_BASE}${path}`
}

const AUTH_GATED_PREFIX = '/api/dashboard/'

export function isPublicImageUrl(path?: string | null): boolean {
  if (!path) return false
  if (/^([a-z][a-z0-9+.-]*:)/i.test(path)) return true
  return !path.startsWith(AUTH_GATED_PREFIX)
}

export function firstPublicImageUrl(
  paths: Array<string | null | undefined>
): string | null {
  for (const path of paths) {
    const url = buildImageUrl(path)
    if (url && isPublicImageUrl(path)) return url
  }
  return null
}

export function getAllClientData(clientId: string): Promise<FullClientData> {
  return fetchJSON<FullClientData>(clientId, '', { ttl: CACHE_TTL.basic })
}

export function getBasicData(clientId: string): Promise<BasicData> {
  return fetchJSON<BasicData>(clientId, '/basic-data', { ttl: CACHE_TTL.basic })
}

export function getSocialNetworks(clientId: string): Promise<SocialNetworks> {
  return fetchJSON<SocialNetworks>(clientId, '/social-networks', {
    ttl: CACHE_TTL.social
  })
}

export function getStreaming(clientId: string): Promise<Streaming> {
  return fetchJSON<Streaming>(clientId, '/streaming', { cache: false })
}

export function getStreamingStatus(clientId: string): Promise<StreamingStatus> {
  return fetchJSON<StreamingStatus>(clientId, '/streaming/status', {
    cache: false
  })
}

export function getPrograms(clientId: string): Promise<Program[]> {
  return fetchJSON<Program[]>(clientId, '/programs', { ttl: CACHE_TTL.programs })
}

export function getNews(
  clientId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResponse<News>> {
  return fetchJSON<PaginatedResponse<News>>(
    clientId,
    `/news?page=${page}&limit=${limit}`,
    { ttl: CACHE_TTL.news }
  )
}

export function getNewsBySlug(clientId: string, slug: string): Promise<News> {
  return fetchJSON<News>(clientId, `/news/${encodeURIComponent(slug)}`, {
    ttl: CACHE_TTL.news
  })
}

export function getVideos(clientId: string): Promise<Video[]> {
  return fetchJSON<Video[]>(clientId, '/videos', { ttl: CACHE_TTL.default })
}

export function getSponsors(clientId: string): Promise<Sponsor[]> {
  return fetchJSON<Sponsor[]>(clientId, '/sponsors', { ttl: CACHE_TTL.sponsors })
}

export function getPromotions(clientId: string): Promise<Promotion[]> {
  return fetchJSON<Promotion[]>(clientId, '/promotions', {
    ttl: CACHE_TTL.promotions
  })
}

export function getGalleries(clientId: string): Promise<Gallery[]> {
  return fetchJSON<Gallery[]>(clientId, '/galleries', { ttl: CACHE_TTL.default })
}

export function getAnnouncers(clientId: string): Promise<Announcer[]> {
  return fetchJSON<Announcer[]>(clientId, '/announcers', {
    ttl: CACHE_TTL.default
  })
}

export function getEvents(clientId: string): Promise<EventItem[]> {
  return fetchJSON<EventItem[]>(clientId, '/events', { ttl: CACHE_TTL.default })
}

export function getPolls(clientId: string): Promise<Poll[]> {
  return fetchJSON<Poll[]>(clientId, '/polls', { ttl: CACHE_TTL.default })
}

export function getPodcasts(
  clientId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResponse<Podcast>> {
  return fetchJSON<PaginatedResponse<Podcast>>(
    clientId,
    `/podcasts?page=${page}&limit=${limit}`,
    { ttl: CACHE_TTL.default }
  )
}

export function getPodcastById(clientId: string, id: string): Promise<Podcast> {
  return fetchJSON<Podcast>(clientId, `/podcasts/${encodeURIComponent(id)}`, {
    ttl: CACHE_TTL.default
  })
}

export function getVideocasts(
  clientId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResponse<Videocast>> {
  return fetchJSON<PaginatedResponse<Videocast>>(
    clientId,
    `/videocasts?page=${page}&limit=${limit}`,
    { ttl: CACHE_TTL.default }
  )
}

export function getVideocastById(
  clientId: string,
  id: string
): Promise<Videocast> {
  return fetchJSON<Videocast>(clientId, `/videocasts/${encodeURIComponent(id)}`, {
    ttl: CACHE_TTL.default
  })
}

export function getChatMessages(
  clientId: string,
  since?: string,
  limit = 50
): Promise<ChatMessagesResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (since) params.set('since', since)
  return fetchJSON<ChatMessagesResponse>(clientId, `/chat/messages?${params}`, {
    cache: false
  })
}

export function getChatOnline(clientId: string): Promise<ChatOnlineResponse> {
  return fetchJSON<ChatOnlineResponse>(clientId, '/chat/online', {
    cache: false
  })
}

export async function votePoll(
  clientId: string,
  pollId: string,
  optionId: string
): Promise<Poll> {
  const response = await request(
    getPublicApiBase(clientId) + `/polls/${encodeURIComponent(pollId)}/vote`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId })
    }
  )
  if (!response.ok) {
    throw new ApiError(response.status)
  }
  return response.json()
}

export interface SendChatMessageInput {
  name: string
  email?: string | null
  body: string
}

export async function sendChatMessage(
  clientId: string,
  input: SendChatMessageInput
): Promise<ChatMessagesResponse> {
  const response = await request(getPublicApiBase(clientId) + '/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email ?? '',
      body: input.body
    })
  })
  if (!response.ok) {
    throw new ApiError(response.status)
  }
  return response.json()
}

export async function registerPwaInstall(
  clientId: string,
  deviceId: string
): Promise<PwaRegisterResponse> {
  const response = await request(getPublicApiBase(clientId) + '/pwa/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
    retries: 1
  })
  if (!response.ok) {
    throw new ApiError(response.status)
  }
  return response.json()
}

export interface ContactMessageInput {
  name: string
  email: string
  phone: string
  message: string
}

export type ContactSubmitResult =
  | { status: 'sent' }
  | { status: 'validation-error'; error: string }
  | { status: 'rate-limited' }
  | { status: 'not-found' }
  | { status: 'server-error' }
  | { status: 'network-error' }

/**
 * Envía un mensaje de contacto del visitante al panel del cliente. Un solo
 * intento (retries: 0): no se reintenta para no duplicar consultas en el panel
 * si el servidor ya procesó el envío pero la respuesta se pierde.
 */
export async function sendContactMessage(
  clientId: string,
  input: ContactMessageInput
): Promise<ContactSubmitResult> {
  let response: Response
  try {
    response = await request(getPublicApiBase(clientId) + '/contact-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      retries: 0
    })
  } catch {
    return { status: 'network-error' }
  }

  if (response.status === 201) return { status: 'sent' }
  if (response.status === 429) return { status: 'rate-limited' }
  if (response.status === 404) return { status: 'not-found' }
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown
    } | null
    const message =
      typeof body?.error === 'string' && body.error
        ? body.error
        : 'Revisa los datos e inténtalo de nuevo.'
    return { status: 'validation-error', error: message }
  }
  return { status: 'server-error' }
}
