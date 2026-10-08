// =====================================================
// DNS provider — provisión de subdominios y verificación de dominios custom
// =====================================================
// Subdominios de plataforma (<label>.<CLIENT_SITES_DOMAIN>): se crean vía API
// de Cloudflare si hay token; si no, se asume un wildcard DNS a nivel infra y
// se verifica resolviendo una etiqueta aleatoria.
// Dominios custom: los configura el cliente (CNAME a CLIENT_SITES_TARGET); acá
// solo se verifica.

import { promises as dns } from 'dns'
import { CLIENT_SITES_DOMAIN } from '@/lib/client-domains'

const CF_API = 'https://api.cloudflare.com/client/v4'
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''

export const CLIENT_SITES_TARGET = (process.env.CLIENT_SITES_TARGET || '')
  .trim()
  .toLowerCase()
  .replace(/\.+$/, '')
export const CLIENT_SITES_IP = (process.env.CLIENT_SITES_IP || '').trim()

export function dnsProviderConfigured(): boolean {
  return Boolean(CF_TOKEN && CLIENT_SITES_DOMAIN && (CLIENT_SITES_TARGET || CLIENT_SITES_IP))
}

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean
    result?: T
    errors?: Array<{ message?: string }>
  }
  if (!res.ok || body.success === false) {
    const msg = body.errors?.map((e) => e.message).filter(Boolean).join('; ') || `Cloudflare ${res.status}`
    throw new Error(msg)
  }
  return body.result as T
}

async function cfZoneId(): Promise<string> {
  const zones = await cf<Array<{ id: string }>>(
    `/zones?name=${encodeURIComponent(CLIENT_SITES_DOMAIN)}&status=active&per_page=1`
  )
  const zone = zones?.[0]
  if (!zone?.id) throw new Error(`No se encontró la zona ${CLIENT_SITES_DOMAIN} en Cloudflare`)
  return zone.id
}

/** Verifica si existe un wildcard DNS para el dominio base (sin Cloudflare). */
async function wildcardCovers(hostname: string): Promise<boolean> {
  if (!CLIENT_SITES_DOMAIN || !hostname.endsWith(`.${CLIENT_SITES_DOMAIN}`)) return false
  const probe = `ipstream-wc-check-${Date.now().toString(36)}.${CLIENT_SITES_DOMAIN}`
  try {
    const [a, cname] = await Promise.allSettled([dns.resolve4(probe), dns.resolveCname(probe)])
    return a.status === 'fulfilled' || cname.status === 'fulfilled'
  } catch {
    return false
  }
}

/**
 * Asegura el registro DNS de un subdominio de plataforma. Idempotente: si ya
 * existe (registro exacto o wildcard), no duplica.
 */
export async function ensureSubdomainRecord(hostname: string): Promise<void> {
  if (!CLIENT_SITES_DOMAIN || !hostname.endsWith(`.${CLIENT_SITES_DOMAIN}`)) {
    throw new Error(`El subdominio ${hostname} no pertenece a ${CLIENT_SITES_DOMAIN}`)
  }

  if (!dnsProviderConfigured()) {
    if (await wildcardCovers(hostname)) return
    throw new Error(
      'DNS no configurado: definí CLOUDFLARE_API_TOKEN o un wildcard DNS ' +
        `*.${CLIENT_SITES_DOMAIN} que apunte a la plataforma`
    )
  }

  const zoneId = await cfZoneId()
  const existing = await cf<Array<{ id: string }>>(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`
  )
  if (existing?.length) return

  const record = CLIENT_SITES_TARGET
    ? { type: 'CNAME', name: hostname, content: CLIENT_SITES_TARGET, proxied: false, ttl: 1 }
    : { type: 'A', name: hostname, content: CLIENT_SITES_IP, proxied: false, ttl: 1 }

  await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body: JSON.stringify(record) })
}

/**
 * Verifica que un dominio custom apunte a la plataforma: por CNAME a
 * CLIENT_SITES_TARGET, o por A (apex con flattening) a la misma IP que ese
 * target.
 */
export async function verifyCustomDomain(hostname: string): Promise<boolean> {
  if (!CLIENT_SITES_TARGET) return false
  const host = hostname.toLowerCase().replace(/\.+$/, '')

  try {
    const cnames = await dns.resolveCname(host)
    if (cnames.some((c) => c.toLowerCase().replace(/\.+$/, '') === CLIENT_SITES_TARGET)) return true
  } catch {
    // sin CNAME: se prueba A más abajo
  }

  try {
    const [hostIps, targetIps] = await Promise.all([
      dns.resolve4(host),
      dns.resolve4(CLIENT_SITES_TARGET),
    ])
    if (hostIps.length && hostIps.some((ip) => targetIps.includes(ip))) return true
  } catch {
    // sin A
  }

  return false
}
