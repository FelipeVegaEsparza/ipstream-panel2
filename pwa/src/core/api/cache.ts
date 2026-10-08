interface CacheEntry {
  data: unknown
  expiry: number
}

export type CacheKey =
  | 'basic'
  | 'programs'
  | 'news'
  | 'sponsors'
  | 'promotions'
  | 'social'
  | 'streaming'
  | 'default'

export const CACHE_TTL: Record<CacheKey, number> = {
  basic: 5 * 60 * 1000,
  programs: 15 * 60 * 1000,
  news: 5 * 60 * 1000,
  sponsors: 30 * 60 * 1000,
  promotions: 30 * 60 * 1000,
  social: 60 * 60 * 1000,
  streaming: 30 * 1000,
  default: 10 * 60 * 1000
}

const store = new Map<string, CacheEntry>()

function makeKey(clientId: string, key: string): string {
  return `${clientId}:${key}`
}

export function getCache<T>(clientId: string, key: string): T | undefined {
  const entry = store.get(makeKey(clientId, key))
  if (!entry) return undefined
  if (Date.now() > entry.expiry) {
    store.delete(makeKey(clientId, key))
    return undefined
  }
  return entry.data as T
}

export function setCache<T>(
  clientId: string,
  key: string,
  data: T,
  ttl = CACHE_TTL.default
): void {
  store.set(makeKey(clientId, key), { data, expiry: Date.now() + ttl })
}

export function invalidateCache(clientId: string, key?: string): void {
  if (key) {
    store.delete(makeKey(clientId, key))
    return
  }
  const prefix = `${clientId}:`
  for (const cacheKey of store.keys()) {
    if (cacheKey.startsWith(prefix)) {
      store.delete(cacheKey)
    }
  }
}

export function clearAllCache(): void {
  store.clear()
}

export function getCacheSize(): number {
  return store.size
}
