import { describe, expect, it } from 'vitest'
import { parseFeed } from './news-capsules/feed'
import { extractArticle } from './news-capsules/article'
import { isDuplicateSource } from './news-capsules/dedupe'

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Diario</title><item><title>Noticia uno</title><link>https://example.com/1</link><guid>g1</guid><pubDate>Mon, 09 Nov 2026 12:00:00 GMT</pubDate><description>Bajada de la noticia uno.</description></item><item><title>Noticia dos</title><link>/2</link><description>Otra bajada.</description></item></channel></rss>`
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Feed Atom</title><entry><title>Atom uno</title><id>a1</id><updated>2026-11-09T12:00:00Z</updated><link rel="alternate" href="https://example.com/a1"/><summary>Resumen atom.</summary></entry></feed>`

const ARTICLE = `<!doctype html><html><head><title>Noticia</title><meta property="og:title" content="Título de la noticia"><meta property="og:site_name" content="Medio"><meta property="article:published_time" content="2026-11-09T12:00:00Z"></head><body><article><h1>Título de la noticia</h1><p>Este es el primer párrafo de la noticia con suficiente contenido para ser considerado útil y explicar qué ocurrió, quiénes participaron y por qué es relevante para la audiencia.</p><p>Este es el segundo párrafo de la noticia con más información relevante para el resumen, incluyendo antecedentes y una cita breve del medio de origen.</p></article></body></html>`

describe('feed and article', () => {
  it('parsea RSS y resuelve enlaces relativos', () => {
    const feed = parseFeed(RSS, 'https://example.com/rss')
    expect(feed.publisher).toBe('Diario')
    expect(feed.items).toHaveLength(2)
    expect(feed.items[1].url).toBe('https://example.com/2')
    expect(feed.items[0].publishedAt).toContain('2026-11-09')
  })

  it('parsea Atom', () => {
    const feed = parseFeed(ATOM, 'https://example.com/feed')
    expect(feed.publisher).toBe('Feed Atom')
    expect(feed.items[0].title).toBe('Atom uno')
    expect(feed.items[0].url).toBe('https://example.com/a1')
  })

  it('falla con feed vacío', () => {
    expect(() => parseFeed('<rss><channel></channel></rss>', 'https://example.com')).toThrow()
  })

  it('extrae un artículo', () => {
    const article = extractArticle(ARTICLE, 'https://example.com/nota')
    expect(article.title).toBe('Título de la noticia')
    expect(article.publisher).toBe('Medio')
    expect(article.text).toContain('primer párrafo')
  })

  it('falla con HTML sin contenido útil', () => {
    expect(() => extractArticle('<html><body><p>corto</p></body></html>', 'https://example.com')).toThrow()
  })
})

describe('dedupe', () => {
  it('detecta URL, GUID o título repetido', () => {
    expect(isDuplicateSource({ url: 'https://example.com/1' }, [{ url: 'https://example.com/1' }])).toBe(true)
    expect(isDuplicateSource({ guid: 'g1' }, [{ guid: 'g1' }])).toBe(true)
    expect(isDuplicateSource({ title: 'Noticia Uno' }, [{ title: 'noticia uno' }])).toBe(true)
    expect(isDuplicateSource({ title: 'Otra' }, [{ title: 'Distinta' }])).toBe(false)
  })
})
