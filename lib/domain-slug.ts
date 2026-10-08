// =====================================================
// Domain slug — nombre de radio → subdominio
// =====================================================

/** Subdominios reservados (infraestructura de la plataforma). */
export const RESERVED_SUBDOMAINS = new Set<string>([
  'panel', 'panel1', 'panel2', 'panel3', 'stream', 'stream1', 'stream2',
  'www', 'api', 'app', 'admin', 'dashboard', 'clientes', 'sitio', 'web',
  'mail', 'smtp', 'imap', 'pop', 'db', 'mysql', 'ftp', 'webmail',
  'cpanel', 'whm', 'webdisk', 'autodiscover', 'autoconfig',
  'ns', 'ns1', 'ns2', 'ns3', 'cdn', 'static', 'assets', 'media',
  'soporte', 'support', 'help', 'status', 'billing', 'pago', 'pagos',
  'ipstream', 'test', 'demo', 'staging', 'dev', 'about', 'blog', 'docs',
])

export const SLUG_MIN_LENGTH = 2
export const SLUG_MAX_LENGTH = 40

/** Convierte el nombre de la radio en un slug DNS-safe. */
export function slugifyRadioName(name: string | null | undefined): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '')
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SUBDOMAINS.has(slug)
}

/** Valida el formato de un slug (label DNS). Devuelve null si es válido. */
export function slugError(slug: string): 'empty' | 'short' | 'format' | 'reserved' | null {
  if (!slug) return 'empty'
  if (slug.length < SLUG_MIN_LENGTH) return 'short'
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length > 63) return 'format'
  if (isReservedSlug(slug)) return 'reserved'
  return null
}

/** Construye el hostname del sitio a partir del slug y el dominio base. */
export function buildSiteHost(slug: string, domain: string): string {
  return domain ? `${slug}.${domain}` : slug
}
