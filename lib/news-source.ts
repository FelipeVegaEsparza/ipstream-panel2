const GNEWS_API_URL = 'https://gnews.io/api/v4/top-headlines'
const REQUEST_TIMEOUT_MS = 15_000

export interface NewsItem {
  title: string
  description: string
  url: string
  image: string | null
  publishedAt: string
  source: { name: string; url: string }
}

interface GNewsResponse {
  totalArticles?: number
  articles?: Array<{
    title?: string
    description?: string
    content?: string
    url?: string
    image?: string | null
    publishedAt?: string
    source?: { name?: string; url?: string }
  }>
  errors?: string[]
}

function getApiKey(): string {
  const key = process.env.GNEWS_API_KEY
  if (!key) {
    throw new Error('GNEWS_API_KEY no está configurada en las variables de entorno')
  }
  return key
}

function isRetryableNetworkError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('fetch failed') ||
    lower.includes('aborted')
  )
}

function normalizeArticle(raw: NonNullable<GNewsResponse['articles']>[number]): NewsItem | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const url = typeof raw.url === 'string' ? raw.url.trim() : ''
  const sourceName = typeof raw.source?.name === 'string' ? raw.source.name.trim() : ''
  if (!title || !url || !sourceName) return null

  return {
    title,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    url,
    image: typeof raw.image === 'string' && raw.image.trim() ? raw.image.trim() : null,
    publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : '',
    source: {
      name: sourceName,
      url: typeof raw.source?.url === 'string' ? raw.source.url : '',
    },
  }
}

async function callGNewsOnce(lang: string, max: number, apiKey: string): Promise<NewsItem[] | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const url = `${GNEWS_API_URL}?lang=${encodeURIComponent(lang)}&max=${max}&apikey=${encodeURIComponent(apiKey)}`
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[gnews] HTTP error', res.status, text.slice(0, 500))
      return null
    }
    const data: GNewsResponse = await res.json()
    if (!Array.isArray(data.articles) || data.articles.length === 0) {
      console.warn('[gnews] respuesta sin artículos')
      return null
    }
    const items = data.articles
      .map((a) => normalizeArticle(a))
      .filter((a): a is NewsItem => a !== null)
    if (items.length === 0) {
      console.warn('[gnews] ningún artículo válido tras normalizar')
      return null
    }
    return items
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[gnews] request failed:', message)
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetches the latest top headlines in the given language.
 * Returns null on ANY failure (missing key, timeout, non-2xx, empty response).
 * Retries only on transient network errors (ECONNRESET, ETIMEDOUT, fetch failed).
 */
export async function fetchTopHeadlines(
  options: { lang?: string; max?: number } = {}
): Promise<NewsItem[] | null> {
  const lang = options.lang ?? 'es'
  const max = options.max ?? 10
  let apiKey: string
  try {
    apiKey = getApiKey()
  } catch (err) {
    console.error('[gnews] API key ausente')
    return null
  }

  try {
    return await callGNewsOnce(lang, max, apiKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isRetryableNetworkError(message)) {
      console.warn('[gnews] reintentando por error de red transitorio')
      try {
        return await callGNewsOnce(lang, max, apiKey)
      } catch (err2) {
        console.error('[gnews] segundo intento también falló:', err2)
        return null
      }
    }
    return null
  }
}
