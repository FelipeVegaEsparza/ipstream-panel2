import dns from 'dns/promises'
import net from 'net'

export const SOURCE_TIMEOUT_MS = 8_000
export const SOURCE_MAX_BYTES = 2 * 1024 * 1024
export const SOURCE_MAX_REDIRECTS = 3

export class SourceError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'SourceError'
    this.code = code
    this.status = status
  }
}

export function validateSourceUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new SourceError('invalid_url', 'La URL no es válida.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SourceError('invalid_protocol', 'Solo se aceptan URLs HTTP o HTTPS.')
  }
  if (url.username || url.password) {
    throw new SourceError('invalid_credentials', 'La URL no puede incluir credenciales.')
  }
  if (isPrivateHostname(url.hostname) || isPrivateIp(url.hostname)) {
    throw new SourceError('private_url', 'No se permiten URLs locales o privadas.')
  }
  return url
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal' ||
    host === '169.254.169.254'
  )
}

export function isPrivateIp(value: string): boolean {
  const ip = net.isIP(value)
  if (ip === 4) {
    const parts = value.split('.').map(Number)
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false
    }
    const [a, b] = parts
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    )
  }
  if (ip === 6) {
    const normalized = value.toLowerCase()
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.')
    )
  }
  return false
}

export async function assertPublicHost(url: URL, lookup = dns.lookup): Promise<void> {
  if (net.isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) {
      throw new SourceError('private_url', 'No se permiten URLs locales o privadas.')
    }
    return
  }
  let addresses: Array<{ address: string }>
  try {
    addresses = await lookup(url.hostname, { all: true })
  } catch {
    throw new SourceError('dns_failed', 'No se pudo resolver el dominio de la fuente.')
  }
  if (!addresses.length) {
    throw new SourceError('dns_failed', 'El dominio de la fuente no tiene direcciones públicas.')
  }
  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new SourceError('private_url', 'No se permiten URLs locales o privadas.')
  }
}

interface FetchLike {
  (input: URL, init: RequestInit): Promise<Response>
}

export async function fetchPublicSource(
  rawUrl: string,
  options: {
    fetchImpl?: FetchLike
    lookup?: typeof dns.lookup
    timeoutMs?: number
    maxBytes?: number
    maxRedirects?: number
  } = {}
): Promise<{ url: URL; text: string; contentType: string }> {
  const fetchImpl = options.fetchImpl || ((input, init) => fetch(input, init))
  const timeoutMs = options.timeoutMs ?? SOURCE_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? SOURCE_MAX_BYTES
  const maxRedirects = options.maxRedirects ?? SOURCE_MAX_REDIRECTS
  let current = validateSourceUrl(rawUrl)

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await assertPublicHost(current, options.lookup)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'CasterFlyNewsBot/1.0 (+https://casterfly.com)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
        },
      })
    } catch (err) {
      if (controller.signal.aborted) {
        throw new SourceError('source_timeout', 'La fuente tardó demasiado en responder.')
      }
      throw new SourceError('source_unreachable', 'No se pudo conectar con la fuente.')
    } finally {
      clearTimeout(timer)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new SourceError('invalid_redirect', 'La fuente devolvió una redirección inválida.')
      if (redirect === maxRedirects) {
        throw new SourceError('too_many_redirects', 'La fuente redirige demasiadas veces.')
      }
      current = validateSourceUrl(new URL(location, current).toString())
      continue
    }

    if (!response.ok) {
      throw new SourceError('source_http_error', `La fuente respondió ${response.status}.`)
    }

    const length = Number(response.headers.get('content-length') || 0)
    if (length > maxBytes) {
      throw new SourceError('source_too_large', 'La fuente supera el tamaño permitido.')
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > maxBytes) {
      throw new SourceError('source_too_large', 'La fuente supera el tamaño permitido.')
    }
    return {
      url: current,
      text: buffer.toString('utf8'),
      contentType: response.headers.get('content-type') || '',
    }
  }

  throw new SourceError('too_many_redirects', 'La fuente redirige demasiadas veces.')
}
