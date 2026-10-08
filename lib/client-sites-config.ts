// =====================================================
// Client sites config — configuración de plataforma (dashboard o env)
// =====================================================
// El admin puede configurar dominio base, target, IP y token de Cloudflare
// desde /admin/settings (tabla app_config). Si un campo está vacío, se usa la
// variable de entorno correspondiente. Cache corto para no golpear la DB.

import { prisma } from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'

export interface ClientSitesConfig {
  domain: string
  target: string
  ip: string
  cloudflareToken: string
}

const CACHE_TTL_MS = 60_000
let cache: { value: ClientSitesConfig; at: number } | null = null

function cleanDomain(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '')
}

function cleanHost(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\.+$/, '')
}

function envConfig(): ClientSitesConfig {
  return {
    domain: cleanDomain(process.env.CLIENT_SITES_DOMAIN),
    target: cleanHost(process.env.CLIENT_SITES_TARGET),
    ip: (process.env.CLIENT_SITES_IP || '').trim(),
    cloudflareToken: process.env.CLOUDFLARE_API_TOKEN || '',
  }
}

function tokenFromDb(enc: string | null): string | null {
  if (!enc) return null
  try {
    return isEncrypted(enc) ? decrypt(enc) : enc
  } catch {
    return null
  }
}

export function invalidateClientSitesConfig(): void {
  cache = null
}

export async function getClientSitesConfig(): Promise<ClientSitesConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value

  const env = envConfig()
  let value = env
  try {
    const cfg = await prisma.appConfig.findFirst({
      select: {
        clientSitesDomain: true,
        clientSitesTarget: true,
        clientSitesIp: true,
        cloudflareApiTokenEnc: true,
      },
    })
    if (cfg) {
      value = {
        domain: cleanDomain(cfg.clientSitesDomain) || env.domain,
        target: cleanHost(cfg.clientSitesTarget) || env.target,
        ip: (cfg.clientSitesIp || '').trim() || env.ip,
        cloudflareToken: tokenFromDb(cfg.cloudflareApiTokenEnc) || env.cloudflareToken,
      }
    }
  } catch {
    // DB no disponible: usar env
  }

  cache = { value, at: Date.now() }
  return value
}
