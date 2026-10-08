// =====================================================
// Client domains — registro y resolución host → cliente
// =====================================================
// Un mismo bundle de la PWA sirve a todos los clientes; el tenant se resuelve
// por el host desde el que se carga. Acá vive la normalización de host y la
// búsqueda en `client_domains`, con un cache corto para no golpear la DB.

import { prisma, type PrismaDb } from '@/lib/prisma'

/** Dominio base de los subdominios de la plataforma (p. ej. panelipstream.cl). */
export const CLIENT_SITES_DOMAIN = (process.env.CLIENT_SITES_DOMAIN || '')
  .trim()
  .toLowerCase()
  .replace(/^\.+/, '')
  .replace(/\.+$/, '')

export interface ResolvedClientDomain {
  clientId: string
  clientName: string | null
  hostname: string
  kind: string
  isPrimary: boolean
}

/** Normaliza un host: minúsculas, sin protocolo/path, puerto ni punto final. */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null
  let host = raw.trim().toLowerCase()
  if (!host) return null
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  host = host.split('/')[0]
  host = host.replace(/:\d+$/, '')
  host = host.replace(/\.+$/, '')
  return host || null
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { value: ResolvedClientDomain | null; at: number }>()

/** Invalida el cache de resolución (todo o un host puntual). */
export function clearClientDomainCache(host?: string): void {
  if (host) {
    const normalized = normalizeHost(host)
    if (normalized) cache.delete(normalized)
  } else {
    cache.clear()
  }
}

const domainInclude = { client: { select: { id: true, name: true } } } as const

function toResolved(
  row: { clientId: string; hostname: string; kind: string; isPrimary: boolean; client: { name: string | null } }
): ResolvedClientDomain {
  return {
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    hostname: row.hostname,
    kind: row.kind,
    isPrimary: row.isPrimary,
  }
}

/**
 * Resuelve el cliente dueño de un host. Devuelve null si el host no está
 * registrado o su dominio no está `active`.
 */
export async function resolveClientByHost(
  rawHost: string,
  db: PrismaDb = prisma
): Promise<ResolvedClientDomain | null> {
  const host = normalizeHost(rawHost)
  if (!host) return null

  const cached = cache.get(host)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const candidates = [host]
  if (host.startsWith('www.')) candidates.push(host.slice(4))

  let row = await db.clientDomain.findFirst({
    where: { hostname: { in: candidates }, status: 'active' },
    include: domainInclude,
  })

  // Subdominio de plataforma: permite registrar solo la etiqueta (p. ej. "radio-x")
  // y resolverla desde "radio-x.<CLIENT_SITES_DOMAIN>".
  if (!row && CLIENT_SITES_DOMAIN && host.endsWith(`.${CLIENT_SITES_DOMAIN}`)) {
    const label = host.slice(0, host.length - CLIENT_SITES_DOMAIN.length - 1)
    if (label && !label.includes('.')) {
      row = await db.clientDomain.findFirst({
        where: { hostname: label, status: 'active' },
        include: domainInclude,
      })
    }
  }

  const value = row ? toResolved(row) : null
  cache.set(host, { value, at: Date.now() })
  return value
}
