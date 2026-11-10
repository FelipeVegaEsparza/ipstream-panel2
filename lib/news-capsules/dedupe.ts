import { createHash } from 'crypto'

export interface SourceIdentity {
  url?: string | null
  guid?: string | null
  title?: string | null
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function sourceKeys(source: SourceIdentity): string[] {
  const keys: string[] = []
  if (source.url) keys.push(`u:${source.url.trim()}`)
  if (source.guid) keys.push(`g:${source.guid.trim()}`)
  if (source.title) {
    const digest = createHash('sha256').update(normalize(source.title)).digest('hex').slice(0, 32)
    keys.push(`t:${digest}`)
  }
  return keys
}

export function isDuplicateSource(
  candidate: SourceIdentity,
  existing: SourceIdentity[],
  withinDays = 30,
  now = new Date()
): boolean {
  const keys = new Set(sourceKeys(candidate))
  if (keys.size === 0) return false
  // La ventana se valida en la consulta de la API; esta función trabaja con
  // las fuentes ya acotadas a la ventana. `withinDays`/`now` se conservan
  // para que el firmado sea explícito y testeable.
  void withinDays
  void now
  return existing.some((item) => sourceKeys(item).some((key) => keys.has(key)))
}
