import { describe, expect, it, vi } from 'vitest'
import {
  SourceError,
  fetchPublicSource,
  isPrivateIp,
  validateSourceUrl,
} from './news-capsules/source-security'

const publicLookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]) as any

describe('source security', () => {
  it('acepta HTTP/HTTPS públicos', () => {
    expect(validateSourceUrl('https://example.com/noticia').hostname).toBe('example.com')
    expect(validateSourceUrl('http://example.com/rss').protocol).toBe('http:')
  })

  it('rechaza protocolos, credenciales y destinos privados', () => {
    expect(() => validateSourceUrl('ftp://example.com')).toThrow(SourceError)
    expect(() => validateSourceUrl('https://user:pass@example.com')).toThrow(SourceError)
    expect(() => validateSourceUrl('http://127.0.0.1/x')).toThrow(SourceError)
    expect(() => validateSourceUrl('http://localhost/x')).toThrow(SourceError)
    expect(isPrivateIp('10.0.0.1')).toBe(true)
    expect(isPrivateIp('192.168.1.1')).toBe(true)
    expect(isPrivateIp('8.8.8.8')).toBe(false)
  })

  it('bloquea un DNS que resuelve a una IP privada', async () => {
    await expect(
      fetchPublicSource('https://example.com', {
        lookup: (async () => [{ address: '10.1.2.3', family: 4 }]) as any,
        fetchImpl: async () => new Response('ok'),
      })
    ).rejects.toBeInstanceOf(SourceError)
  })

  it('limita el tiempo de respuesta', async () => {
    await expect(
      fetchPublicSource('https://example.com', {
        lookup: publicLookup,
        timeoutMs: 10,
        fetchImpl: (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      })
    ).rejects.toMatchObject({ code: 'source_timeout' })
  })

  it('descarga una fuente pública', async () => {
    const result = await fetchPublicSource('https://example.com/feed', {
      lookup: publicLookup,
      fetchImpl: async () => new Response('<rss></rss>', { status: 200, headers: { 'content-type': 'application/rss+xml' } }),
    })
    expect(result.text).toContain('<rss>')
  })
})
