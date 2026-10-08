// =====================================================
// DNS provider — provisión de subdominios y verificación de dominios custom
// =====================================================
// La configuración (dominio base, target, IP y token de Cloudflare) sale de
// app_config (dashboard) con fallback a env, vía getClientSitesConfig().
// Subdominios: si hay wildcard *.dominio, no hace falta registro por host.
// Custom: los configura el cliente (CNAME al target); aquí solo se verifica.

import { promises as dns } from 'dns'
import { getClientSitesConfig, type ClientSitesConfig } from '@/lib/client-sites-config'

const CF_API = 'https://api.cloudflare.com/client/v4'

interface CfRecord {
  id: string
  type: string
  name: string
  content: string
}

function providerConfigured(cfg: ClientSitesConfig): boolean {
  return Boolean(cfg.cloudflareToken && cfg.domain && (cfg.target || cfg.ip))
}

async function cf<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
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
    const msg =
      body.errors?.map((e) => e.message).filter(Boolean).join('; ') || `Cloudflare ${res.status}`
    throw new Error(msg)
  }
  return body.result as T
}

async function cfZoneId(cfg: ClientSitesConfig): Promise<string> {
  const direct = await cf<Array<{ id: string; name: string }>>(
    cfg.cloudflareToken,
    `/zones?name=${encodeURIComponent(cfg.domain)}&status=active&per_page=1`
  )
  if (direct?.[0]?.id) return direct[0].id

  // El dominio de sitios puede ser un subdominio de la zona (p. ej.
  // sitios.ipstream.cl con zona ipstream.cl): buscamos la zona que sea sufijo.
  const all = await cf<Array<{ id: string; name: string }>>(
    cfg.cloudflareToken,
    '/zones?status=active&per_page=50'
  )
  const match = (all || [])
    .filter((z) => cfg.domain === z.name || cfg.domain.endsWith(`.${z.name}`))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (!match) throw new Error(`No se encontró la zona de ${cfg.domain} en Cloudflare`)
  return match.id
}

/** Verifica si existe un wildcard DNS para el dominio base. */
async function wildcardCovers(hostname: string, domain: string): Promise<boolean> {
  if (!domain || !hostname.endsWith(`.${domain}`)) return false
  const probe = `ipstream-wc-check-${Date.now().toString(36)}.${domain}`
  try {
    const [a, cname] = await Promise.allSettled([dns.resolve4(probe), dns.resolveCname(probe)])
    return a.status === 'fulfilled' || cname.status === 'fulfilled'
  } catch {
    return false
  }
}

/**
 * Asegura el registro DNS de un subdominio de plataforma. Si un wildcard ya lo
 * cubre, no crea nada. Idempotente.
 */
export async function ensureSubdomainRecord(hostname: string): Promise<void> {
  const cfg = await getClientSitesConfig()

  if (!cfg.domain || !hostname.endsWith(`.${cfg.domain}`)) {
    throw new Error(`El subdominio ${hostname} no pertenece a ${cfg.domain || '(sin dominio base configurado)'}`)
  }

  if (await wildcardCovers(hostname, cfg.domain)) return

  if (!providerConfigured(cfg)) {
    throw new Error(
      'DNS no configurado: configura el token de Cloudflare en Ajustes, o un ' +
        `wildcard *.${cfg.domain} que apunte a la plataforma`
    )
  }

  const zoneId = await cfZoneId(cfg)
  const existing = await cf<CfRecord[]>(
    cfg.cloudflareToken,
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`
  )
  if (existing?.length) return

  const record = cfg.target
    ? { type: 'CNAME', name: hostname, content: cfg.target, proxied: false, ttl: 1 }
    : { type: 'A', name: hostname, content: cfg.ip, proxied: false, ttl: 1 }

  await cf(cfg.cloudflareToken, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(record),
  })
}

/**
 * Verifica que un dominio custom apunte a la plataforma: por CNAME al target, o
 * por A (apex con flattening) a la misma IP que ese target.
 */
export async function verifyCustomDomain(hostname: string): Promise<boolean> {
  const cfg = await getClientSitesConfig()
  if (!cfg.target) return false
  const host = hostname.toLowerCase().replace(/\.+$/, '')

  try {
    const cnames = await dns.resolveCname(host)
    if (cnames.some((c) => c.toLowerCase().replace(/\.+$/, '') === cfg.target)) return true
  } catch {
    // sin CNAME: se prueba A más abajo
  }

  try {
    const [hostIps, targetIps] = await Promise.all([
      dns.resolve4(host),
      dns.resolve4(cfg.target),
    ])
    if (hostIps.length && hostIps.some((ip) => targetIps.includes(ip))) return true
  } catch {
    // sin A
  }

  return false
}

export interface EnsureBaseDnsResult {
  domain: string
  type: string
  name: string
  content: string
  created: boolean
}

/**
 * Asegura el DNS base: el wildcard `*.dominio` apuntando a la plataforma (A a
 * la IP, o CNAME al target). Idempotente. Se dispara desde Ajustes.
 */
export async function ensureBaseDns(): Promise<EnsureBaseDnsResult> {
  const cfg = await getClientSitesConfig()

  if (!cfg.cloudflareToken) throw new Error('Falta el token de Cloudflare')
  if (!cfg.domain) throw new Error('Falta el dominio base de los sitios')
  if (!cfg.ip && !cfg.target) throw new Error('Falta la IP de la plataforma (o un target CNAME)')

  // Sin IP usamos CNAME al target; pero si el target cae dentro del propio
  // wildcard, se produce un loop. En ese caso exigimos la IP (registro A).
  if (!cfg.ip && (cfg.target === cfg.domain || cfg.target.endsWith(`.${cfg.domain}`))) {
    throw new Error(
      `El target ${cfg.target} cae dentro del wildcard *.${cfg.domain} (loop de CNAME). ` +
        'Configura la IP de la plataforma para crear un registro A.'
    )
  }

  const zoneId = await cfZoneId(cfg)
  const name = `*.${cfg.domain}`

  const existing = await cf<CfRecord[]>(
    cfg.cloudflareToken,
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`
  )
  if (existing?.length) {
    return { domain: cfg.domain, type: existing[0].type, name, content: existing[0].content, created: false }
  }

  const record = cfg.ip
    ? { type: 'A', name, content: cfg.ip, proxied: false, ttl: 1 }
    : { type: 'CNAME', name, content: cfg.target, proxied: false, ttl: 1 }

  await cf(cfg.cloudflareToken, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(record),
  })
  return { domain: cfg.domain, type: record.type, name, content: record.content, created: true }
}
